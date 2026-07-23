'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signUpWithEmail } from '@/lib/auth';
import { Loading } from '@/components/Loading';
import { Input, Button } from '@/components/ui';
import { getSafeReturnUrl } from '@/lib/returnUrl';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signUpWithEmail(email, password);
      const redirectUrl = getSafeReturnUrl(searchParams.get('returnUrl'), '/');
      router.push(redirectUrl);
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      const errorCode = errorObj.code;
      let errorMessage = 'エラーが発生しました';

      switch (errorCode) {
        case 'auth/invalid-email':
          errorMessage = 'メールアドレスの形式が正しくありません';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'このメールアドレスは既に使用されています';
          break;
        case 'auth/weak-password':
          errorMessage = 'パスワードは6文字以上で入力してください';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'ネットワークエラーが発生しました';
          break;
        default:
          errorMessage = errorObj.message || 'エラーが発生しました';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-md rounded-lg bg-surface p-8 shadow-md border border-edge">
        <div className="mb-8 flex flex-col items-center rounded-xl bg-[#3a261d] py-6 shadow-inner">
          <h1 className="text-4xl font-bold tracking-tight text-header-text font-[var(--font-playfair)]">
            Roast<span className="text-header-accent">Plus</span>
          </h1>
        </div>

        <p className="mb-6 text-center text-sm text-ink-sub">新しいアカウントを作成します。</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="メールアドレス"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@example.com"
            required
          />

          <Input
            label="パスワード"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6文字以上"
            required
            minLength={6}
            showPasswordToggle
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={loading} loading={loading} fullWidth>
            アカウントを作成
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-sub">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/login" className="text-header-accent underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-page px-4">
          <div className="w-full max-w-md rounded-lg bg-surface p-8 shadow-md border border-edge">
            <h1 className="mb-8 text-center text-2xl font-bold text-ink">RoastPlus</h1>
            <Loading fullScreen={false} />
          </div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
