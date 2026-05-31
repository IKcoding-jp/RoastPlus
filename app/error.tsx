'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-page">
      <h1 className="text-xl font-bold text-ink">一時的な問題が発生しました</h1>
      <p className="text-sm text-ink-sub">
        お手数ですが、再読み込みしてください。入力中のデータは保存されている場合があります。
      </p>
      <div className="flex gap-3">
        <Button type="button" variant="primary" size="sm" onClick={() => reset()}>
          再読み込み
        </Button>
        <Link
          href="/"
          className="min-h-[44px] px-5 rounded-xl border border-edge text-ink text-[15px] font-semibold flex items-center"
        >
          ホームへ
        </Link>
      </div>
    </div>
  );
}
