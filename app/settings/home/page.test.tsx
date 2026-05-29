import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HomeVisibilitySettingsPage from './page';

const mockUpdateFeatureHidden = vi.fn();

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { uid: 'user-1', email: 'test@example.com' },
    loading: false,
  }),
}));

vi.mock('@/app/login/page', () => ({
  default: () => <div>ログイン画面</div>,
}));

vi.mock('@/hooks/useHomeFeatureVisibility', () => ({
  useHomeFeatureVisibility: () => ({
    hiddenKeys: [],
    updateFeatureHidden: mockUpdateFeatureHidden,
    resetVisibility: vi.fn(),
    isLoading: false,
  }),
}));

describe('HomeVisibilitySettingsPage', () => {
  it('機能のスイッチをOFFにするとアカウント設定へ非表示設定を保存する', () => {
    render(<HomeVisibilitySettingsPage />);

    fireEvent.click(screen.getByRole('switch', { name: 'ドリップガイドをホームに表示' }));

    expect(mockUpdateFeatureHidden).toHaveBeenCalledWith('drip-guide', true);
  });
});
