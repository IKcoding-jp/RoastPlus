// Firestore購読エラー（issue #496）・保存エラー（issue #497）の同期状態ストア
// React非依存のミニストア。useSyncExternalStore から購読して
// 「同期できていません」「保存できませんでした」バナーの表示制御に使う。

export type SyncErrorType = 'permission-denied' | 'unavailable' | 'unknown';

// 購読エラー（onSnapshot 失敗）と保存エラー（write-queue 最終失敗）は
// 原因も回復タイミングも異なるため、独立したチャンネルで管理する
let currentError: SyncErrorType | null = null;
let currentSaveError: SyncErrorType | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

// Firestore のエラーコードをバナー表示用の種別に分類する（購読・保存で共用）
export function toSyncErrorType(error: { code?: string }): SyncErrorType {
  if (error.code === 'permission-denied') {
    return 'permission-denied';
  }
  if (error.code === 'unavailable') {
    return 'unavailable';
  }
  return 'unknown';
}

export function getSyncError(): SyncErrorType | null {
  return currentError;
}

export function reportSyncError(type: SyncErrorType): void {
  if (currentError === type) {
    return;
  }
  currentError = type;
  notify();
}

export function clearSyncError(): void {
  if (currentError === null) {
    return;
  }
  currentError = null;
  notify();
}

export function getSaveError(): SyncErrorType | null {
  return currentSaveError;
}

export function reportSaveError(type: SyncErrorType): void {
  if (currentSaveError === type) {
    return;
  }
  currentSaveError = type;
  notify();
}

export function clearSaveError(): void {
  if (currentSaveError === null) {
    return;
  }
  currentSaveError = null;
  notify();
}

export function subscribeSyncError(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
