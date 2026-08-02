import { formatSecondsAsShortRemaining } from '@/lib/dateUtils';
import type { DripStep } from './types';

/** 次ステップ予告の直前強調に切り替わる残り秒数（カウントダウン音と同じタイミング） */
export const NEXT_STEP_SOON_THRESHOLD_SEC = 3;

/** ステップ見出しを主見出しと補足（括弧内）に分解した結果 */
export interface SplitStepTitle {
  mainTitle: string;
  detail?: string;
}

/**
 * ステップ見出しを主見出しと括弧内の補足に分解する。
 * 例: '濃度調整（60%）' → { mainTitle: '濃度調整', detail: '60%' }
 */
export function splitStepTitle(title: string): SplitStepTitle {
  const match = title.match(/^(.+?)[（(](.+)[）)]$/);

  if (!match) {
    return { mainTitle: title };
  }

  return { mainTitle: match[1], detail: match[2] };
}

/** 実行画面の最下部に出す「次の1手」予告 */
export interface NextStepPreview {
  /** 行頭の小さなラベル。手動モードの最終ステップでは付けない */
  leadLabel?: string;
  /** 本文（例: '濃度調整 → 120g'） */
  body: string;
  /** 残り時間（例: 'あと 20秒'）。手動モードでは時間軸がないため付けない */
  remainingText?: string;
}

interface BuildNextStepPreviewParams {
  nextStep: DripStep | null | undefined;
  currentTime: number;
  totalDurationSec: number;
  isManualMode: boolean;
}

/**
 * 次ステップ（なければ完了まで）の予告を組み立てる。
 * 自動モードは残り秒付き、手動モードは時間軸がないため見出しと目標湯量のみ。
 */
export function buildNextStepPreview({
  nextStep,
  currentTime,
  totalDurationSec,
  isManualMode,
}: BuildNextStepPreviewParams): NextStepPreview {
  if (!nextStep) {
    if (isManualMode) {
      return { body: 'これが最後の手順' };
    }

    const remaining = Math.max(0, totalDurationSec - currentTime);
    return {
      leadLabel: '残り',
      body: '完了まで',
      remainingText: `あと ${formatSecondsAsShortRemaining(remaining)}`,
    };
  }

  const { mainTitle } = splitStepTitle(nextStep.title);
  const body = nextStep.targetTotalWater ? `${mainTitle} → ${nextStep.targetTotalWater}g` : mainTitle;

  if (isManualMode) {
    return { leadLabel: '次', body };
  }

  const remaining = Math.max(0, nextStep.startTimeSec - currentTime);
  return {
    leadLabel: '次',
    body,
    remainingText: `あと ${formatSecondsAsShortRemaining(remaining)}`,
  };
}

/** 次ステップ直前アラート（画面外周のリング＋せり上がる予告バー）の表示内容 */
export interface NextStepAlert {
  /** 次ステップの主見出し（例: '濃度調整'） */
  title: string;
  /** 次ステップの目標総湯量。持たないステップでは undefined */
  targetTotalWater?: number;
  /** 残り秒（3 → 2 → 1） */
  remainingSec: number;
}

interface BuildNextStepAlertParams {
  nextStep: DripStep | null | undefined;
  currentTime: number;
  isManualMode: boolean;
  isRunning: boolean;
}

/**
 * 次ステップ直前アラートを出すべきか判定し、出すなら表示内容を返す。
 * カウントダウン音と発火条件を揃えるため、自動モードで次ステップがあるときだけ・タイマー実行中だけ出す。
 */
export function buildNextStepAlert({
  nextStep,
  currentTime,
  isManualMode,
  isRunning,
}: BuildNextStepAlertParams): NextStepAlert | null {
  if (isManualMode || !isRunning || !nextStep) {
    return null;
  }

  const remainingSec = nextStep.startTimeSec - currentTime;
  if (remainingSec < 0 || remainingSec > NEXT_STEP_SOON_THRESHOLD_SEC) {
    return null;
  }

  const { mainTitle } = splitStepTitle(nextStep.title);
  return {
    title: mainTitle,
    targetTotalWater: nextStep.targetTotalWater,
    remainingSec,
  };
}

interface RunnerProgressParams {
  isManualMode: boolean;
  currentTime: number;
  totalDurationSec: number;
  currentStepIndex: number;
  totalSteps: number;
}

/**
 * 実行画面上部の進捗バーの比率（0〜1）を求める。
 * 自動モードは経過時間基準、手動モードは時間軸がないためステップ数基準。
 */
export function calcRunnerProgressRatio({
  isManualMode,
  currentTime,
  totalDurationSec,
  currentStepIndex,
  totalSteps,
}: RunnerProgressParams): number {
  if (isManualMode) {
    if (totalSteps <= 0) {
      return 0;
    }
    return clampRatio((currentStepIndex + 1) / totalSteps);
  }

  if (totalDurationSec <= 0) {
    return 0;
  }
  return clampRatio(currentTime / totalDurationSec);
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}
