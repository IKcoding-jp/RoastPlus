'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useAppData } from '@/hooks/useAppData';
import { TastingSessionForm } from '@/components/TastingSessionForm';
import { Loading } from '@/components/Loading';
import type { TastingSession } from '@/types';
import { useToastContext } from '@/components/Toast';
import { FloatingNav } from '@/components/ui';

export default function NewTastingSessionPage() {
  const { user, loading: authLoading } = useAuth();
  const { data, updateData, isLoading } = useAppData();
  const router = useRouter();
  const { showToast } = useToastContext();
  const hasRedirected = useRef(false);

  // 未認証時にログインページにリダイレクト
  useEffect(() => {
    if (!authLoading && !user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push('/login?returnUrl=/tasting/sessions/new');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return <Loading />;
  }

  // 未認証の場合はリダイレクト中なので何も表示しない
  if (!user) {
    return null;
  }

  if (isLoading) {
    return <Loading message="データを読み込み中..." />;
  }

  const tastingSessions = Array.isArray(data.tastingSessions) ? data.tastingSessions : [];

  const handleSave = (session: TastingSession) => {
    const newSession: TastingSession = {
      ...session,
      userId: user.uid,
    };

    const updatedSessions = [...tastingSessions, newSession];
    // 楽観的UI: 先に遷移し、バックグラウンドで保存する
    // 静的エクスポート時には動的ルートが存在しないため、一覧ページに遷移する
    router.push('/tasting');
    Promise.resolve(
      updateData({
        ...data,
        tastingSessions: updatedSessions,
      })
    ).catch((error) => {
      console.error('Failed to save tasting session:', error);
      showToast('セッションの保存に失敗しました。通信を確認してもう一度お試しください。', 'error');
    });
  };

  const handleCancel = () => {
    router.push('/tasting');
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 bg-page">
      <FloatingNav backHref="/tasting" />
      <div className="min-h-screen max-w-lg mx-auto flex items-center py-16">
        <main className="w-full">
          <TastingSessionForm session={null} onSave={handleSave} onCancel={handleCancel} />
        </main>
      </div>
    </div>
  );
}
