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
    expect(ice?.totalDurationSec).toBe(150);
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

  it('各ステップの開始時刻が0/30/60/90/120秒', () => {
    expect(ice?.steps.map((s) => s.startTimeSec)).toEqual([0, 30, 60, 90, 120]);
  });

  it('最終ステップは氷で急冷する手順', () => {
    const last = ice?.steps[4];
    expect(last?.title).toContain('急冷');
    expect(last?.targetTotalWater).toBeUndefined();
    expect(last?.description).toContain('氷');
  });
});

describe('MOCK_RECIPES BYSN Standard Drip', () => {
  const bysn = MOCK_RECIPES.find((r) => r.id === 'recipe-001');

  it('レシピが存在し、手動モードのデフォルトレシピ', () => {
    expect(bysn).toBeDefined();
    expect(bysn?.isManualMode).toBe(true);
    expect(bysn?.isDefault).toBe(true);
  });

  it('公式早見表の粉量(1〜8人前)を持つ', () => {
    expect(bysn?.beanAmountByServings).toEqual([10, 20, 25, 35, 40, 45, 50, 55]);
  });

  it('準備4手順＋抽出5手順の計9ステップ', () => {
    expect(bysn?.steps).toHaveLength(9);
  });

  it('先頭4つは準備手順で、湯量を持たない', () => {
    const prep = bysn?.steps.slice(0, 4) ?? [];
    expect(prep.map((s) => s.title)).toEqual([
      'お湯を92度に準備',
      'ペーパーをセット',
      'ドリッパーを温める',
      '粉をセット',
    ]);
    expect(prep.every((s) => s.targetTotalWater === undefined)).toBe(true);
  });

  it('準備手順は蒸らし(0秒)より前にソートされる開始時刻を持つ', () => {
    const prep = bysn?.steps.slice(0, 4) ?? [];
    expect(prep.map((s) => s.startTimeSec)).toEqual([-40, -30, -20, -10]);
  });

  it('抽出ステップの累計湯量は 10/100/140/160（公式どおり）', () => {
    const brewing = bysn?.steps.slice(4) ?? [];
    expect(brewing.map((s) => s.targetTotalWater)).toEqual([10, 100, 140, 160, undefined]);
  });
});
