import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import LoginPage from './page';

const mocks = vi.hoisted(() => ({
  signInWithEmailAndPassword: vi.fn(),
  push: vi.fn(),
  getSearchParam: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: mocks.signInWithEmailAndPassword,
}));

vi.mock('@/lib/firebase', () => ({
  auth: {},
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => ({ get: mocks.getSearchParam }),
}));

vi.mock('@/lib/e2eMode', () => ({
  isE2EMode: () => false,
  E2E_EMAIL: 'e2e@test.com',
  E2E_PASSWORD: 'e2epass',
  signInE2EUser: vi.fn(),
}));

vi.mock('@/lib/returnUrl', () => ({
  getSafeReturnUrl: (_url: string | null, fallback: string) => fallback,
}));

vi.mock('@/components/Toast', () => ({
  useToastContext: () => ({ showToast: mocks.showToast }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSearchParam.mockReturnValue(null);
  });

  it('ログインフォームとサインアップ導線が表示される', async () => {
    render(<LoginPage />);
    expect(await screen.findByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'アカウントを作成' })).toHaveAttribute('href', '/signup');
  });

  it('ログイン成功時にホームへリダイレクトする', async () => {
    mocks.signInWithEmailAndPassword.mockResolvedValue({});
    render(<LoginPage />);

    fireEvent.change(await screen.findByLabelText('メールアドレス'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/');
    });
  });

  it('認証エラー時にエラーメッセージを表示する', async () => {
    mocks.signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-credential' });
    render(<LoginPage />);

    fireEvent.change(await screen.findByLabelText('メールアドレス'), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(screen.getByText('メールアドレスもしくはパスワードが違います')).toBeInTheDocument();
    });
  });

  it('ネットワークエラー時に適切なエラーメッセージを表示する', async () => {
    mocks.signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/network-request-failed' });
    render(<LoginPage />);

    fireEvent.change(await screen.findByLabelText('メールアドレス'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    await waitFor(() => {
      expect(screen.getByText('ネットワークエラーが発生しました')).toBeInTheDocument();
    });
  });
});
