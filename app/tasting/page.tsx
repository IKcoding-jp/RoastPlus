'use client';

import { useEffect, useRef, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useAppData } from '@/hooks/useAppData';
import { TastingSessionList } from '@/components/TastingSessionList';
import { TastingSessionDetail } from '@/components/TastingSessionDetail';
import { TastingRecordForm } from '@/components/TastingRecordForm';
import { TastingSessionForm } from '@/components/TastingSessionForm';
import { Loading } from '@/components/Loading';
import type { TastingSession, TastingRecord } from '@/types';
import { HiPlus } from 'react-icons/hi';
import { useToastContext } from '@/components/Toast';
import { Button, IconButton, Card, FloatingNav } from '@/components/ui';

function TastingPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { data, updateData, isLoading } = useAppData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasRedirected = useRef(false);
  const [isRedirectingAfterDelete, setIsRedirectingAfterDelete] = useState(false);
  const { showToast } = useToastContext();

  // クエリパラメータからIDを取得
  const sessionId = searchParams?.get('sessionId');
  const recordId = searchParams?.get('recordId');
  const isEditSession = searchParams?.get('edit') === 'true';

  // 未認証時にログインページにリダイレクト
  useEffect(() => {
    if (!authLoading && !user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push('/login?returnUrl=/tasting');
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
  const tastingRecords = Array.isArray(data.tastingRecords) ? data.tastingRecords : [];

  // セッション編集モード
  if (sessionId && isEditSession) {
    const session = tastingSessions.find((s) => s.id === sessionId);
    if (!session) {
      if (isRedirectingAfterDelete) {
        return <Loading />;
      }

      return (
        <div className="min-h-screen py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 bg-page">
          <div className="max-w-2xl mx-auto">
            <Card className="p-6 text-center">
              <p className="mb-4 text-ink-sub">セッションが見つかりません</p>
              <Link href="/tasting" className="text-spot hover:underline">
                一覧に戻る
              </Link>
            </Card>
          </div>
        </div>
      );
    }

    const handleSave = (updatedSession: TastingSession) => {
      const updatedSessions = tastingSessions.map((s) =>
        s.id === sessionId ? { ...updatedSession, userId: user.uid } : s
      );
      showToast('セッションを更新しました', 'success');
      router.push('/tasting');
      Promise.resolve(
        updateData({
          ...data,
          tastingSessions: updatedSessions,
        })
      ).catch((error) => {
        console.error('Failed to update session:', error);
        showToast('セッションの更新に失敗しました', 'error');
      });
    };

    const handleDelete = (id: string) => {
      const confirmDelete = window.confirm('このセッションを削除しますか？この操作は取り消せません。');
      if (!confirmDelete) return;

      // セッションに関連する記録も削除
      const updatedRecords = tastingRecords.filter((r) => r.sessionId !== id);
      const updatedSessions = tastingSessions.filter((s) => s.id !== id);
      setIsRedirectingAfterDelete(true);
      router.push('/tasting');
      Promise.resolve(
        updateData({
          ...data,
          tastingSessions: updatedSessions,
          tastingRecords: updatedRecords,
        })
      ).catch((error) => {
        console.error('Failed to delete session:', error);
        setIsRedirectingAfterDelete(false);
        showToast('セッションの削除に失敗しました', 'error');
      });
    };

    const handleCancel = () => {
      router.push('/tasting');
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-14 pb-6 sm:pb-8 px-4 sm:px-6 bg-page">
        <FloatingNav backHref="/tasting" />
        <div className="max-w-lg mx-auto w-full">
          <main>
            <TastingSessionForm session={session} onSave={handleSave} onCancel={handleCancel} onDelete={handleDelete} />
          </main>
        </div>
      </div>
    );
  }

  // 記録詳細/編集モード
  if (recordId) {
    const record = tastingRecords.find((r) => r.id === recordId);
    if (!record) {
      if (isRedirectingAfterDelete) {
        return <Loading />;
      }

      return (
        <div className="min-h-screen py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 bg-page">
          <div className="max-w-2xl mx-auto">
            <Card className="p-6 text-center">
              <p className="mb-4 text-ink-sub">記録が見つかりません</p>
              <Link href="/tasting" className="text-spot hover:underline">
                一覧に戻る
              </Link>
            </Card>
          </div>
        </div>
      );
    }

    const handleSave = (updatedRecord: TastingRecord) => {
      const updatedRecords = tastingRecords.map((r) =>
        r.id === recordId ? { ...updatedRecord, userId: user.uid } : r
      );
      showToast('記録を保存しました', 'success');
      router.push('/tasting');
      Promise.resolve(
        updateData({
          ...data,
          tastingRecords: updatedRecords,
        })
      ).catch((error) => {
        console.error('Failed to save record:', error);
        showToast('記録の保存に失敗しました', 'error');
      });
    };

    const handleDelete = (id: string) => {
      const confirmDelete = window.confirm('この記録を削除しますか？');
      if (!confirmDelete) return;

      const updatedRecords = tastingRecords.filter((r) => r.id !== id);
      setIsRedirectingAfterDelete(true);
      showToast('記録を削除しました', 'success');
      router.push('/tasting');
      Promise.resolve(
        updateData({
          ...data,
          tastingRecords: updatedRecords,
        })
      ).catch((error) => {
        console.error('Failed to delete record:', error);
        setIsRedirectingAfterDelete(false);
        showToast('記録の削除に失敗しました', 'error');
      });
    };

    const handleCancel = () => {
      router.push('/tasting');
    };

    return (
      <div className="min-h-screen pt-14 pb-6 sm:pb-8 px-4 sm:px-6 bg-page">
        <FloatingNav backHref="/tasting" />
        <div className="max-w-lg mx-auto space-y-6">
          <main>
            <TastingRecordForm
              record={record}
              data={data}
              onSave={handleSave}
              onDelete={handleDelete}
              onCancel={handleCancel}
            />
          </main>
        </div>
      </div>
    );
  }

  // セッション詳細モード（新規記録作成含む）
  if (sessionId) {
    const session = tastingSessions.find((s) => s.id === sessionId);
    if (!session) {
      if (isRedirectingAfterDelete) {
        return <Loading />;
      }

      return (
        <div className="min-h-screen py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 bg-page">
          <div className="max-w-4xl mx-auto">
            <Card className="p-6 text-center">
              <p className="mb-4 text-ink-sub">セッションが見つかりません</p>
              <Link href="/tasting" className="text-spot hover:underline">
                一覧に戻る
              </Link>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen pt-14 pb-6 sm:pb-8 px-4 sm:px-6 bg-page">
        <FloatingNav backHref="/tasting" />
        <div className="max-w-lg mx-auto space-y-6">
          <main>
            <TastingSessionDetail session={session} data={data} onUpdate={updateData} />
          </main>
        </div>
      </div>
    );
  }

  // 一覧表示（デフォルト）
  const isEmpty = tastingSessions.length === 0;

  return (
    <div className="min-h-screen flex flex-col px-4 sm:px-6 lg:px-8 pt-14 pb-2 sm:pb-3 lg:pb-4 bg-page">
      <FloatingNav
        backHref="/"
        right={
          !isEmpty ? (
            <>
              <div id="sample-data-button-container" className="hidden sm:block min-w-[1px]"></div>
              <div id="filter-button-container" className="hidden sm:block min-w-[1px]"></div>
              <div id="filter-button-container-mobile" className="sm:hidden min-w-[1px]"></div>
              <div className="hidden sm:block">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/tasting/sessions/new')}
                  aria-label="新規セッション作成"
                  className="!px-3 !py-2 gap-1.5 shadow-md"
                >
                  <HiPlus size={20} />
                  <span className="text-xs sm:text-sm whitespace-nowrap">セッションを作成</span>
                </Button>
              </div>
              <div className="sm:hidden">
                <IconButton
                  variant="primary"
                  onClick={() => router.push('/tasting/sessions/new')}
                  aria-label="新規セッション作成"
                >
                  <HiPlus size={22} />
                </IconButton>
              </div>
            </>
          ) : undefined
        }
      />
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0">
        <main>
          <TastingSessionList
            data={data}
            onUpdate={updateData}
            sampleButtonContainerId="sample-data-button-container"
            filterButtonContainerId="filter-button-container"
            filterButtonContainerIdMobile="filter-button-container-mobile"
          />
        </main>
      </div>
    </div>
  );
}

export default function TastingPage() {
  return (
    <Suspense fallback={<Loading />}>
      <TastingPageContent />
    </Suspense>
  );
}
