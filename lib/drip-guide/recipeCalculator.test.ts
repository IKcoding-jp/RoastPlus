import { describe, it, expect } from 'vitest';
import { calculateRecipeForServings } from './recipeCalculator';
import type { DripRecipe } from './types';

const baseRecipe: DripRecipe = {
  id: 'recipe-1',
  name: 'テストレシピ',
  beanName: 'エチオピア',
  beanAmountGram: 15,
  totalWaterGram: 250,
  totalDurationSec: 180,
  steps: [
    { id: 'step-1', startTimeSec: 0, title: '蒸らし', description: '蒸らし30秒', targetTotalWater: 30 },
    { id: 'step-2', startTimeSec: 30, title: '1投目', description: '1投目', targetTotalWater: 120 },
    { id: 'step-3', startTimeSec: 90, title: '2投目', description: '2投目', targetTotalWater: 250 },
  ],
};

describe('calculateRecipeForServings', () => {
  it('1人前 → 元のレシピそのまま', () => {
    const result = calculateRecipeForServings(baseRecipe, 1);
    expect(result).toBe(baseRecipe); // 同一オブジェクト参照
  });

  it('2人前 → 豆・湯量2倍', () => {
    const result = calculateRecipeForServings(baseRecipe, 2);
    expect(result.beanAmountGram).toBe(30);
    expect(result.totalWaterGram).toBe(500);
  });

  it('2人前 → 各ステップの目標湯量2倍', () => {
    const result = calculateRecipeForServings(baseRecipe, 2);
    expect(result.steps[0].targetTotalWater).toBe(60);
    expect(result.steps[1].targetTotalWater).toBe(240);
    expect(result.steps[2].targetTotalWater).toBe(500);
  });

  it('3人前', () => {
    const result = calculateRecipeForServings(baseRecipe, 3);
    expect(result.beanAmountGram).toBe(45);
    expect(result.totalWaterGram).toBe(750);
    expect(result.steps[0].targetTotalWater).toBe(90);
  });

  it('targetTotalWaterがundefinedのステップ → undefinedのまま', () => {
    const recipeWithUndefined: DripRecipe = {
      ...baseRecipe,
      steps: [{ id: 'step-1', startTimeSec: 0, title: '蒸らし', description: '蒸らし' }],
    };
    const result = calculateRecipeForServings(recipeWithUndefined, 2);
    expect(result.steps[0].targetTotalWater).toBeUndefined();
  });

  it('元のレシピは変更されない', () => {
    calculateRecipeForServings(baseRecipe, 2);
    expect(baseRecipe.beanAmountGram).toBe(15);
    expect(baseRecipe.totalWaterGram).toBe(250);
    expect(baseRecipe.steps[0].targetTotalWater).toBe(30);
  });

  describe('beanAmountByServings がある非線形スケーリング', () => {
    // BYSN を模した1人前基準レシピ（蒸らし湯=粉量10g、注湯 90/40/20 を累計で表現）
    const bysnLike: DripRecipe = {
      id: 'recipe-bysn-like',
      name: 'BYSN風',
      beanName: 'テスト豆',
      beanAmountGram: 10,
      totalWaterGram: 160,
      totalDurationSec: 180,
      isManualMode: true,
      beanAmountByServings: [10, 20, 25, 35, 40, 45, 50, 55],
      steps: [
        { id: 'prep-1', startTimeSec: -40, title: 'お湯を92度に準備', description: 'ケトル設定' },
        { id: 'step-1', startTimeSec: 0, title: '蒸らし', description: '蒸らし', targetTotalWater: 10 },
        { id: 'step-2', startTimeSec: 20, title: '1投目', description: '1投目', targetTotalWater: 100 },
        { id: 'step-3', startTimeSec: 95, title: '2投目', description: '2投目', targetTotalWater: 140 },
        { id: 'step-4', startTimeSec: 110, title: '3投目', description: '3投目', targetTotalWater: 160 },
      ],
    };

    it('3人前 → 粉25g（線形の30gではない）', () => {
      const result = calculateRecipeForServings(bysnLike, 3);
      expect(result.beanAmountGram).toBe(25);
    });

    it('3人前 → 蒸らし=粉量・注湯は累計 25/295/415/475、準備手順は未指定のまま', () => {
      const result = calculateRecipeForServings(bysnLike, 3);
      expect(result.steps.map((s) => s.targetTotalWater)).toEqual([undefined, 25, 295, 415, 475]);
    });

    it('3人前 → 総湯量は最終注湯ステップの累計と一致する(475)', () => {
      const result = calculateRecipeForServings(bysnLike, 3);
      const lastWater = result.steps[result.steps.length - 1].targetTotalWater;
      expect(result.totalWaterGram).toBe(475);
      expect(result.totalWaterGram).toBe(lastWater);
    });

    it('8人前 → 粉55g・注湯累計 55/775/1095/1255・総湯量1255', () => {
      const result = calculateRecipeForServings(bysnLike, 8);
      expect(result.beanAmountGram).toBe(55);
      expect(result.steps.map((s) => s.targetTotalWater)).toEqual([undefined, 55, 775, 1095, 1255]);
      expect(result.totalWaterGram).toBe(1255);
    });

    it('beanAmountByServings が無いレシピは従来の線形のまま', () => {
      const result = calculateRecipeForServings(baseRecipe, 3);
      expect(result.beanAmountGram).toBe(45); // 15 * 3（線形）
      expect(result.totalWaterGram).toBe(750);
    });
  });
});
