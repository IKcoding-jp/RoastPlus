import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HomeVisibilitySettingsPage from './page';

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { uid: 'user-1', email: 'test@example.com' },
    loading: false,
  }),
}));

vi.mock('@/app/login/page', () => ({
  default: () => <div>ログイン画面</div>,
}));

describe('HomeVisibilitySettingsPage', () => {
  it('機能のスイッチをOFFにすると非表示設定を保存する', () => {
    render(<HomeVisibilitySettingsPage />);

    fireEvent.click(screen.getByRole('switch', { name: '開発秘話をホームに表示' }));

    expect(localStorage.getItem('roastplus_home_hidden_features')).toBe(
      JSON.stringify(['dev-stories'])
    );
  });
});
