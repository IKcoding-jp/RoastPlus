'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loading } from '@/components/Loading';
import { Input, Button } from '@/components/ui';
import { getSafeReturnUrl } from '@/lib/returnUrl';

function LoginForm() {
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
        <div className="mb-8 flex flex-col items-center bg-[#1a1412] py-6 rounded-xl shadow-inner">
          <h1 className="text-4xl font-bold text-white tracking-tight font-[var(--font-playfair)]">
            Roast<span className="text-amber-500">Plus</span>
          </h1>
        </div>

        <p className="mb-6 text-center text-sm text-ink-sub">
          共有アカウントでログインしてください。
        </p>

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

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* 送信ボタン */}
          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            fullWidth
          >
            ログイン
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-page px-4">
        <div className="w-full max-w-md rounded-lg bg-surface p-8 shadow-md border border-edge">
          <h1 className="mb-8 text-center text-2xl font-bold text-ink">
            RoastPlus
          </h1>
          <Loading fullScreen={false} />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
