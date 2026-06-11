'use client';

import { useSyncExternalStore } from 'react';
import { subscribeSyncError, getSyncError, getSaveError, type SyncErrorType } from '@/lib/syncStatus';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

// SSR/ビルド時はエラーなし扱い（バナー非表示）にする
function getServerSnapshot(): SyncErrorType | null {
  return null;
}

// 購読エラー（同期できていない＝表示が古いかもしれない）のメッセージ
const SYNC_MESSAGES: Record<SyncErrorType, string> = {
  'permission-denied': 'データへのアクセス権限がありません。再ログインをお試しください',
  unavailable: 'データを同期できていません。表示中の内容は最新でない可能性があります',
  unknown: 'データを同期できていません。表示中の内容は最新でない可能性があります',
};

// 保存エラー（直前の変更が保存されていない）のメッセージ（issue #497）
const SAVE_MESSAGES: Record<SyncErrorType, string> = {
  'permission-denied': 'データを保存できませんでした。アクセス権限がありません。再ログインをお試しください',
  unavailable: 'データを保存できませんでした。直前の変更は反映されていません。もう一度お試しください',
  unknown: 'データを保存できませんでした。直前の変更は反映されていません。もう一度お試しください',
};

export function SyncErrorBanner() {
  const syncError = useSyncExternalStore(subscribeSyncError, getSyncError, getServerSnapshot);
  const saveError = useSyncExternalStore(subscribeSyncError, getSaveError, getServerSnapshot);
  const isOnline = useOnlineStatus();

  // オフライン時は OfflineBanner が表示されるため二重に警告しない
  if ((!syncError && !saveError) || !isOnline) {
    return null;
  }

  // 保存エラー（データ未保存）の方が深刻なため優先して表示する
  const message = saveError ? SAVE_MESSAGES[saveError] : SYNC_MESSAGES[syncError!];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-40 pointer-events-none bg-danger text-white text-center text-sm font-medium py-1.5 px-4"
    >
      {message}
    </div>
  );
}
