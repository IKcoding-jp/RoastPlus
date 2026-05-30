import { describe, it, expect } from 'vitest';
import { MOCK_RECIPES } from './mockData';

describe('MOCK_RECIPES アイスコーヒー（急冷式）', () => {
  const ice = MOCK_RECIPES.find((r) => r.id === 'recipe-ice-flash');

  it('レシピが存在する', () => {
    expect(ice).toBeDefined();
  });

  it('豆量20g・総湯量150g・自動モード・デフォルト削除不可', () => {
    expect(ice?.beanAmountGram).toBe(20);
    expect(ice?.totalWaterGram).toBe(150);
    expect(ice?.isManualMode).toBe(false);
    expect(ice?.isDefault).toBe(true);
    expect(ice?.totalDurationSec).toBe(210);
  });

  it('自動モードで最終ステップが表示されるよう、totalDurationSecは最終ステップ開始時刻より後である', () => {
    // useRunnerTimer は next >= totalDurationSec で完了するため、
    // 最終ステップ開始 < totalDurationSec でないと急冷ステップが表示されない
    const lastStepStart = ice?.steps[ice.steps.length - 1].startTimeSec ?? 0;
    expect(ice?.totalDurationSec).toBeGreaterThan(lastStepStart);
  });

  it('5ステップで、注湯の累計湯量が45/90/120/150', () => {
    expect(ice?.steps).toHaveLength(5);
    expect(ice?.steps.map((s) => s.targetTotalWater)).toEqual([45, 90, 120, 150, undefined]);
  });

  it('各ステップの開始時刻が0/30/60/90/150秒', () => {
    expect(ice?.steps.map((s) => s.startTimeSec)).toEqual([0, 30, 60, 90, 150]);
  });

  it('最終ステップは氷で急冷する手順', () => {
    const last = ice?.steps[4];
    expect(last?.title).toContain('急冷');
    expect(last?.targetTotalWater).toBeUndefined();
    expect(last?.description).toContain('氷');
  });
});
