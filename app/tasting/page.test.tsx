import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import TastingPage from './page';
import type { AppData } from '@/types';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useAppData: vi.fn(),
  push: vi.fn(),
  getSearchParam: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => mocks.useAppData(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => ({ get: mocks.getSearchParam }),
}));

vi.mock('@/components/Loading', () => ({
  Loading: ({ message }: { message?: string }) => <div>{message ?? '読み込み中...'}</div>,
}));

vi.mock('@/components/TastingSessionList', () => ({
  TastingSessionList: () => <div>テイスティングセッション一覧</div>,
}));

vi.mock('@/components/TastingSessionDetail', () => ({
  TastingSessionDetail: () => <div>セッション詳細</div>,
}));

vi.mock('@/components/TastingRecordForm', () => ({
  TastingRecordForm: () => <div>記録フォーム</div>,
}));

vi.mock('@/components/TastingSessionForm', () => ({
  TastingSessionForm: () => <div>セッション編集フォーム</div>,
}));

vi.mock('@/components/Toast', () => ({
  useToastContext: () => ({ showToast: mocks.showToast }),
}));

const baseData: AppData = {
  tastingSessions: [],
  tastingRecords: [],
  todaySchedules: [],
  roastSchedules: [],
  notifications: [],
  encouragementCount: 0,
  dripRecipes: [],
};

describe('TastingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: { uid: 'user-1' }, loading: false });
    mocks.useAppData.mockReturnValue({ data: baseData, updateData: vi.fn(), isLoading: false });
    mocks.getSearchParam.mockReturnValue(null);
  });

  it('認証ローディング中はLoading表示する', () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: true });
    render(<TastingPage />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('未ログイン時は何も表示せずリダイレクトする', () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: false });
    const { container } = render(<TastingPage />);
    expect(mocks.push).toHaveBeenCalledWith('/login?returnUrl=/tasting');
    expect(container.querySelector('main')).not.toBeInTheDocument();
  });

  it('データロード中はLoading表示する', () => {
    mocks.useAppData.mockReturnValue({ data: baseData, updateData: vi.fn(), isLoading: true });
    render(<TastingPage />);
    expect(screen.getByText('データを読み込み中...')).toBeInTheDocument();
  });

  it('ログイン済み・デフォルト表示でTastingSessionListを表示する', () => {
    render(<TastingPage />);
    expect(screen.getByText('テイスティングセッション一覧')).toBeInTheDocument();
  });

  it('sessionId+edit=trueで存在しないセッションは「セッションが見つかりません」を表示する', () => {
    mocks.getSearchParam.mockImplementation((key: string) => {
      if (key === 'sessionId') return 'non-existent-id';
      if (key === 'edit') return 'true';
      return null;
    });
    render(<TastingPage />);
    expect(screen.getByText('セッションが見つかりません')).toBeInTheDocument();
  });

  it('sessionIdのみで存在しないセッションは「セッションが見つかりません」を表示する', () => {
    mocks.getSearchParam.mockImplementation((key: string) => {
      if (key === 'sessionId') return 'non-existent-id';
      return null;
    });
    render(<TastingPage />);
    expect(screen.getByText('セッションが見つかりません')).toBeInTheDocument();
  });

  it('recordIdで存在しない記録は「記録が見つかりません」を表示する', () => {
    mocks.getSearchParam.mockImplementation((key: string) => {
      if (key === 'recordId') return 'non-existent-record';
      return null;
    });
    render(<TastingPage />);
    expect(screen.getByText('記録が見つかりません')).toBeInTheDocument();
  });
});
