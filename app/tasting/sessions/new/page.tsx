'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useAppData } from '@/hooks/useAppData';
import { TastingSessionForm } from '@/components/TastingSessionForm';
import { Loading } from '@/components/Loading';
import type { AppData, TastingSession } from '@/types';
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

  const handleSave = async (session: TastingSession) => {
    const newSession: TastingSession = { ...session, userId: user.uid };
    const next: AppData = { ...data, tastingSessions: [...tastingSessions, newSession] };

    // 保存を投げ、結果(成功/失敗)を待つ。ただし一定時間で応答が来なければ
    // (オフライン/到達不能とみなして)ローカルにキュー済みとして楽観的に遷移する。
    const SAVE_WAIT_MS = 4000;
    const savePromise = Promise.resolve(updateData(next)).then(
      () => 'ok' as const,
      (error) => {
        console.error('Failed to save tasting session:', error);
        return 'error' as const;
      }
    );
    const outcome = await Promise.race([
      savePromise,
      new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), SAVE_WAIT_MS)),
    ]);

    if (outcome === 'error') {
      // すぐに失敗した(rules/quota等)。フォームを残して再入力できるようにする。
      showToast('セッションの保存に失敗しました。もう一度お試しください。', 'error');
      return;
    }
    // 'ok'(保存成功) または 'pending'(応答待ち=ローカルにキュー済み)。どちらも遷移してよい。
    router.push('/tasting');
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
