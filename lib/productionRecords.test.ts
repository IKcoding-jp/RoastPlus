import { describe, expect, it } from 'vitest';
import {
  calculateDefectRate,
  calculatePremixBags,
  calculateUsableGreenGram,
  isValidProductionMonth,
  isValidWorkDate,
} from './productionRecords';

describe('isValidProductionMonth', () => {
  it('accepts real yyyy-MM months only', () => {
    expect(isValidProductionMonth('2026-08')).toBe(true);
    expect(isValidProductionMonth('2026-01')).toBe(true);
    expect(isValidProductionMonth('2026-12')).toBe(true);
    expect(isValidProductionMonth('2026-00')).toBe(false);
    expect(isValidProductionMonth('2026-13')).toBe(false);
    expect(isValidProductionMonth('2026-8')).toBe(false);
    expect(isValidProductionMonth('2026/08')).toBe(false);
    expect(isValidProductionMonth('2026-08-01')).toBe(false);
  });
});

describe('isValidWorkDate', () => {
  it('accepts real yyyy-MM-dd dates only', () => {
    expect(isValidWorkDate('2026-08-15')).toBe(true);
    expect(isValidWorkDate('2024-02-29')).toBe(true);
    expect(isValidWorkDate('2026-02-29')).toBe(false);
    expect(isValidWorkDate('2026-13-01')).toBe(false);
    expect(isValidWorkDate('2026-08-32')).toBe(false);
    expect(isValidWorkDate('2026-8-15')).toBe(false);
    expect(isValidWorkDate('2026-08')).toBe(false);
  });
});

describe('calculateDefectRate', () => {
  it('returns defect / handpicked as a ratio', () => {
    expect(calculateDefectRate(620, 20000)).toBeCloseTo(0.031, 5);
    expect(calculateDefectRate(50, 200)).toBe(0.25);
  });

  it('returns 0 when handpicked total is 0 or negative', () => {
    expect(calculateDefectRate(620, 0)).toBe(0);
    expect(calculateDefectRate(620, -100)).toBe(0);
  });
});

describe('calculateUsableGreenGram', () => {
  it('subtracts defect grams from handpicked grams', () => {
    expect(calculateUsableGreenGram(20000, 620)).toBe(19380);
  });

  it('never returns a negative value', () => {
    expect(calculateUsableGreenGram(100, 500)).toBe(0);
  });
});

describe('calculatePremixBags', () => {
  it('splits usable grams into 500g bags and a remainder', () => {
    expect(calculatePremixBags(19380)).toEqual({ bags: 38, remainderGram: 380 });
    expect(calculatePremixBags(1000)).toEqual({ bags: 2, remainderGram: 0 });
  });

  it('treats negative usable grams as 0', () => {
    expect(calculatePremixBags(-1)).toEqual({ bags: 0, remainderGram: 0 });
  });
});
