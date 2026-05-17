'use client';

import { MdHome, MdRestartAlt } from 'react-icons/md';

import LoginPage from '@/app/login/page';
import { Loading } from '@/components/Loading';
import { Button, Card, FloatingNav, Switch } from '@/components/ui';
import { useHomeFeatureVisibility } from '@/hooks/useHomeFeatureVisibility';
import { useAuth } from '@/lib/auth';
import { CONFIGURABLE_HOME_FEATURES } from '@/lib/homeFeatures';

export default function HomeVisibilitySettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    hiddenKeys,
    isLoading,
    updateFeatureHidden,
    resetVisibility,
  } = useHomeFeatureVisibility();

  if (authLoading) {
    return <Loading />;
  }

  if (!user) {
    return <LoginPage />;
  }

  const hiddenCount = hiddenKeys.length;

  return (
    <div className="min-h-screen bg-page pt-14 pb-4 sm:pb-6 lg:pb-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <FloatingNav backHref="/settings" />
      <div className="max-w-4xl mx-auto">
        <header className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-ink flex items-center gap-2">
            <MdHome className="h-6 w-6 text-spot" />
            ホーム表示設定
          </h1>
          <p className="mt-2 text-sm text-ink-sub">
            ホーム画面に表示する機能を選びます。その他は再表示の入口として常に表示されます。
          </p>
        </header>

        <main className="flex flex-col gap-4">
          <Card variant="default" className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">表示中の機能</h2>
                <p className="text-sm text-ink-sub">
                  {CONFIGURABLE_HOME_FEATURES.length - hiddenCount} / {CONFIGURABLE_HOME_FEATURES.length} 件を表示中
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetVisibility}
                disabled={isLoading || hiddenCount === 0}
              >
                <MdRestartAlt className="mr-2 h-5 w-5" />
                すべて表示に戻す
              </Button>
            </div>
          </Card>

          <Card variant="default" className="p-6">
            <div className="divide-y divide-edge">
              {CONFIGURABLE_HOME_FEATURES.map((feature) => {
                const isHidden = hiddenKeys.includes(feature.key);

                return (
                  <div
                    key={feature.key}
                    className="flex min-h-[64px] items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-ink">{feature.title}</h2>
                      <p className="mt-1 text-sm text-ink-sub">{feature.description}</p>
                    </div>
                    <Switch
                      aria-label={`${feature.title}をホームに表示`}
                      checked={!isHidden}
                      disabled={isLoading}
                      onChange={(event) => updateFeatureHidden(feature.key, !event.target.checked)}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
