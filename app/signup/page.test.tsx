import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import SignupPage from './page';

const mocks = vi.hoisted(() => ({
  signUpWithEmail: vi.fn(),
  push: vi.fn(),
  getSearchParam: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  signUpWithEmail: mocks.signUpWithEmail,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => ({ get: mocks.getSearchParam }),
}));

vi.mock('@/lib/returnUrl', () => ({
  getSafeReturnUrl: (_url: string | null, fallback: string) => fallback,
}));

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSearchParam.mockReturnValue(null);
  });

  it('サインアップフォームが表示される', async () => {
    render(<SignupPage />);
    expect(await screen.findByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'アカウントを作成' })).toBeInTheDocument();
  });

  it('登録成功時にホームへリダイレクトする', async () => {
    mocks.signUpWithEmail.mockResolvedValue(undefined);
    render(<SignupPage />);

    fireEvent.change(await screen.findByLabelText('メールアドレス'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'アカウントを作成' }));

    await waitFor(() => {
      expect(mocks.signUpWithEmail).toHaveBeenCalledWith('new@example.com', 'password123');
      expect(mocks.push).toHaveBeenCalledWith('/');
    });
  });

  it('登録済みメールアドレスの場合エラーメッセージを表示する', async () => {
    mocks.signUpWithEmail.mockRejectedValue({ code: 'auth/email-already-in-use' });
    render(<SignupPage />);

    fireEvent.change(await screen.findByLabelText('メールアドレス'), {
      target: { value: 'dup@example.com' },
    });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'アカウントを作成' }));

    await waitFor(() => {
      expect(screen.getByText('このメールアドレスは既に使用されています')).toBeInTheDocument();
    });
  });

  it('パスワードが弱い場合エラーメッセージを表示する', async () => {
    mocks.signUpWithEmail.mockRejectedValue({ code: 'auth/weak-password' });
    render(<SignupPage />);

    fireEvent.change(await screen.findByLabelText('メールアドレス'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'アカウントを作成' }));

    await waitFor(() => {
      expect(screen.getByText('パスワードは6文字以上で入力してください')).toBeInTheDocument();
    });
  });
});
