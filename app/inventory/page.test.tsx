import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { InventoryItem } from '@/types';

const mockUseAuth = vi.fn();
const mockUseInventory = vi.fn();
const mockShowToast = vi.fn();

vi.mock('@/lib/auth', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/useInventory', () => ({ useInventory: () => mockUseInventory() }));
vi.mock('@/lib/firestore', () => ({
  addInventoryItem: vi.fn().mockResolvedValue(undefined),
  updateInventoryItem: vi.fn().mockResolvedValue(undefined),
  setInventoryItemStatus: vi.fn().mockResolvedValue(undefined),
  deleteInventoryItem: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/components/Toast', () => ({ useToastContext: () => ({ showToast: mockShowToast }) }));
// Modal/Dialog は framer-motion を使うため、テストではアニメーションを素通しさせる
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

import InventoryPage from './page';
import { deleteInventoryItem } from '@/lib/firestore';

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { uid: 'u1', displayName: '池田' }, loading: false });
});

describe('InventoryPage', () => {
  it('品目があれば一覧に名前を表示する', () => {
    const items: InventoryItem[] = [
      { id: 'a', name: 'ドリップ袋', category: 'material', status: 'low', updatedBy: '池田' },
    ];
    mockUseInventory.mockReturnValue({ items, isLoading: false });
    render(<InventoryPage />);
    // low の品目は要発注リストと全品目一覧の両方に出るため複数ヒットする
    expect(screen.getAllByText('ドリップ袋').length).toBeGreaterThan(0);
  });

  it('要発注（low/out）の件数を見出しに表示する', () => {
    const items: InventoryItem[] = [
      { id: 'a', name: 'ドリップ袋', category: 'material', status: 'low', updatedBy: '池田' },
      { id: 'b', name: 'ラベル', category: 'consumable', status: 'out', updatedBy: '池田' },
      { id: 'c', name: '段ボール', category: 'material', status: 'enough', updatedBy: '池田' },
    ];
    mockUseInventory.mockReturnValue({ items, isLoading: false });
    render(<InventoryPage />);
    // 見出し(h1)に「要発注 2」と件数を表示する（h2「要発注リスト」と区別するため role で特定）
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('要発注 2');
  });

  it('(F) 品目が空かつ非ローディングなら全品目セクションに空状態を表示する', () => {
    mockUseInventory.mockReturnValue({ items: [], isLoading: false });
    render(<InventoryPage />);
    expect(screen.getByText('品目がありません')).toBeInTheDocument();
  });

  it('(F) ローディング中は空状態を表示しない', () => {
    mockUseInventory.mockReturnValue({ items: [], isLoading: true });
    render(<InventoryPage />);
    expect(screen.queryByText('品目がありません')).not.toBeInTheDocument();
  });

  it('(A) 別品目の編集に切り替えるとモーダルの値が入れ替わる', () => {
    const items: InventoryItem[] = [
      { id: 'a', name: 'ドリップ袋', category: 'material', status: 'enough', updatedBy: '池田' },
      { id: 'b', name: 'ラベル', category: 'consumable', status: 'enough', updatedBy: '池田' },
    ];
    mockUseInventory.mockReturnValue({ items, isLoading: false });
    render(<InventoryPage />);

    // 1件目「ドリップ袋」の編集ボタンを押す（Card 単位で特定）
    const cardA = screen.getByText('ドリップ袋').closest('[class*="rounded"]') as HTMLElement;
    fireEvent.click(within(cardA).getByRole('button', { name: '編集' }));
    expect((screen.getByLabelText('品目名') as HTMLInputElement).value).toBe('ドリップ袋');

    // モーダルを閉じてから2件目「ラベル」を編集 → 値が入れ替わる
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    const cardB = screen.getByText('ラベル').closest('[class*="rounded"]') as HTMLElement;
    fireEvent.click(within(cardB).getByRole('button', { name: '編集' }));
    expect((screen.getByLabelText('品目名') as HTMLInputElement).value).toBe('ラベル');
  });

  it('(D) 削除ボタンは即削除せず確認ダイアログを挟み、確定で削除する', async () => {
    const items: InventoryItem[] = [
      { id: 'a', name: 'ドリップ袋', category: 'material', status: 'enough', updatedBy: '池田' },
    ];
    mockUseInventory.mockReturnValue({ items, isLoading: false });
    render(<InventoryPage />);

    // 削除ボタン押下では即時に削除されない
    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    expect(deleteInventoryItem).not.toHaveBeenCalled();

    // 確認ダイアログが表示される
    expect(screen.getByText('品目を削除しますか？')).toBeInTheDocument();
    expect(screen.getByText('共有在庫なので全員に反映されます')).toBeInTheDocument();

    // ダイアログの確定ボタンで初めて削除される。
    // 確認表示中は一覧の「削除」とダイアログの「削除」の2つが存在するため、
    // ダイアログ内（タイトルと同じコンテナ配下）の確定ボタンに限定する。
    const dialogPanel = screen.getByText('品目を削除しますか？').closest('div') as HTMLElement;
    fireEvent.click(within(dialogPanel).getByRole('button', { name: '削除' }));
    await waitFor(() => expect(deleteInventoryItem).toHaveBeenCalledWith('a'));
  });
});
