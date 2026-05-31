'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[60] bg-warning text-page text-center text-sm font-medium py-1.5 px-4"
    >
      オフライン：変更は接続が戻ったときに保存されます
    </div>
  );
}
