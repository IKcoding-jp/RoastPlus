// Firestore購読エラーの同期状態ストア（issue #496）
// React非依存のミニストア。useSyncExternalStore から購読して
// 「データを同期できていません」バナーの表示制御に使う。

export type SyncErrorType = 'permission-denied' | 'unavailable' | 'unknown';

let currentError: SyncErrorType | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
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

export function subscribeSyncError(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
