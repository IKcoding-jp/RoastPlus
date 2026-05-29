import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HomePage from './page';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getUserData: vi.fn().mockResolvedValue({}),
  visibleKeys: new Set<string>(),
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

describe('HomePage', () => {
  beforeEach(() => {
    mocks.push.mockClear();
    mocks.getUserData.mockClear();
    mocks.visibleKeys.clear();
    ['assignment', 'schedule', 'tasting', 'defect-beans', 'production-packs', 'drip-guide', 'settings'].forEach((key) =>
      mocks.visibleKeys.add(key)
    );
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

  it('スマホで表示機能が少ない場合もアクションを巨大化させない', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
    mocks.visibleKeys.clear();
    mocks.visibleKeys.add('settings');

    render(<HomePage />);

    const settingsButton = screen.getByRole('button', { name: 'その他' });
    await waitFor(() => {
      expect(settingsButton.style.getPropertyValue('--home-card-height')).toBe('64px');
    });
  });
});
