// ユーザーデータのCRUD操作

import { setDoc, getDoc, getDocFromCache, onSnapshot, type DocumentSnapshot } from 'firebase/firestore';
import { getUserDocRef, removeUndefinedFields, normalizeAppData, defaultData } from '../common';
import { isE2EMode, loadE2EAppData, saveE2EAppData } from '@/lib/e2eMode';
import { reportSyncError, clearSyncError, toSyncErrorType } from '@/lib/syncStatus';
import type { AppData } from '@/types';
import { writeQueues, SAVE_USER_DATA_DEBOUNCE_MS, executeWrite, type SaveUserDataOptions } from './write-queue';

// iOS PWAのバックグラウンド復帰後、SDKが切断に気付かない「ゾンビ接続」状態だと
// getDoc（サーバー優先）はエラーにもならず永遠に未解決になる。
// タイムアウトしたら端末内キャッシュ（IndexedDB永続化）へフォールバックして、
// 無限「読み込み中」を防ぐ。
export const GET_USER_DATA_TIMEOUT_MS = 8000;

const SERVER_TIMEOUT = Symbol('server-timeout');

async function getDocWithCacheFallback(userDocRef: ReturnType<typeof getUserDocRef>): Promise<DocumentSnapshot> {
  const serverPromise = getDoc(userDocRef);

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<typeof SERVER_TIMEOUT>((resolve) => {
    timeoutId = setTimeout(() => resolve(SERVER_TIMEOUT), GET_USER_DATA_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([serverPromise, timeoutPromise]);
    if (result !== SERVER_TIMEOUT) {
      return result;
    }
  } finally {
    clearTimeout(timeoutId);
  }

  // タイムアウト後にサーバー応答が拒否されても未処理Promise rejectionにしない
  // （握りつぶさずログに残し、ゾンビ接続調査時に本当の失敗原因を追えるようにする）
  serverPromise.catch((error) => {
    console.warn('Firestore getDoc rejected after timeout:', error);
  });

  console.warn(`Firestore getDoc timed out after ${GET_USER_DATA_TIMEOUT_MS}ms, falling back to cache`);
  try {
    return await getDocFromCache(userDocRef);
  } catch {
    // キャッシュ未保持。元の異常（サーバー無応答）をエラーとして伝える
    throw new Error(`Firestore getDoc timed out after ${GET_USER_DATA_TIMEOUT_MS}ms and no cached document exists`);
  }
}

export async function getUserData(userId: string): Promise<AppData> {
  if (isE2EMode()) {
    return loadE2EAppData(defaultData);
  }

  try {
    const userDocRef = getUserDocRef(userId);
    const userDoc = await getDocWithCacheFallback(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      return normalizeAppData(data);
    }

    // ドキュメントが存在しない場合はデフォルトデータを作成
    const cleanedDefaultData = removeUndefinedFields(defaultData) as Record<string, unknown>;
    await setDoc(userDocRef, cleanedDefaultData);
    return defaultData;
  } catch (error) {
    console.error('Failed to load data from Firestore:', error);
    throw error;
  }
}

export async function saveUserData(userId: string, data: AppData, options: SaveUserDataOptions = {}): Promise<void> {
  if (isE2EMode()) {
    saveE2EAppData(data);
    return;
  }

  // キューが存在しない場合は初期化
  if (!writeQueues.has(userId)) {
    writeQueues.set(userId, {
      pendingData: null,
      pendingOptions: null,
      timeoutId: null,
      isWriting: false,
      retryCount: 0,
      pendingPromise: null,
    });
  }

  const queue = writeQueues.get(userId)!;

  // 新しいPromiseを作成
  const promise = new Promise<void>((resolve, reject) => {
    if (queue.pendingPromise) {
      queue.pendingPromise.resolve();
    }
    queue.pendingPromise = { resolve, reject };
  });
  queue.currentSavePromise = promise;

  // 最新のデータをキューに保存
  queue.pendingData = data;
  queue.pendingOptions = mergeSaveUserDataOptions(queue.pendingOptions, options);

  // 書き込み中の場合は待機してから書き込み
  if (queue.isWriting) {
    return promise;
  }

  // 既存のタイマーをキャンセル
  if (queue.timeoutId) {
    clearTimeout(queue.timeoutId);
    queue.timeoutId = null;
  }

  // デバウンスタイマーを設定
  queue.timeoutId = setTimeout(async () => {
    if (queue.pendingData) {
      const dataToWrite = queue.pendingData;
      const optionsToWrite = queue.pendingOptions ?? {};
      queue.pendingData = null;
      queue.pendingOptions = null;
      queue.timeoutId = null;
      try {
        await executeWrite(userId, dataToWrite, optionsToWrite);
      } catch {
        // 失敗は saveUserData が返す promise の reject と、write-queue 内の
        // reportSaveError によるユーザー通知（issue #497）で伝達済み。
        // ここで catch しないと未処理 Promise rejection になる
      }
    }
  }, SAVE_USER_DATA_DEBOUNCE_MS);

  return promise;
}

function mergeSaveUserDataOptions(
  previousOptions: SaveUserDataOptions | null,
  nextOptions: SaveUserDataOptions
): SaveUserDataOptions {
  const previousFields = previousOptions?.updatedFields;
  const nextFields = nextOptions.updatedFields;

  if (!previousOptions) {
    return {
      updatedFields: nextFields,
    };
  }

  if (!previousFields || !nextFields) {
    return {};
  }

  return {
    updatedFields: Array.from(new Set([...previousFields, ...nextFields])),
  };
}

// onSnapshot はエラーで購読が恒久停止するため、指数バックオフで再購読する
const RESUBSCRIBE_BASE_DELAY_MS = 1000;
const RESUBSCRIBE_MAX_DELAY_MS = 30_000;

export function subscribeUserData(userId: string, callback: (data: AppData) => void): () => void {
  if (isE2EMode()) {
    queueMicrotask(() => callback(loadE2EAppData(defaultData)));
    return () => {};
  }

  const userDocRef = getUserDocRef(userId);

  let stopped = false;
  let retryCount = 0;
  let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let unsubscribeSnapshot: () => void = () => {};

  const start = () => {
    unsubscribeSnapshot = onSnapshot(
      userDocRef,
      (snapshot) => {
        retryCount = 0;
        clearSyncError();
        if (snapshot.exists()) {
          callback(normalizeAppData(snapshot.data()));
        } else {
          callback(defaultData);
        }
      },
      (error) => {
        console.error('Error in Firestore subscription:', error);
        // エラー時はcallbackを呼ばない（既存データを保持する）
        // ただし「同期できていない」ことをUIへ通知する（issue #496）
        reportSyncError(toSyncErrorType(error));

        // 同一世代でエラーが連続した場合は前のタイマーを破棄し、二重再購読を防ぐ
        if (retryTimeoutId) {
          clearTimeout(retryTimeoutId);
        }
        const delay = Math.min(RESUBSCRIBE_MAX_DELAY_MS, RESUBSCRIBE_BASE_DELAY_MS * 2 ** retryCount);
        retryCount += 1;
        retryTimeoutId = setTimeout(() => {
          retryTimeoutId = null;
          if (!stopped) {
            start();
          }
        }, delay);
      }
    );
  };

  start();

  return () => {
    stopped = true;
    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
    }
    unsubscribeSnapshot();
    // 購読が無くなった後にバナーが残り続けないようにする（ログアウト時など）
    clearSyncError();
  };
}
