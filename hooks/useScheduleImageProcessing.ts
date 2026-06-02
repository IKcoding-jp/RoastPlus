import { useCallback, useEffect, useState } from 'react';
import { extractScheduleFromImage } from '@/lib/scheduleOCR';
import type { RoastSchedule, TimeLabel } from '@/types';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';
import { useToastContext } from '@/components/Toast';

interface UseScheduleImageProcessingProps {
  selectedDate: string;
  onSuccess: (timeLabels: TimeLabel[], roastSchedules: RoastSchedule[]) => void;
}

interface ScheduleErrorLike {
  code?: string;
  message?: string;
  details?: unknown;
}

function normalizeError(error: unknown): ScheduleErrorLike & { rawMessage: string } {
  if (typeof error === 'string') {
    return {
      rawMessage: error,
    };
  }

  if (error instanceof Error) {
    const typed = error as Error & ScheduleErrorLike;
    return {
      code: typed.code,
      message: typed.message,
      details: typed.details,
      rawMessage: typed.message,
    };
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message =
      typeof record.message === 'string' && record.message.trim().length > 0
        ? record.message
        : typeof record.error === 'string'
          ? record.error
          : JSON.stringify(record, null, 2);

    return {
      code: typeof record.code === 'string' ? record.code : undefined,
      message,
      details: record.details,
      rawMessage: message,
    };
  }

  return {
    rawMessage: '',
  };
}

export function useScheduleImageProcessing({ selectedDate, onSuccess }: UseScheduleImageProcessingProps) {
  const { isEnabled: isDeveloperMode } = useDeveloperMode();
  const { showToast } = useToastContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!currentFile) {
      setImagePreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(currentFile);
  }, [currentFile]);

  const handleImageFile = useCallback(
    async (file: File) => {
      setCurrentFile(file);
      setIsProcessing(true);
      setError(null);

      try {
        const { timeLabels, roastSchedules } = await extractScheduleFromImage(file, selectedDate);
        onSuccess(timeLabels, roastSchedules);
      } catch (error: unknown) {
        const normalized = normalizeError(error);
        const code = normalized.code ?? '';
        const message = normalized.message ?? '';
        const details = normalized.details;

        console.error('OCR処理エラー:', error);
        console.error('エラー詳細:', {
          code,
          message,
          details,
          raw: error,
        });

        let errorMessage = 'スケジュールの読み取りに失敗しました。画像を確認して再度お試しください。';
        let errorDetails = normalized.rawMessage;

        if (
          code === 'unauthenticated' ||
          code.endsWith('/unauthenticated') ||
          message.toLowerCase().includes('unauthenticated')
        ) {
          errorMessage = '認証が必要です。再度ログインしてください。';
        } else if (
          code === 'functions/not-found' ||
          code === 'not-found' ||
          message.includes('not-found') ||
          message.includes('404')
        ) {
          errorMessage = 'Firebase Functionsが見つかりません。デプロイを確認してください。';
          errorDetails = 'ocrScheduleFromImage関数がデプロイされているか確認してください。';
        } else if (code === 'invalid-argument') {
          errorMessage = '画像データが無効です。';
        } else if (code === 'failed-precondition' || message.includes('OPENAI_API_KEY')) {
          errorMessage = 'サーバー設定エラーが発生しました。';
          errorDetails = 'OPENAI_API_KEYが設定されていない可能性があります。';
        } else if (message.includes('OpenAI API')) {
          errorMessage = message;
        } else if (code === 'internal' || message.includes('internal') || message.includes('サーバー')) {
          errorMessage = 'サーバーエラーが発生しました。';
          if (!message || message.includes('サーバーエラー')) {
            errorDetails =
              'Firebase Functionsのログを確認してください。環境変数（OPENAI_API_KEY）が設定されているか確認してください。';
          }
        } else if (message) {
          errorMessage = message;
        } else if (code) {
          errorMessage = `エラーが発生しました (${code})`;
        }

        const finalErrorMessage =
          isDeveloperMode && errorDetails ? `${errorMessage}\n\n詳細: ${errorDetails}` : errorMessage;
        setError(finalErrorMessage);
        showToast(errorMessage, 'error');
        setCurrentFile(null);
        setImagePreview(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [isDeveloperMode, onSuccess, selectedDate, showToast]
  );

  const resetState = useCallback(() => {
    setError(null);
    setCurrentFile(null);
    setImagePreview(null);
  }, []);

  return {
    isProcessing,
    error,
    imagePreview,
    handleImageFile,
    resetState,
  };
}
