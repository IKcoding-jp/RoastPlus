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

  const handleSave = async (session: TastingSession) => {
    const newSession: TastingSession = {
      ...session,
      userId: user.uid,
    };

    const next = {
      ...data,
      tastingSessions: [...tastingSessions, newSession],
    };

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      // オンライン: 保存成功を待ってから遷移。失敗時はフォームを残して再入力できるようにする。
      try {
        await updateData(next);
        router.push('/tasting');
      } catch (error) {
        console.error('Failed to save tasting session:', error);
        showToast('セッションの保存に失敗しました。もう一度お試しください。', 'error');
      }
    } else {
      // オフライン: 書き込みはローカルキューに入り、接続復帰時に自動同期される。遷移してよい。
      router.push('/tasting');
      Promise.resolve(updateData(next)).catch((error) => {
        console.error('Failed to save tasting session:', error);
        showToast('セッションの保存に失敗しました。通信を確認してください。', 'error');
      });
    }
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
