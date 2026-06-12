// iOS PWA復帰時にFirestore接続を張り直すフック
//
// 発火条件:
// - バックグラウンドに RECONNECT_HIDDEN_THRESHOLD_MS 以上いた後の復帰
//   （iOSが接続を切断するのは長めのバックグラウンド時のため、
// 　 短いタブ切替で健全な接続を壊さないようしきい値を設ける）
// - pageshow の persisted=true（bfcacheからの復元。凍結前の古いJS状態のため常に張り直す）

import { useEffect } from 'react';
import { reconnectFirestoreNetwork } from '@/lib/firestore/reconnect';
import { isE2EMode } from '@/lib/e2eMode';

export const RECONNECT_HIDDEN_THRESHOLD_MS = 30_000;

export function useReconnectOnResume(): void {
  useEffect(() => {
    if (isE2EMode()) {
      return;
    }

    let hiddenAt: number | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }

      const wasHiddenLongEnough = hiddenAt !== null && Date.now() - hiddenAt >= RECONNECT_HIDDEN_THRESHOLD_MS;
      hiddenAt = null;

      if (wasHiddenLongEnough) {
        void reconnectFirestoreNetwork();
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void reconnectFirestoreNetwork();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);
}
