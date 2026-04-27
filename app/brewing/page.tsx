'use client';

import { useAuth } from '@/lib/auth';
import { Loading } from '@/components/Loading';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import LoginPage from '@/app/login/page';
import { FloatingNav } from '@/components/ui';

export default function BrewingPage() {
  const { user, loading: authLoading } = useAuth();
  useAppLifecycle();

  if (authLoading) {
    return <Loading />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-page">
      <FloatingNav backHref="/" />
      <div className="container mx-auto px-4 sm:px-6 pt-14 pb-4 sm:pb-6 max-w-4xl">
        {/* メインコンテンツ */}
        <main className="bg-surface rounded-2xl shadow-card border border-edge p-6 sm:p-8">
          <div className="space-y-6">
            {/* 開発予定セクション */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-ink mb-4 pb-2 border-b border-edge">
                開発予定
              </h2>
              <div className="space-y-4 text-ink">
                <p className="text-base sm:text-lg leading-relaxed">
                  コーヒーを淹れる手順をサポートする機能を開発予定です。
                </p>
                <div className="bg-ground rounded-lg p-4 sm:p-6 border border-edge">
                  <h3 className="text-lg font-semibold text-ink mb-3">基本的な機能概要</h3>
                  <ul className="space-y-2 text-sm sm:text-base">
                    <li className="flex items-start gap-2">
                      <span className="text-spot mt-1">•</span>
                      <span>コーヒーを淹れる手順のガイド表示</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-spot mt-1">•</span>
                      <span>各手順の詳細説明とタイミング</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-spot mt-1">•</span>
                      <span>ストップウォッチ</span>
                    </li>
                  </ul>
                </div>
                <p className="text-sm sm:text-base text-ink-sub italic">
                  ※ 詳細な機能要件は今後追加予定です。
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

