// iOS PWA復帰後のFirestoreゾンビ接続対策
//
// iOS（WebKit）はPWAをバックグラウンドで凍結し、ネットワーク接続を切断する。
// 復帰後もFirestore SDKが切断に気付かず「オンラインのつもり」でリクエストを
// 積み続けると、getDoc等のPromiseがエラーにもならず永遠に未解決のままになる
// （無限「読み込み中」の根本原因）。
// disableNetwork → enableNetwork で接続を強制的に作り直して回復させる。

import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { reportSyncError, toSyncErrorType } from '@/lib/syncStatus';

let isReconnecting = false;

export async function reconnectFirestoreNetwork(): Promise<void> {
  if (isReconnecting) {
    return;
  }
  isReconnecting = true;

  try {
    try {
      await disableNetwork(db);
    } catch (error) {
      // 切断に失敗しても、接続の復元（enableNetwork）は必ず試みる
      console.error('Firestore disableNetwork failed:', error);
    }

    try {
      await enableNetwork(db);
    } catch (error) {
      console.error('Firestore enableNetwork failed:', error);
      // 接続を復元できない＝以降の同期が動かないため、ユーザーへ通知する
      reportSyncError(toSyncErrorType(error as { code?: string }));
    }
  } finally {
    isReconnecting = false;
  }
}
