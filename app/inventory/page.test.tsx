import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { InventoryItem } from '@/types';

const mockUseAuth = vi.fn();
const mockUseInventory = vi.fn();

vi.mock('@/lib/auth', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/useInventory', () => ({ useInventory: () => mockUseInventory() }));
vi.mock('@/lib/firestore', () => ({
  addInventoryItem: vi.fn(),
  updateInventoryItem: vi.fn(),
  setInventoryItemStatus: vi.fn(),
  deleteInventoryItem: vi.fn(),
}));
vi.mock('@/components/Toast', () => ({ useToastContext: () => ({ showToast: vi.fn() }) }));

import InventoryPage from './page';

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
});
