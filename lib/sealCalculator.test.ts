import { describe, expect, it } from 'vitest';

import {
  SEAL_CALCULATOR_RULES,
  calculateBestBeforeYearMonth,
  calculateRequiredSealSheets,
  formatYearMonthLabel,
  parsePremixBagCount,
} from './sealCalculator';

describe('sealCalculator', () => {
  it('プレミックス袋数から必要なシールシート数を計算する', () => {
    expect(calculateRequiredSealSheets(10)).toBe(29);
    expect(calculateRequiredSealSheets(1)).toBe(5);
  });

  it('計算ルールを分かりやすい定数として公開する', () => {
    expect(SEAL_CALCULATOR_RULES).toEqual({
      premixBagGrams: 500,
      roastedYieldRate: 0.8,
      gramsPerPack: 8.5,
      labelsPerSheet: 18,
      extraSheets: 2,
      shelfLifeMonths: 10,
    });
  });

  it('製造月の10か月後を賞味期限年月として返す', () => {
    expect(calculateBestBeforeYearMonth('2026-05')).toBe('2027-03');
    expect(calculateBestBeforeYearMonth('2026-12')).toBe('2027-10');
  });

  it('年月を日のない日本語ラベルにする', () => {
    expect(formatYearMonthLabel('2027-03')).toBe('2027年3月');
  });

  it('空、0、マイナス、不正な数値を袋数として扱わない', () => {
    expect(parsePremixBagCount('')).toBeNull();
    expect(parsePremixBagCount('0')).toBeNull();
    expect(parsePremixBagCount('-1')).toBeNull();
    expect(parsePremixBagCount('abc')).toBeNull();
  });

  it('小数の袋数はそのまま扱える', () => {
    expect(parsePremixBagCount('2.5')).toBe(2.5);
    expect(calculateRequiredSealSheets(2.5)).toBe(9);
  });
});
