// assignment の購読・保存エラーをユーザー通知（lib/syncStatus）につなぐ基盤（issue #543）
// 手本は lib/firestore/userData/。assignment は小さな保存が多いので write-queue 級は過剰（YAGNI）。
// 薄いラッパー 2 つに留める。後続 #544〜#546 の各関数がこれを使う。
import {
  reportSyncError,
  clearSyncError,
  reportSaveError,
  clearSaveError,
  toSyncErrorType,
} from '@/lib/syncStatus';

// onSnapshot はエラーで購読が恒久停止するため、指数バックオフで再購読する（subscribeUserData と同方針）
const RESUBSCRIBE_BASE_DELAY_MS = 1000;
const RESUBSCRIBE_MAX_DELAY_MS = 30_000;

/**
 * onSnapshot 購読を、同期エラー通知＋指数バックオフ再購読で包む。
 *
 * 実際の onSnapshot 呼び出しは `attach` を通じて呼び出し側が行う。
 * doc 購読と query 購読でスナップショット型が異なるため、型 S は呼び出し側が決める。
 *
 * @param attach 成功ハンドラ・エラーハンドラを受け取り onSnapshot を張って unsubscribe を返す関数
 * @param onData 成功スナップショットの処理
 * @returns 購読解除関数
 */
export function createSyncedSubscription<S>(
  attach: (onNext: (snapshot: S) => void, onError: (error: { code?: string }) => void) => () => void,
  onData: (snapshot: S) => void
): () => void {
  let stopped = false;
  let retryCount = 0;
  let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let unsubscribeSnapshot: () => void = () => {};

  const start = () => {
    unsubscribeSnapshot = attach(
      (snapshot) => {
        retryCount = 0;
        clearSyncError();
        onData(snapshot);
      },
      (error) => {
        console.error('Error in assignment Firestore subscription:', error);
        // エラー時は onData を呼ばない（既存データを保持）。同期できていないことを UI へ通知する
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

/**
 * 保存処理を包み、失敗をユーザー通知（保存バナー）につなげてから再 throw する。
 * 成功時は保存エラーを解除する（write-queue と同じ単一チャンネルの挙動）。
 *
 * @param operation Firestore への書き込み処理
 * @returns operation の戻り値
 */
export async function runWriteWithSync<T>(operation: () => Promise<T>): Promise<T> {
  try {
    const result = await operation();
    clearSaveError();
    return result;
  } catch (error) {
    console.error('Failed to save assignment data to Firestore:', error);
    reportSaveError(toSyncErrorType(error as { code?: string }));
    throw error;
  }
}
