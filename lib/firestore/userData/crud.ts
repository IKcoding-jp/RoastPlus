// ユーザーデータのCRUD操作

import { setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { getUserDocRef, removeUndefinedFields, normalizeAppData, defaultData } from '../common';
import { isE2EMode, loadE2EAppData, saveE2EAppData } from '@/lib/e2eMode';
import type { AppData } from '@/types';
import {
  getDataSplitsDocRef,
  getWorkProgressesCollectionRef,
  isWorkProgressesMigrated,
  loadWorkProgressSplitState,
  normalizeWorkProgressQuerySnapshot,
  resolveWorkProgresses,
} from '../workProgress/subcollection';
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
      const normalizedData = normalizeAppData(data);
      let splitState;

      try {
        splitState = await loadWorkProgressSplitState(userId);
      } catch (error) {
        console.warn('Failed to load split workProgresses. Falling back to root workProgresses:', error);
        return normalizedData;
      }

      return {
        ...normalizedData,
        workProgresses: resolveWorkProgresses(
          normalizedData.workProgresses,
          splitState.workProgresses,
          splitState.isMigrated
        ),
      };
    }

    // ドキュメントが存在しない場合はデフォルトデータを作成
    const cleanedDefaultData = removeUndefinedFields(defaultData) as unknown as Record<string, unknown>;
    delete cleanedDefaultData.workProgresses;
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

  // 最新のデータをキューに保存
  queue.pendingData = data;
  queue.pendingOptions = {
    syncWorkProgresses: queue.pendingOptions?.syncWorkProgresses === true || options.syncWorkProgresses === true,
  };

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

export function subscribeUserData(userId: string, callback: (data: AppData) => void): () => void {
  if (isE2EMode()) {
    queueMicrotask(() => callback(loadE2EAppData(defaultData)));
    return () => {};
  }

  const userDocRef = getUserDocRef(userId);
  const workProgressesCollectionRef = getWorkProgressesCollectionRef(userId);
  const dataSplitsDocRef = getDataSplitsDocRef(userId);

  let rootData: AppData = defaultData;
  let splitWorkProgresses = defaultData.workProgresses;
  let isWorkProgressesSplitMigrated = false;
  let hasRootSnapshot = false;
  let hasWorkProgressesSnapshot = false;
  let hasDataSplitsSnapshot = false;

  const emitMergedData = () => {
    if (!hasRootSnapshot || !hasWorkProgressesSnapshot || !hasDataSplitsSnapshot) {
      return;
    }

    callback({
      ...rootData,
      workProgresses: resolveWorkProgresses(
        rootData.workProgresses,
        splitWorkProgresses,
        isWorkProgressesSplitMigrated
      ),
    });
  };

  const unsubscribeRoot = onSnapshot(
    userDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        rootData = normalizeAppData(data);
      } else {
        rootData = defaultData;
      }
      hasRootSnapshot = true;
      emitMergedData();
    },
    (error) => {
      console.error('Error in Firestore subscription:', error);
      // エラー時はcallbackを呼ばない（既存データを保持する）
    }
  );

  const unsubscribeWorkProgresses = onSnapshot(
    workProgressesCollectionRef,
    (snapshot) => {
      splitWorkProgresses = normalizeWorkProgressQuerySnapshot(snapshot);
      hasWorkProgressesSnapshot = true;
      emitMergedData();
    },
    (error) => {
      console.error('Error in workProgresses subscription:', error);
      splitWorkProgresses = [];
      hasWorkProgressesSnapshot = true;
      emitMergedData();
    }
  );

  const unsubscribeDataSplits = onSnapshot(
    dataSplitsDocRef,
    (snapshot) => {
      isWorkProgressesSplitMigrated = snapshot.exists() && isWorkProgressesMigrated(snapshot.data());
      hasDataSplitsSnapshot = true;
      emitMergedData();
    },
    (error) => {
      console.error('Error in dataSplits subscription:', error);
      isWorkProgressesSplitMigrated = false;
      hasDataSplitsSnapshot = true;
      emitMergedData();
    }
  );

  return () => {
    unsubscribeRoot();
    unsubscribeWorkProgresses();
    unsubscribeDataSplits();
  };
}
