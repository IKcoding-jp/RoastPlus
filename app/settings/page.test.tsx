import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SettingsPage from './page';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  showToast: vi.fn(),
  signOut: vi.fn(),
  getUserData: vi.fn().mockResolvedValue({}),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { uid: 'user-1', email: 'test@example.com' },
    loading: false,
  }),
  signOut: mocks.signOut,
}));

vi.mock('@/hooks/useDeveloperMode', () => ({
  useDeveloperMode: () => ({
    isEnabled: false,
    isLoading: false,
    enableDeveloperMode: vi.fn(),
    disableDeveloperMode: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    presets: [{ id: 'default', name: 'デフォルト' }],
    currentTheme: 'default',
  }),
}));

vi.mock('@/hooks/useAppVersion', () => ({
  useAppVersion: () => ({
    version: '0.17.7',
    isUpdateAvailable: false,
    isChecking: false,
    checkForUpdates: vi.fn(),
    applyUpdate: vi.fn(),
  }),
}));

vi.mock('@/components/Toast', () => ({
  useToastContext: () => ({
    showToast: mocks.showToast,
  }),
}));

vi.mock('@/lib/firestore', () => ({
  getUserData: mocks.getUserData,
}));

vi.mock('@/app/login/page', () => ({
  default: () => <div>ログイン画面</div>,
}));

describe('SettingsPage', () => {
  it('設定項目のカード一覧は適度なgapで上下の余白を確保する', () => {
    render(<SettingsPage />);

    expect(screen.getByRole('main')).toHaveClass('flex', 'flex-col', 'gap-4');
  });

  it('ホーム表示設定への入口を表示する', () => {
    render(<SettingsPage />);

    expect(screen.getByRole('link', { name: /ホーム表示設定/ })).toHaveAttribute(
      'href',
      '/settings/home'
    );
  });

  it('ホーム表示設定は他の設定カードと同じ横幅で表示する', () => {
    render(<SettingsPage />);

    const links = screen.getAllByRole('link');
    const homeVisibilityLink = screen.getByRole('link', { name: /ホーム表示設定/ });

    expect(links[1]).toBe(homeVisibilityLink);
    expect(homeVisibilityLink).toHaveClass('block');
    expect(homeVisibilityLink).not.toHaveClass('mx-auto');
    expect(homeVisibilityLink).not.toHaveClass('max-w-xl');
  });
});
