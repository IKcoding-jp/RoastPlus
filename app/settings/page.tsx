'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, signOut } from '@/lib/auth';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAppVersion } from '@/hooks/useAppVersion';
import { Loading } from '@/components/Loading';
import { useToastContext } from '@/components/Toast';
import { PasswordModal } from '@/components/settings/PasswordModal';
import { HiDocumentText, HiShieldCheck, HiLogout, HiMail, HiColorSwatch } from 'react-icons/hi';
import { MdHistory, MdHome } from 'react-icons/md';
import LoginPage from '@/app/login/page';
import { Button, Switch, FloatingNav, Card } from '@/components/ui';
import { VERSION_HISTORY } from '@/data/dev-stories/version-history';
import { getUserData } from '@/lib/firestore';
import { formatConsentDate } from '@/lib/consent';
import { UserConsent } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isEnabled, isLoading: devModeLoading, enableDeveloperMode, disableDeveloperMode } = useDeveloperMode();
  const { showToast } = useToastContext();
  const { version, isUpdateAvailable, isChecking, checkForUpdates, applyUpdate } = useAppVersion();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [userConsent, setUserConsent] = useState<UserConsent | null>(null);
  const { presets, currentTheme } = useAppTheme();
  const currentPreset = presets.find((p) => p.id === currentTheme);

  // 同意日時を取得
  useEffect(() => {
    async function fetchUserConsent() {
      if (!user) return;
      try {
        const userData = await getUserData(user.uid);
        if (userData.userConsent) {
          setUserConsent(userData.userConsent);
        }
      } catch (error) {
        console.error('同意情報の取得に失敗:', error);
        showToast('同意情報の取得に失敗しました。', 'error');
      }
    }
    fetchUserConsent();
  }, [user, showToast]);

  if (authLoading || devModeLoading) {
    return <Loading />;
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleToggleChange = (checked: boolean) => {
    if (checked) {
      // ONにする場合はパスワード入力モーダルを表示
      setShowPasswordModal(true);
    } else {
      // OFFにする場合は即座に無効化
      disableDeveloperMode();
    }
  };

  const handlePasswordSubmit = (password: string): boolean => {
    const success = enableDeveloperMode(password);
    if (success) {
      setShowPasswordModal(false);
    }
    return success;
  };

  const handleCancelPassword = () => {
    setShowPasswordModal(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
      showToast('ログアウトに失敗しました。', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-page pt-14 pb-4 sm:pb-6 lg:pb-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <FloatingNav backHref="/" />
      <div className="max-w-4xl mx-auto">
        <main className="flex flex-col gap-4">
          {/* ホーム表示設定 */}
          <Link href="/settings/home" className="block">
            <Card variant="hoverable" className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-ink mb-2 flex items-center gap-2">
                    <MdHome className="h-5 w-5 text-spot" />
                    ホーム表示設定
                  </h2>
                  <p className="text-sm text-ink-sub">ホームに表示する機能を選ぶ</p>
                </div>
                <span className="text-ink-muted text-xl">&gt;</span>
              </div>
            </Card>
          </Link>

          {/* テーマ設定 */}
          <Link href="/settings/theme" className="block">
            <Card variant="hoverable" className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-ink mb-2 flex items-center gap-2">
                    <HiColorSwatch className="h-5 w-5 text-spot" />
                    テーマ設定
                  </h2>
                  <p className="text-sm text-ink-sub">現在: {currentPreset?.name ?? 'デフォルト'}</p>
                </div>
                <span className="text-ink-muted text-xl">&gt;</span>
              </div>
            </Card>
          </Link>

          {/* 開発者モードセクション */}
          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-ink mb-2">開発者モード</h2>
                <p className="text-sm text-ink-sub">開発者向けの機能を有効化します</p>
              </div>
              <div className="ml-4">
                <Switch
                  size="lg"
                  checked={isEnabled}
                  onChange={(e) => handleToggleChange(e.target.checked)}
                  aria-label="開発者モードを切り替える"
                />
              </div>
            </div>
          </Card>

          {/* Developer Design Lab（開発者モード有効時のみ表示） */}
          {isEnabled && (
            <Link href="/dev/design-lab" className="block">
              <Card variant="hoverable" className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-ink mb-2 flex items-center gap-2">
                      <HiColorSwatch className="h-5 w-5 text-spot" />
                      Developer Design Lab
                    </h2>
                    <p className="text-sm text-ink-sub">UIカタログ、アニメーション、カラーパレット</p>
                  </div>
                  <span className="text-ink-muted text-xl">&gt;</span>
                </div>
              </Card>
            </Link>
          )}

          {/* アプリバージョンセクション */}
          <Card variant="default" className="p-6">
            <h2 className="text-xl font-semibold text-ink mb-4">アプリバージョン</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink-sub mb-1">現在のバージョン</p>
                  <p className="text-lg font-medium text-ink">{version || '読み込み中...'}</p>
                </div>
                {isUpdateAvailable && (
                  <div className="ml-4">
                    <span className="inline-flex items-center text-sm font-semibold text-spot">更新あり</span>
                  </div>
                )}
              </div>
              {isUpdateAvailable && (
                <div className="pt-4 border-t border-edge">
                  <p className="text-sm text-ink-sub mb-3">新しいバージョンが利用可能です。更新を適用してください。</p>
                  <Button variant="primary" size="md" onClick={applyUpdate}>
                    更新する
                  </Button>
                </div>
              )}
              {!isUpdateAvailable && process.env.NODE_ENV === 'production' && (
                <div className="pt-4 border-t border-edge">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={checkForUpdates}
                    disabled={isChecking}
                    loading={isChecking}
                  >
                    {isChecking ? '確認中...' : '更新を確認'}
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* 更新履歴セクション */}
          <Link href="/changelog" className="block">
            <Card variant="hoverable" className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-ink mb-2 flex items-center gap-2">
                    <MdHistory className="h-5 w-5 text-spot" />
                    更新履歴
                  </h2>
                  <p className="text-sm text-ink-sub">アプリの更新内容を確認する</p>
                  <p className="text-xs text-ink-muted mt-1">
                    最新: v{VERSION_HISTORY[0]?.version} ({VERSION_HISTORY[0]?.date})
                  </p>
                </div>
                <span className="text-ink-muted text-xl">&gt;</span>
              </div>
            </Card>
          </Link>

          {/* 法的情報セクション */}
          <Card variant="default" className="p-6">
            <h2 className="text-xl font-semibold text-ink mb-4 flex items-center gap-2">
              <HiDocumentText className="h-5 w-5 text-ink-sub" />
              法的情報
            </h2>
            <div className="space-y-4">
              {/* 利用規約リンク */}
              <Link
                href="/terms"
                className="flex items-center justify-between p-4 rounded-lg border border-edge hover:bg-ground transition-colors"
              >
                <div className="flex items-center gap-3">
                  <HiDocumentText className="h-5 w-5 text-spot" />
                  <span className="text-ink font-medium">利用規約</span>
                </div>
                <span className="text-ink-muted">&gt;</span>
              </Link>

              {/* プライバシーポリシーリンク */}
              <Link
                href="/privacy-policy"
                className="flex items-center justify-between p-4 rounded-lg border border-edge hover:bg-ground transition-colors"
              >
                <div className="flex items-center gap-3">
                  <HiShieldCheck className="h-5 w-5 text-spot" />
                  <span className="text-ink font-medium">プライバシーポリシー</span>
                </div>
                <span className="text-ink-muted">&gt;</span>
              </Link>

              {/* お問い合わせリンク */}
              <Link
                href="/contact"
                className="flex items-center justify-between p-4 rounded-lg border border-edge hover:bg-ground transition-colors"
              >
                <div className="flex items-center gap-3">
                  <HiMail className="h-5 w-5 text-spot" />
                  <span className="text-ink font-medium">お問い合わせ</span>
                </div>
                <span className="text-ink-muted">&gt;</span>
              </Link>

              {/* 同意日時 */}
              {userConsent && userConsent.hasAgreed && (
                <div className="pt-4 border-t border-edge">
                  <p className="text-sm text-ink-muted">同意日: {formatConsentDate(userConsent.agreedAt)}</p>
                  <p className="text-xs text-ink-muted mt-1">
                    利用規約 v{userConsent.agreedTermsVersion} / プライバシーポリシー v
                    {userConsent.agreedPrivacyVersion}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* アカウントセクション */}
          <Card variant="default" className="p-6">
            <h2 className="text-xl font-semibold text-ink mb-4 flex items-center gap-2">
              <HiLogout className="h-5 w-5 text-ink-sub" />
              アカウント
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink-sub mb-1">ログイン中のアカウント</p>
                  <p className="text-sm font-medium text-ink">{user.email || 'メールアドレスなし'}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-edge">
                <Button variant="danger" size="md" fullWidth onClick={handleLogout}>
                  <HiLogout className="h-5 w-5 mr-2" />
                  ログアウト
                </Button>
              </div>
            </div>
          </Card>
        </main>

        {/* パスワード入力モーダル */}
        {showPasswordModal && <PasswordModal onSubmit={handlePasswordSubmit} onCancel={handleCancelPassword} />}
      </div>
    </div>
  );
}
