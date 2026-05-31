import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HomePage from './page';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getUserData: vi.fn().mockResolvedValue({}),
  visibleKeys: new Set<string>(),
  inventoryItems: [] as unknown[],
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { uid: 'user-1', email: 'test@example.com' },
    loading: false,
  }),
}));

vi.mock('@/lib/firestore', () => ({
  getUserData: mocks.getUserData,
}));

vi.mock('@/lib/consent', () => ({
  needsConsent: () => false,
}));

vi.mock('@/hooks/useChristmasMode', () => ({
  useChristmasMode: () => ({
    isChristmasMode: false,
  }),
}));

vi.mock('@/hooks/useHomeFeatureVisibility', () => ({
  useHomeFeatureVisibility: () => ({
    isVisible: (key: string) => mocks.visibleKeys.has(key),
  }),
}));

vi.mock('@/hooks/useInventory', () => ({
  useInventory: () => ({
    items: mocks.inventoryItems,
    isLoading: false,
  }),
}));

describe('HomePage', () => {
  beforeEach(() => {
    mocks.push.mockClear();
    mocks.getUserData.mockClear();
    mocks.visibleKeys.clear();
    mocks.inventoryItems = [];
    [
      'assignment',
      'schedule',
      'tasting',
      'defect-beans',
      'production-record',
      'inventory',
      'drip-guide',
      'settings',
    ].forEach((key) => mocks.visibleKeys.add(key));
  });

  it('非表示設定の機能カードをホームに表示しないが、その他は表示する', () => {
    mocks.visibleKeys.delete('drip-guide');

    render(<HomePage />);

    expect(screen.queryByRole('button', { name: 'ドリップガイド' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'その他' })).toBeInTheDocument();
  });

  it('表示中の機能は1つのホームアクションとして表示する', () => {
    render(<HomePage />);

    expect(screen.getAllByRole('button', { name: '担当表' })).toHaveLength(1);
  });

  it('スマホで表示機能が少ない場合もアクションを巨大化させない', () => {
    mocks.visibleKeys.clear();
    mocks.visibleKeys.add('settings');

    render(<HomePage />);

    const settingsButton = screen.getByRole('button', { name: 'その他' });
    // flex-1 で伸びるが max-h で頭打ちにして巨大化を防ぐ。旧来のインライン高さ変数は持たない。
    expect(settingsButton.className).toMatch(/max-h-\[112px\]/);
    expect(settingsButton.style.getPropertyValue('--home-card-height')).toBe('');
  });

  it('機能名の上に英字ラベルを表示する', () => {
    render(<HomePage />);

    // 英字ラベルが表示される（クラフトラベル型）
    expect(screen.getByText('ASSIGNMENT')).toBeInTheDocument();
    expect(screen.getByText('PRODUCTION')).toBeInTheDocument();
    // アクセシブルネームは機能名のまま（aria-label）であること
    expect(screen.getByRole('button', { name: '担当表' })).toBeInTheDocument();
  });

  it('要発注品があるとき在庫バッジは件数だけでなく意味の伝わる文言を表示する', () => {
    mocks.inventoryItems = [
      { id: 'a', name: 'ドリップ袋', category: 'consumable', status: 'out', updatedBy: 'u1' },
      { id: 'b', name: 'カップ', category: 'consumable', status: 'low', updatedBy: 'u1' },
    ];

    render(<HomePage />);

    // 「2」だけだと完了ラベル風で誤解されるため、「要発注」を含む文言で意味を明示する
    expect(screen.getByText('要発注2')).toBeInTheDocument();
    // 件数のみのバッジ（誤解を招く表記）は存在しないこと
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  it('要発注品がないとき在庫バッジ（件数付き）を表示しない', () => {
    mocks.inventoryItems = [{ id: 'a', name: 'ドリップ袋', category: 'consumable', status: 'enough', updatedBy: 'u1' }];

    render(<HomePage />);

    // 「不足品を共有・要発注」は説明文なので除外し、件数付きバッジ（要発注N）のみ判定する
    expect(screen.queryByText(/^要発注\d+$/)).not.toBeInTheDocument();
  });
});
