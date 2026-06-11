'use client';

import { useSyncExternalStore } from 'react';
import { subscribeSyncError, getSyncError, type SyncErrorType } from '@/lib/syncStatus';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

// SSR/ビルド時はエラーなし扱い（バナー非表示）にする
function getServerSnapshot(): SyncErrorType | null {
  return null;
}

const MESSAGES: Record<SyncErrorType, string> = {
  'permission-denied': 'データへのアクセス権限がありません。再ログインをお試しください',
  unavailable: 'データを同期できていません。表示中の内容は最新でない可能性があります',
  unknown: 'データを同期できていません。表示中の内容は最新でない可能性があります',
};

export function SyncErrorBanner() {
  const syncError = useSyncExternalStore(subscribeSyncError, getSyncError, getServerSnapshot);
  const isOnline = useOnlineStatus();

  // オフライン時は OfflineBanner が表示されるため二重に警告しない
  if (!syncError || !isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-40 pointer-events-none bg-danger text-white text-center text-sm font-medium py-1.5 px-4"
    >
      {MESSAGES[syncError]}
    </div>
  );
}
