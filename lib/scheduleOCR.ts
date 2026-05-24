import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { TimeLabel, RoastSchedule } from '@/types';

// Firebase Functionsのレスポンス型
interface OCRScheduleResponse {
  timeLabels: TimeLabel[];
  roastSchedules: Omit<RoastSchedule, 'date'>[]; // dateはクライアント側で設定
}

/**
 * 画像をBase64エンコードしてFirebase Functionsに送信し、スケジュールを抽出
 */
export async function extractScheduleFromImage(
  imageFile: File,
  selectedDate: string
): Promise<{ timeLabels: TimeLabel[]; roastSchedules: RoastSchedule[] }> {
  // 画像をBase64に変換
  const optimizedImage = await prepareImageForOCR(imageFile);
  const base64 = await fileToBase64(optimizedImage);

  // Firebase Functionsを呼び出し
  const ocrScheduleFromImage = httpsCallable<{ imageBase64: string }, OCRScheduleResponse>(
    functions,
    'ocrScheduleFromImage'
  );

  try {
    const result = await ocrScheduleFromImage({ imageBase64: base64 });
    const data = result.data;

    // dateを設定してRoastScheduleを完成させる
    const roastSchedules: RoastSchedule[] = data.roastSchedules.map((schedule) => ({
      ...schedule,
      date: selectedDate,
    }));

    return {
      timeLabels: data.timeLabels,
      roastSchedules,
    };
  } catch (error: unknown) {
    const scheduleError = error as { code?: string; message?: string; details?: unknown; stack?: string };
    console.error('OCR処理エラー:', error);
    console.error('エラー詳細:', {
      code: scheduleError?.code,
      message: scheduleError?.message,
      details: scheduleError?.details,
      stack: scheduleError?.stack,
    });

    // Firebase Functionsのエラーを適切に処理
    if (scheduleError?.code) {
      // Firebase Functionsのエラーコードをそのまま伝播
      const errorMessage = scheduleError.message || 'スケジュールの読み取りに失敗しました。';
      const newError = new Error(errorMessage) as Error & { code?: string; details?: unknown };
      newError.code = scheduleError.code;
      newError.details = scheduleError.details;
      throw newError;
    }

    // ネットワークエラーやFunctionsが存在しない場合
    if (scheduleError?.message?.includes('not-found') || scheduleError?.message?.includes('404')) {
      const newError = new Error('Firebase Functionsが見つかりません。デプロイを確認してください。') as Error & {
        code?: string;
      };
      newError.code = 'functions/not-found';
      throw newError;
    }

    throw error;
  }
}

/**
 * FileをBase64文字列に変換
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * OCR向けに画像を前処理（明るさ・コントラスト補正 + リサイズ）
 */
async function prepareImageForOCR(file: File): Promise<File> {
  return processImageToReadableOCR(file);
}

async function processImageToReadableOCR(file: File): Promise<File> {
  const img = await loadImage(file);
  const maxSize = 1800;
  const minSize = 1100;
  const maxSide = Math.max(img.naturalWidth, img.naturalHeight);

  let scale = Math.min(1, maxSize / maxSide);
  if (maxSide < minSize) {
    scale = Math.min(1.35, minSize / maxSide);
  }

  const targetWidth = Math.max(1, Math.round(img.naturalWidth * scale));
  const targetHeight = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('OCR前処理用のCanvas作成に失敗しました');
  }

  // OCR向け：高コントラスト化＋白黒化で文字判読を安定化
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = 'grayscale(100%) contrast(150%) brightness(112%)';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  ctx.filter = 'none';

  const sourceData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  enhanceContrastForHandwrittenText(sourceData.data);
  ctx.putImageData(sourceData, 0, 0);

  const blob = await canvasToBlob(canvas, 0.95);

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '_ocr.jpg', {
    type: 'image/jpeg',
  });
}

function enhanceContrastForHandwrittenText(imageData: Uint8ClampedArray): void {
  const contrastGain = 1.45;
  const brightnessGain = 1.05;

  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i] ?? 0;
    const g = imageData[i + 1] ?? 0;
    const b = imageData[i + 2] ?? 0;

    // 白黒化
    let value = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    // 文字判読しやすいよう、コントラストを強める
    const centered = value / 255 - 0.5;
    value = Math.round((centered * contrastGain + 0.5) * 255 * brightnessGain);
    const clamped = Math.min(255, Math.max(0, value));

    // 文字/背景をはっきり分けるため、極端な値は二値化寄りに寄せる
    if (clamped < 70) {
      imageData[i] = 0;
      imageData[i + 1] = 0;
      imageData[i + 2] = 0;
    } else if (clamped > 210) {
      imageData[i] = 255;
      imageData[i + 1] = 255;
      imageData[i + 2] = 255;
    } else {
      imageData[i] = clamped;
      imageData[i + 1] = clamped;
      imageData[i + 2] = clamped;
    }
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像の読み込みに失敗しました'));
    };

    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('OCR画像の再保存に失敗しました'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}
