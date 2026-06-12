'use client';

import { useReconnectOnResume } from '@/hooks/useReconnectOnResume';

// iOS PWAのバックグラウンド復帰時にFirestore接続を張り直す（無限「読み込み中」対策）。
// ロジックは useReconnectOnResume に集約し、ここはServer Componentのlayoutへ
// 組み込むためのクライアント境界のみを担う。
export function FirestoreResumeHandler() {
  useReconnectOnResume();
  return null;
}
