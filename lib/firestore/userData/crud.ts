// ユーザーデータのCRUD操作

import { setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { getUserDocRef, removeUndefinedFields, normalizeAppData, defaultData } from '../common';
import { isE2EMode, loadE2EAppData, saveE2EAppData } from '@/lib/e2eMode';
import { reportSyncError, clearSyncError, type SyncErrorType } from '@/lib/syncStatus';
import type { AppData } from '@/types';
import { writeQueues, SAVE_USER_DATA_DEBOUNCE_MS, executeWrite, type SaveUserDataOptions } from './write-queue';

export async function getUserData(userId: string): Promise<AppData> {
  if (isE2EMode()) {
    return loadE2EAppData(defaultData);
  }

  try {
    const userDocRef = getUserDocRef(userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      return normalizeAppData(data);
    }

    // ドキュメントが存在しない場合はデフォルトデータを作成
    const cleanedDefaultData = removeUndefinedFields(defaultData) as unknown as Record<string, unknown>;
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
      await executeWrite(userId, dataToWrite, optionsToWrite);
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

function toSyncErrorType(error: { code?: string }): SyncErrorType {
  if (error.code === 'permission-denied') {
    return 'permission-denied';
  }
  if (error.code === 'unavailable') {
    return 'unavailable';
  }
  return 'unknown';
}

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
