'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loading } from '@/components/Loading';
import { Input, Button } from '@/components/ui';
import { E2E_EMAIL, E2E_PASSWORD, isE2EMode, signInE2EUser } from '@/lib/e2eMode';
import { getSafeReturnUrl } from '@/lib/returnUrl';
import { useToastContext } from '@/components/Toast';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToastContext();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem('roastplus_cache_clear_failed') === '1') {
      window.localStorage.removeItem('roastplus_cache_clear_failed');
      showToast(
        'ログアウト時に端末内のデータを完全に消去できませんでした。共有端末の場合は、他のRoastPlusのタブを閉じてからもう一度ログアウトしてください。',
        'error'
      );
    }
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);

    try {
      if (isE2EMode()) {
        if (email !== E2E_EMAIL || password !== E2E_PASSWORD) {
          setError('メールアドレスもしくはパスワードが違います');
          return;
        }

        signInE2EUser();
        const redirectUrl = getSafeReturnUrl(searchParams.get('returnUrl'), '/');
        router.push(redirectUrl);
        return;
      }

      await signInWithEmailAndPassword(auth, email, password);
      // returnUrlがあればそのURLに、なければホームにリダイレクト
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
        case 'auth/user-disabled':
          errorMessage = 'このアカウントは無効化されています';
          break;
        case 'auth/user-not-found':
          errorMessage = 'アカウントが見つかりません';
          break;
        case 'auth/wrong-password':
          errorMessage = 'パスワードが正しくありません';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'メールアドレスもしくはパスワードが違います';
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

        <p className="mb-6 text-center text-sm text-ink-sub">共有アカウントでログインしてください。</p>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* メールアドレス */}
          <Input
            label="メールアドレス"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@example.com"
            required
          />

          {/* パスワード */}
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

          {/* 送信ボタン */}
          <Button type="submit" disabled={loading} loading={loading} fullWidth>
            ログイン
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
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
      <LoginForm />
    </Suspense>
  );
}
