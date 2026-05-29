import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// 認証フックをモック（テストごとに戻り値を差し替える）
const mockUseAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Toast コンテキストをモック
vi.mock('@/components/Toast', () => ({
  useToastContext: () => ({ showToast: vi.fn() }),
}));

// 購読フックをモック（空データを返す）
vi.mock('@/hooks/useProductionRecord', () => ({
  useProductionRecord: () => ({
    monthDoc: null,
    handpickEntries: [],
    roastEntries: [],
    packageEntries: [],
    isLoading: false,
  }),
}));

// Firestore 関数をモック
vi.mock('@/lib/firestore/productionRecords', () => ({
  subscribeRecentProductionMonths: vi.fn(() => () => {}),
  saveProductionRecordMonth: vi.fn(async () => {}),
  addHandpickEntry: vi.fn(async () => 'id'),
  updateHandpickEntry: vi.fn(async () => {}),
  addRoastEntry: vi.fn(async () => 'id'),
  updateRoastEntry: vi.fn(async () => {}),
  addPackageEntry: vi.fn(async () => 'id'),
  updatePackageEntry: vi.fn(async () => {}),
}));

// ログインページをモック（識別用テキストのみ）
vi.mock('@/app/login/page', () => ({
  default: () => <div>ログイン画面</div>,
}));

// Loading をモック
vi.mock('@/components/Loading', () => ({
  Loading: () => <div>読み込み中</div>,
}));

// モーダルはレンダリングされない（親が条件レンダリング）が import 解決のためモック
vi.mock('@/components/production-record/MonthSettingsModal', () => ({
  MonthSettingsModal: () => null,
}));
vi.mock('@/components/production-record/HandpickEntryModal', () => ({
  HandpickEntryModal: () => null,
}));
vi.mock('@/components/production-record/RoastEntryModal', () => ({
  RoastEntryModal: () => null,
}));
vi.mock('@/components/production-record/PackageEntryModal', () => ({
  PackageEntryModal: () => null,
}));

import ProductionRecordPage from './page';

describe('ProductionRecordPage', () => {
  it('認証ロード中はLoadingを表示する', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<ProductionRecordPage />);
    expect(screen.getByText('読み込み中')).toBeInTheDocument();
  });

  it('未ログイン時はLoginPageを表示する', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<ProductionRecordPage />);
    expect(screen.getByText('ログイン画面')).toBeInTheDocument();
  });

  it('ログイン済みなら見出し「生産記録」を表示する', () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' }, loading: false });
    render(<ProductionRecordPage />);
    expect(screen.getByRole('heading', { name: '生産記録' })).toBeInTheDocument();
  });
});
