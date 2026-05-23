import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CONTACT_FORM_COOLDOWN_STORAGE_KEY } from '@/lib/contactForm';

import ContactPage from './page';

const mocks = vi.hoisted(() => ({
  isEmailJSConfigured: vi.fn(() => true),
  sendContactEmail: vi.fn(),
}));

vi.mock('@/lib/emailjs', () => ({
  CONTACT_TYPES: [
    { value: 'question', label: '機能に関するご質問' },
    { value: 'bug', label: '不具合のご報告' },
    { value: 'request', label: 'ご要望・ご提案' },
    { value: 'other', label: 'その他' },
  ],
  isEmailJSConfigured: mocks.isEmailJSConfigured,
  sendContactEmail: mocks.sendContactEmail,
}));

function fillContactForm({
  name = '山田 太郎',
  email = 'test@example.com',
  message = 'お問い合わせ内容の詳細です。',
}: {
  name?: string;
  email?: string;
  message?: string;
} = {}) {
  fireEvent.change(screen.getByLabelText('お名前（任意）'), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText('メールアドレス（必須）'), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText('お問い合わせ内容（必須）'), {
    target: { value: message },
  });
}

describe('ContactPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.isEmailJSConfigured.mockReturnValue(true);
    mocks.sendContactEmail.mockResolvedValue(undefined);
  });

  it('不正なメールアドレスでは送信しない', async () => {
    render(<ContactPage />);

    fillContactForm({ email: 'invalid-email' });
    fireEvent.click(screen.getByRole('button', { name: '送信する' }));

    expect(await screen.findByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    expect(mocks.sendContactEmail).not.toHaveBeenCalled();
  });

  it('短すぎる本文では送信しない', async () => {
    render(<ContactPage />);

    fillContactForm({ message: '短い' });
    fireEvent.click(screen.getByRole('button', { name: '送信する' }));

    expect(await screen.findByText('お問い合わせ内容は10文字以上で入力してください')).toBeInTheDocument();
    expect(mocks.sendContactEmail).not.toHaveBeenCalled();
  });

  it('送信中の二重送信を防ぐ', async () => {
    mocks.sendContactEmail.mockReturnValue(new Promise(() => undefined));
    render(<ContactPage />);

    fillContactForm();
    const form = screen.getByRole('button', { name: '送信する' }).closest('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form!);
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mocks.sendContactEmail).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('button', { name: '送信中...' })).toBeDisabled();
  });

  it('trim済みの内容を送信する', async () => {
    render(<ContactPage />);

    fillContactForm({
      name: '   ',
      email: '  test@example.com  ',
      message: '  お問い合わせ内容の詳細です。  ',
    });
    fireEvent.click(screen.getByRole('button', { name: '送信する' }));

    await waitFor(() => {
      expect(mocks.sendContactEmail).toHaveBeenCalledWith({
        name: '',
        email: 'test@example.com',
        type: 'question',
        message: 'お問い合わせ内容の詳細です。',
      });
    });
  });

  it('cooldown中の再送信を拒否する', async () => {
    localStorage.setItem(CONTACT_FORM_COOLDOWN_STORAGE_KEY, String(Date.now()));
    render(<ContactPage />);

    fillContactForm();
    fireEvent.click(screen.getByRole('button', { name: '送信する' }));

    expect(
      await screen.findByText(/少し時間をおいて再度お試しください/)
    ).toBeInTheDocument();
    expect(mocks.sendContactEmail).not.toHaveBeenCalled();
  });
});
