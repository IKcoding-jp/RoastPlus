import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HomePage from './page';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getUserData: vi.fn().mockResolvedValue({}),
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
    isVisible: (key: string) => key !== 'dev-stories',
  }),
}));

describe('HomePage', () => {
  it('非表示設定の機能カードをホームに表示しないが、その他は表示する', () => {
    render(<HomePage />);

    expect(screen.queryByRole('button', { name: '開発秘話' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'その他' })).toBeInTheDocument();
  });
});
