// ユーザーデータ書き込みキュー・リトライ管理
// Write stream exhausted対策として同時書き込み数を制限する

import { deleteField, writeBatch, type FieldValue, type WriteBatch } from 'firebase/firestore';
import { getDb, getUserDocRef, removeUndefinedFields } from '../common';
import type { AppData } from '@/types';

// デバウンス待機時間（ミリ秒）
export const SAVE_USER_DATA_DEBOUNCE_MS = 300;

// ユーザーごとの書き込みキューとリトライ管理
export const writeQueues = new Map<
  string,
  {
    pendingData: AppData | null;
    pendingOptions: SaveUserDataOptions | null;
    timeoutId: ReturnType<typeof setTimeout> | null;
    isWriting: boolean;
    retryCount: number;
    pendingPromise: { resolve: () => void; reject: (error: unknown) => void } | null;
    currentSavePromise?: Promise<void>;
  }
>();

export function clearWriteQueueStateForTests(): void {
  writeQueues.clear();
}

/**
 * デバウンス待機中のユーザーデータ書き込みを即座に実行して完了を待つ。
 * ログアウト時など、保留中の編集を確実にサーバーへ送ってから後処理する用途。
 */
export async function flushPendingUserDataWrites(userId: string): Promise<void> {
  const queue = writeQueues.get(userId);
  if (!queue) return;

  // 1) デバウンス待機中の書き込みを即時実行する
  if (queue.timeoutId) {
    clearTimeout(queue.timeoutId);
    queue.timeoutId = null;
    if (queue.pendingData) {
      const data = queue.pendingData;
      const options = queue.pendingOptions ?? {};
      queue.pendingData = null;
      queue.pendingOptions = null;
      try {
        await executeWrite(userId, data, options);
      } catch {
        // 失敗は呼び出し側の saveUserData promise 側で処理される
      }
    }
  }

  // 2) 既に実行中(in-flight)の書き込みがあれば、その完了も待つ
  if (queue.currentSavePromise) {
    try {
      await queue.currentSavePromise;
    } catch {
      // 同上(失敗はログアウト処理を止めない)
    }
  }
}

export interface SaveUserDataOptions {
  updatedFields?: (keyof AppData)[];
}

// 最大リトライ回数
const MAX_RETRY_COUNT = 3;
// リトライ待機時間（ミリ秒）
const RETRY_DELAY = 1000;

// ===== Write stream exhausted対策 =====
const MAX_CONCURRENT_WRITES = 1;
let activeWriteCount = 0;
const writeWaitQueue: Array<() => void> = [];

// 書き込みキューの最大サイズ制限
const MAX_QUEUE_SIZE = 20;

// 書き込み間隔の最小時間（ミリ秒）
const MIN_WRITE_INTERVAL = 200;
let lastWriteTime = 0;

const MAX_BATCH_OPERATIONS = 450;

/**
 * 書き込みスロットを取得する。利用可能なスロットがない場合は待機キューに追加する。
 */
async function acquireWriteSlot(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (activeWriteCount < MAX_CONCURRENT_WRITES) {
      activeWriteCount++;
      resolve();
    } else {
      writeWaitQueue.push(() => {
        activeWriteCount++;
        resolve();
      });
    }
  });
}

/**
 * 書き込み完了後にスロットを解放する
 */
function releaseWriteSlot(): void {
  activeWriteCount--;
  if (writeWaitQueue.length > 0 && activeWriteCount < MAX_CONCURRENT_WRITES) {
    const next = writeWaitQueue.shift();
    if (next) {
      next();
    }
  }
}

function pickUpdatedFields(
  data: Record<string, unknown>,
  updatedFields: (keyof AppData)[] | undefined
): Record<string, unknown> {
  if (!updatedFields) {
    return data;
  }

  const pickedData: Record<string, unknown> = {};
  updatedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      pickedData[field] = data[field];
    }
  });
  return pickedData;
}

function hasWritableFields(data: Record<string, unknown>): boolean {
  return Object.keys(data).length > 0;
}

function createBatchWriter(): {
  add: (operation: (batch: WriteBatch) => void) => void;
  commit: () => Promise<void>;
} {
  const batches: WriteBatch[] = [writeBatch(getDb())];
  let operationCount = 0;

  return {
    add: (operation) => {
      if (operationCount >= MAX_BATCH_OPERATIONS) {
        batches.push(writeBatch(getDb()));
        operationCount = 0;
      }
      operation(batches[batches.length - 1]);
      operationCount += 1;
    },
    commit: async () => {
      for (const batch of batches) {
        await batch.commit();
      }
    },
  };
}

