'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

// 脱出ハッチ: 読み込みがこの時間を超えたら再読み込み導線を出す。
// iOS PWAのバックグラウンド復帰後に通信が固まると、Promiseがエラーにもならず
// ローディングが永遠に終わらないことがある（タスクキルでしか復帰できなかった問題）。
export const RELOAD_PROMPT_DELAY_MS = 10_000;

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function Loading({ message = '読み込み中...', fullScreen = true }: LoadingProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setShowReloadPrompt(true);
    }, RELOAD_PROMPT_DELAY_MS);

    return () => clearTimeout(timerId);
  }, []);

  useEffect(() => {
    // ファイル名にスペースがあるため、URLエンコードしてfetchで読み込む
    const loadAnimation = async () => {
      try {
        const response = await fetch('/animations/Loading coffee bean.json');
        if (response.ok) {
          const data = await response.json();
          setAnimationData(data);
        } else {
          console.error('Failed to load Lottie animation');
        }
      } catch (error) {
        console.error('Error loading Lottie animation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnimation();
  }, []);

  const containerClass = fullScreen
    ? 'flex min-h-screen items-center justify-center'
    : 'flex items-center justify-center py-8';

  return (
    <div className={`${containerClass} bg-page`}>
      <div className="text-center">
        <div className="flex justify-center mb-4">
          {isLoading || !animationData ? (
            <div className="w-[200px] h-[200px] flex items-center justify-center">
              <div className="text-ink-muted">読み込み中...</div>
            </div>
          ) : (
            <Lottie animationData={animationData} loop={true} style={{ width: 200, height: 200 }} />
          )}
        </div>
        {message && <div className="text-lg text-gray-600">{message}</div>}
        {showReloadPrompt && (
          <div className="mt-6">
            <p className="mb-3 text-sm text-ink-muted">読み込みに時間がかかっています。</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              再読み込み
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
