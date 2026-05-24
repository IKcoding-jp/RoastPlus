/**
 * 共通ヘルパー関数・型定義
 */

// OCR結果とスケジュール抽出結果の型
export interface OCRScheduleResponse {
  timeLabels: import('./types').TimeLabel[];
  roastSchedules: import('./types').RoastSchedule[];
}

// テイスティング分析のリクエスト型定義
export interface TastingAnalysisRequest {
  beanName: string;
  roastLevel: string;
  comments: string[];
  averageScores: {
    bitterness: number;
    acidity: number;
    body: number;
    sweetness: number;
    aroma: number;
  };
}

// テイスティング分析のレスポンス型定義
export interface TastingAnalysisResponse {
  status: 'success' | 'error';
  text: string;
  message?: string;
}

// 定数: 画像サイズの上限
// Base64は元データの約1.33倍になるため、10MB程度の画像を上限とする
export const MAX_BASE64_LENGTH = 14 * 1024 * 1024;

const MAX_TEXT_FIELD_LENGTH = 120;
const MAX_COMMENT_LENGTH = 300;
const MAX_COMMENT_COUNT = 20;
const VALID_DATA_IMAGE_PATTERN = /^data:image\/(?:jpeg|jpg|png|webp);base64,/i;

const SCORE_LABELS: Record<keyof TastingAnalysisRequest['averageScores'], string> = {
  bitterness: '苦味',
  acidity: '酸味',
  body: 'ボディ',
  sweetness: '甘み',
  aroma: '香り',
};

function readString(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new Error(`${label}は文字列である必要があります`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label}を入力してください`);
  }
  if (trimmed.length > maxLength) {
    throw new Error(`${label}は${maxLength}文字以内にしてください`);
  }

  return trimmed;
}

function readScore(scores: Record<string, unknown>, key: keyof TastingAnalysisRequest['averageScores']): number {
  const value = scores[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 5) {
    throw new Error(`${SCORE_LABELS[key]}は0から5の数値である必要があります`);
  }
  return value;
}

export function validateTastingAnalysisRequest(data: unknown): TastingAnalysisRequest {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('リクエストデータの形式が正しくありません');
  }

  const record = data as Record<string, unknown>;
  const averageScores = record.averageScores;
  if (!averageScores || typeof averageScores !== 'object' || Array.isArray(averageScores)) {
    throw new Error('スコアデータの形式が正しくありません');
  }

  if (!Array.isArray(record.comments)) {
    throw new Error('コメントは配列である必要があります');
  }
  if (record.comments.length > MAX_COMMENT_COUNT) {
    throw new Error(`コメントは${MAX_COMMENT_COUNT}件以内にしてください`);
  }

  const comments = record.comments
    .map((comment) => {
      if (typeof comment !== 'string') {
        throw new Error('コメントは文字列である必要があります');
      }
      return comment.trim();
    })
    .filter(Boolean);

  const tooLongComment = comments.find((comment) => comment.length > MAX_COMMENT_LENGTH);
  if (tooLongComment) {
    throw new Error(`コメントは1件あたり${MAX_COMMENT_LENGTH}文字以内にしてください`);
  }

  const scores = averageScores as Record<string, unknown>;
  return {
    beanName: readString(record.beanName, '銘柄', MAX_TEXT_FIELD_LENGTH),
    roastLevel: readString(record.roastLevel, '焙煎度', MAX_TEXT_FIELD_LENGTH),
    comments,
    averageScores: {
      bitterness: readScore(scores, 'bitterness'),
      acidity: readScore(scores, 'acidity'),
      body: readScore(scores, 'body'),
      sweetness: readScore(scores, 'sweetness'),
      aroma: readScore(scores, 'aroma'),
    },
  };
}

export function normalizeOCRImageBase64(data: unknown): string {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('リクエストデータの形式が正しくありません');
  }

  const imageBase64 = (data as Record<string, unknown>).imageBase64;
  if (!imageBase64) {
    throw new Error('画像データが必要です');
  }
  if (typeof imageBase64 !== 'string') {
    throw new Error('画像データはBase64文字列である必要があります');
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    throw new Error('画像サイズが大きすぎます。10MB以下の画像をアップロードしてください。');
  }
  if (imageBase64.startsWith('data:') && !VALID_DATA_IMAGE_PATTERN.test(imageBase64)) {
    throw new Error('画像データの形式が正しくありません');
  }

  return imageBase64.startsWith('data:image/') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
}

/**
 * 詳細なエラーログを出力するヘルパー関数
 */
export function logDetailedError(tag: string, error: unknown, additionalInfo?: Record<string, unknown>): void {
  const errorObj = error as Record<string, unknown>;
  const timestamp = new Date().toISOString();
  const errorType = error?.constructor?.name || 'Unknown';
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const code = errorObj?.code ?? errorObj?.status ?? undefined;

  console.error(`${tag}`, {
    timestamp,
    errorType,
    code,
    message,
    stack,
    ...additionalInfo,
  });
}
