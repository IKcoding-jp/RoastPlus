// Firestore購読エラー（issue #496）・保存エラー（issue #497）通知バナーのテスト

import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncErrorBanner } from './SyncErrorBanner';
import { reportSyncError, clearSyncError, reportSaveError, clearSaveError } from '@/lib/syncStatus';

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
    clearSaveError();
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

  it('保存エラー時に「保存できませんでした」を表示する（issue #497）', () => {
    render(<SyncErrorBanner />);

    act(() => {
      reportSaveError('unknown');
    });

    expect(screen.getByRole('status')).toHaveTextContent('保存できませんでした');
  });

  it('保存エラーが permission-denied のときは再ログイン案内を表示する', () => {
    render(<SyncErrorBanner />);

    act(() => {
      reportSaveError('permission-denied');
    });

    expect(screen.getByRole('status')).toHaveTextContent('再ログイン');
  });

  it('保存エラーは購読エラーより優先して表示する（データ未保存の方が深刻）', () => {
    render(<SyncErrorBanner />);

    act(() => {
      reportSyncError('unavailable');
      reportSaveError('unknown');
    });

    expect(screen.getByRole('status')).toHaveTextContent('保存できませんでした');
  });

  it('保存エラーの解除（clearSaveError）で購読エラーの表示に戻る', () => {
    render(<SyncErrorBanner />);

    act(() => {
      reportSyncError('unavailable');
      reportSaveError('unknown');
    });

    act(() => {
      clearSaveError();
    });

    expect(screen.getByRole('status')).toHaveTextContent('データを同期できていません');
  });
});
