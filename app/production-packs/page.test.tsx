import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProductionPacksPage from './page';
import type { ProductionPackRecord } from '@/types';

const records: ProductionPackRecord[] = [
  {
    workDate: '2026-05-24',
    teamA: { successCount: 10, failureCount: 1 },
    teamB: { successCount: 20, failureCount: 2 },
    successTotal: 30,
    failureTotal: 3,
    total: 33,
  },
  {
    workDate: '2026-05-23',
    teamA: { successCount: 5, failureCount: 0 },
    teamB: { successCount: 6, failureCount: 1 },
    successTotal: 11,
    failureTotal: 1,
    total: 12,
  },
];

const mocks = vi.hoisted(() => ({
  deleteProductionPackRecord: vi.fn(),
  saveProductionPackRecord: vi.fn(),
  showToast: vi.fn(),
  subscribeProductionPackRecord: vi.fn(),
  subscribeRecentProductionPackRecords: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock('@/components/Toast', () => ({
  useToastContext: () => ({
    showToast: mocks.showToast,
  }),
}));

vi.mock('@/components/Loading', () => ({
  Loading: () => <div>読み込み中...</div>,
}));

vi.mock('@/lib/productionPackRecords', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/productionPackRecords')>();
  return {
    ...actual,
    getTodayProductionPackDate: () => '2026-05-24',
  };
});

vi.mock('@/app/login/page', () => ({
  default: () => <div>ログイン画面</div>,
}));

vi.mock('@/lib/firestore/productionPackRecords', () => ({
  deleteProductionPackRecord: mocks.deleteProductionPackRecord,
  saveProductionPackRecord: mocks.saveProductionPackRecord,
  subscribeProductionPackRecord: mocks.subscribeProductionPackRecord,
  subscribeRecentProductionPackRecords: mocks.subscribeRecentProductionPackRecords,
}));

describe('ProductionPacksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: { uid: 'user-1' }, loading: false });
    mocks.subscribeProductionPackRecord.mockImplementation(
      (_userId: string, workDate: string, callback: (record: ProductionPackRecord | null) => void) => {
        callback(records.find((record) => record.workDate === workDate) ?? null);
        return vi.fn();
      }
    );
    mocks.subscribeRecentProductionPackRecords.mockImplementation(
      (_userId: string, callback: (nextRecords: ProductionPackRecord[]) => void) => {
        callback(records);
        return vi.fn();
      }
    );
  });

  it('prevents saving future dates from the screen', async () => {
    render(<ProductionPacksPage />);

    fireEvent.change(screen.getByLabelText('作業日'), { target: { value: '2026-05-25' } });

    await waitFor(() => expect(screen.getByText('2026年5月25日')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    screen.getAllByRole('spinbutton').forEach((input) => {
      expect(input).toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(mocks.saveProductionPackRecord).not.toHaveBeenCalled();
  });

  it('allows deleting today only and disables delete after selecting a past record', async () => {
    render(<ProductionPacksPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: '削除' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: '2026年5月23日' }));

    await waitFor(() => expect(screen.getByText('過去日の追加・修正ができます。削除は当日分のみです。')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '削除' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '削除' }));

    expect(screen.queryByText('記録を削除しますか？')).not.toBeInTheDocument();
    expect(mocks.deleteProductionPackRecord).not.toHaveBeenCalled();
  });
});
