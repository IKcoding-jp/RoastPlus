import { describe, it, expect } from 'vitest';
import { splitStepTitle, buildNextStepPreview, buildNextStepAlert, calcRunnerProgressRatio } from './runnerDisplay';
import type { DripStep } from './types';

const step = (override: Partial<DripStep> = {}): DripStep => ({
  id: 'step-x',
  startTimeSec: 135,
  title: '濃度調整（60%）',
  description: '濃度を調整する注湯です。',
  targetTotalWater: 120,
  ...override,
});

describe('splitStepTitle', () => {
  it('括弧付きの見出しを主見出しと補足に分ける', () => {
    expect(splitStepTitle('濃度調整（60%）')).toEqual({ mainTitle: '濃度調整', detail: '60%' });
    expect(splitStepTitle('蒸らし(1投目)')).toEqual({ mainTitle: '蒸らし', detail: '1投目' });
  });

  it('括弧がない見出しはそのまま主見出しにする', () => {
    expect(splitStepTitle('4投目／仕上げ')).toEqual({ mainTitle: '4投目／仕上げ' });
  });
});

describe('buildNextStepPreview', () => {
  describe('自動モード', () => {
    it('次ステップの主見出し・目標湯量・残り秒を返す', () => {
      const preview = buildNextStepPreview({
        nextStep: step(),
        currentTime: 115,
        totalDurationSec: 210,
        isManualMode: false,
      });

      expect(preview.leadLabel).toBe('次');
      expect(preview.body).toBe('濃度調整 → 120g');
      expect(preview.remainingText).toBe('あと 20秒');
    });

    it('残り3秒以内でも予告行の中身は同じ書式のまま（強調は NextStepAlert が担う）', () => {
      const preview = buildNextStepPreview({
        nextStep: step(),
        currentTime: 132,
        totalDurationSec: 210,
        isManualMode: false,
      });

      expect(preview.remainingText).toBe('あと 3秒');
    });

    it('60秒以上の残りはM:SS形式で表す', () => {
      const preview = buildNextStepPreview({
        nextStep: step({ startTimeSec: 200 }),
        currentTime: 120,
        totalDurationSec: 210,
        isManualMode: false,
      });

      expect(preview.remainingText).toBe('あと 1:20');
    });

    it('目標湯量がないステップは見出しだけにする', () => {
      const preview = buildNextStepPreview({
        nextStep: step({ title: '落ち切り待ち', targetTotalWater: undefined }),
        currentTime: 130,
        totalDurationSec: 210,
        isManualMode: false,
      });

      expect(preview.body).toBe('落ち切り待ち');
    });

    it('最終ステップでは完了までの残りを返す', () => {
      const preview = buildNextStepPreview({
        nextStep: null,
        currentTime: 165,
        totalDurationSec: 210,
        isManualMode: false,
      });

      expect(preview.leadLabel).toBe('残り');
      expect(preview.body).toBe('完了まで');
      expect(preview.remainingText).toBe('あと 45秒');
    });

    it('残り時間が負にならないよう0秒で止める', () => {
      const preview = buildNextStepPreview({
        nextStep: null,
        currentTime: 250,
        totalDurationSec: 210,
        isManualMode: false,
      });

      expect(preview.remainingText).toBe('あと 0秒');
    });
  });

  describe('手動モード', () => {
    it('残り秒を付けず、見出しと目標湯量だけ返す', () => {
      const preview = buildNextStepPreview({
        nextStep: step({ title: '1投目', targetTotalWater: 90 }),
        currentTime: 0,
        totalDurationSec: 180,
        isManualMode: true,
      });

      expect(preview.leadLabel).toBe('次');
      expect(preview.body).toBe('1投目 → 90g');
      expect(preview.remainingText).toBeUndefined();
    });

    it('最終ステップでは最後の手順である旨を返す', () => {
      const preview = buildNextStepPreview({
        nextStep: null,
        currentTime: 0,
        totalDurationSec: 180,
        isManualMode: true,
      });

      expect(preview.leadLabel).toBeUndefined();
      expect(preview.body).toBe('これが最後の手順');
      expect(preview.remainingText).toBeUndefined();
    });
  });
});

describe('buildNextStepAlert', () => {
  const params = {
    nextStep: step(),
    currentTime: 133,
    isManualMode: false,
    isRunning: true,
  };

  it('残り3秒以内なら次ステップの見出し・目標湯量・残り秒を返す', () => {
    expect(buildNextStepAlert({ ...params, currentTime: 132 })).toEqual({
      title: '濃度調整',
      targetTotalWater: 120,
      remainingSec: 3,
    });
    expect(buildNextStepAlert({ ...params, currentTime: 134 })?.remainingSec).toBe(1);
    expect(buildNextStepAlert({ ...params, currentTime: 135 })?.remainingSec).toBe(0);
  });

  it('残り4秒以上では出さない', () => {
    expect(buildNextStepAlert({ ...params, currentTime: 131 })).toBeNull();
  });

  it('タイマー停止中は出さない', () => {
    expect(buildNextStepAlert({ ...params, currentTime: 132, isRunning: false })).toBeNull();
  });

  it('手動モードでは出さない', () => {
    expect(buildNextStepAlert({ ...params, currentTime: 132, isManualMode: true })).toBeNull();
  });

  it('次ステップがない（最終ステップ）ときは出さない', () => {
    expect(buildNextStepAlert({ ...params, nextStep: null })).toBeNull();
  });

  it('開始時刻を過ぎたステップでは出さない', () => {
    expect(buildNextStepAlert({ ...params, currentTime: 136 })).toBeNull();
  });

  it('目標湯量を持たないステップでは湯量を省く', () => {
    const alert = buildNextStepAlert({
      ...params,
      nextStep: step({ title: '落ち切り待ち', targetTotalWater: undefined }),
      currentTime: 133,
    });

    expect(alert).toEqual({ title: '落ち切り待ち', targetTotalWater: undefined, remainingSec: 2 });
  });
});

describe('calcRunnerProgressRatio', () => {
  it('自動モードは経過時間の比率を返す', () => {
    expect(
      calcRunnerProgressRatio({
        isManualMode: false,
        currentTime: 105,
        totalDurationSec: 210,
        currentStepIndex: 2,
        totalSteps: 5,
      })
    ).toBeCloseTo(0.5);
  });

  it('手動モードはステップ数の比率を返す', () => {
    expect(
      calcRunnerProgressRatio({
        isManualMode: true,
        currentTime: 0,
        totalDurationSec: 180,
        currentStepIndex: 3,
        totalSteps: 8,
      })
    ).toBeCloseTo(0.5);
  });

  it('0〜1の範囲に収める', () => {
    expect(
      calcRunnerProgressRatio({
        isManualMode: false,
        currentTime: 300,
        totalDurationSec: 210,
        currentStepIndex: 4,
        totalSteps: 5,
      })
    ).toBe(1);

    expect(
      calcRunnerProgressRatio({
        isManualMode: true,
        currentTime: 0,
        totalDurationSec: 180,
        currentStepIndex: -1,
        totalSteps: 5,
      })
    ).toBe(0);
  });

  it('総時間・総ステップ数が0なら0を返す', () => {
    expect(
      calcRunnerProgressRatio({
        isManualMode: false,
        currentTime: 10,
        totalDurationSec: 0,
        currentStepIndex: 0,
        totalSteps: 0,
      })
    ).toBe(0);

    expect(
      calcRunnerProgressRatio({
        isManualMode: true,
        currentTime: 10,
        totalDurationSec: 180,
        currentStepIndex: 0,
        totalSteps: 0,
      })
    ).toBe(0);
  });
});
