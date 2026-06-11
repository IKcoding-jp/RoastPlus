// Firestore購読エラー通知バナーのテスト（issue #496）

import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncErrorBanner } from './SyncErrorBanner';
import { reportSyncError, clearSyncError } from '@/lib/syncStatus';

const onlineStatusMock = vi.hoisted(() => ({
  isOnline: true,
}));

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => onlineStatusMock.isOnline,
}));

describe('SyncErrorBanner', () => {
  beforeEach(() => {
    onlineStatusMock.isOnline = true;
    clearSyncError();
  });

  it('同期エラーがないときは何も表示しない', () => {
    const { container } = render(<SyncErrorBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('unavailable エラー時に「同期できていません」を表示する', () => {
    render(<SyncErrorBanner />);

    act(() => {
      reportSyncError('unavailable');
    });

    expect(screen.getByRole('status')).toHaveTextContent('データを同期できていません');
  });

  it('permission-denied エラー時はアクセス権限のメッセージを表示する', () => {
    render(<SyncErrorBanner />);

    act(() => {
      reportSyncError('permission-denied');
    });

    expect(screen.getByRole('status')).toHaveTextContent('アクセス権限');
  });

  it('エラー回復（clearSyncError）でバナーが消える', () => {
    render(<SyncErrorBanner />);

    act(() => {
      reportSyncError('unavailable');
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      clearSyncError();
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('オフライン時は表示しない（OfflineBanner に譲る）', () => {
    onlineStatusMock.isOnline = false;
    render(<SyncErrorBanner />);

    act(() => {
      reportSyncError('unavailable');
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