// 実際の書き込み処理を行う関数
async function performWrite(userId: string, data: AppData, options: SaveUserDataOptions): Promise<void> {
  await acquireWriteSlot();

  try {
    const now = Date.now();
    const timeSinceLastWrite = now - lastWriteTime;
    if (timeSinceLastWrite < MIN_WRITE_INTERVAL) {
      await new Promise((resolve) => setTimeout(resolve, MIN_WRITE_INTERVAL - timeSinceLastWrite));
    }
    lastWriteTime = Date.now();

    const userDocRef = getUserDocRef(userId);
    const cleanedData: Record<string, unknown> = removeUndefinedFields<AppData>(data) as unknown as Record<
      string,
      unknown
    >;

    const setOrDelete = <T>(value: T | undefined): T | FieldValue => {
      return value !== undefined ? value : deleteField();
    };

    if (data.userSettings) {
      const userSettingsUpdate: Record<string, unknown> = {
        selectedMemberId: setOrDelete(data.userSettings.selectedMemberId),
        selectedManagerId: setOrDelete(data.userSettings.selectedManagerId),
        taskLabelHeaderTextLeft: setOrDelete(data.userSettings.taskLabelHeaderTextLeft),
        taskLabelHeaderTextRight: setOrDelete(data.userSettings.taskLabelHeaderTextRight),
      };

      const hasAnyValue = Object.values(userSettingsUpdate).some((value) => value !== deleteField());

      if (!hasAnyValue) {
        cleanedData.userSettings = deleteField();
      } else {
        cleanedData.userSettings = userSettingsUpdate;
      }
    } else if (data.userSettings === undefined) {
      cleanedData.userSettings = deleteField();
    }

    if (data.shuffleEvent === undefined) {
      cleanedData.shuffleEvent = deleteField();
    }

    const batchWriter = createBatchWriter();
    const rootWriteData = pickUpdatedFields(cleanedData, options.updatedFields);
    if (hasWritableFields(rootWriteData)) {
      batchWriter.add((batch) => batch.set(userDocRef, rootWriteData, { merge: true }));
    }
    await batchWriter.commit();
  } finally {
    releaseWriteSlot();
  }
}

// 書き込みキューを実行し、リトライ処理を行う
export async function executeWrite(
  userId: string,
  data: AppData,
  options: SaveUserDataOptions = {},
  hasWaitedForQueue = false
): Promise<void> {
  const queue = writeQueues.get(userId);
  if (!queue) {
    throw new Error('Write queue not found');
  }

  const totalQueuedWrites = writeWaitQueue.length + activeWriteCount;
  if (totalQueuedWrites >= MAX_QUEUE_SIZE) {
    console.warn(`Firestore write queue size (${totalQueuedWrites}) exceeds limit (${MAX_QUEUE_SIZE}), waiting...`);
    if (!hasWaitedForQueue) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * 2));
      const refreshedQueuedWrites = writeWaitQueue.length + activeWriteCount;
      if (refreshedQueuedWrites >= MAX_QUEUE_SIZE) {
        console.warn(
          `Firestore write queue still saturated (${refreshedQueuedWrites}/${MAX_QUEUE_SIZE}) after extended wait, retrying once...`
        );
        await executeWrite(userId, data, options, true);
        return;
      }
    } else {
      console.warn(
        `Firestore write queue remains saturated (${writeWaitQueue.length + activeWriteCount}/${MAX_QUEUE_SIZE}) after extended wait; proceeding to avoid infinite recursion.`
      );
    }
  }

  queue.isWriting = true;
  queue.retryCount = 0;
  const currentPromise = queue.pendingPromise;

  while (queue.retryCount <= MAX_RETRY_COUNT) {
    try {
      await performWrite(userId, data, options);
      queue.isWriting = false;
      queue.retryCount = 0;

      if (currentPromise) {
        currentPromise.resolve();
      }

      if (queue.pendingData) {
        const nextData = queue.pendingData;
        const nextOptions = queue.pendingOptions ?? {};
        queue.pendingData = null;
        queue.pendingOptions = null;
        await executeWrite(userId, nextData, nextOptions);
      } else {
        queue.pendingData = null;
        queue.pendingOptions = null;
        queue.pendingPromise = null;
      }

      return;
    } catch (error: unknown) {
      queue.retryCount++;

      const errorInfo = error as { code?: string; message?: string };
      const isWriteStreamExhausted =
        errorInfo?.code === 'resource-exhausted' ||
        (errorInfo?.message &&
          typeof errorInfo.message === 'string' &&
          errorInfo.message.toLowerCase().includes('write stream exhausted'));

      if (isWriteStreamExhausted && queue.retryCount <= MAX_RETRY_COUNT) {
        const baseDelay = RETRY_DELAY * Math.pow(2, queue.retryCount - 1);
        const additionalDelay = writeWaitQueue.length * 300;
        const delay = Math.min(baseDelay + additionalDelay, 10000);

        console.warn(
          `Firestore write stream exhausted, retrying in ${delay}ms ` +
            `(attempt ${queue.retryCount}/${MAX_RETRY_COUNT}, ` +
            `queued: ${writeWaitQueue.length}, active: ${activeWriteCount})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      queue.isWriting = false;
      console.error('Failed to save data to Firestore:', error);

      if (currentPromise) {
        currentPromise.reject(error);
      }
      queue.pendingPromise = null;
      throw error;
    }
  }
}
