import { describe, expect, it } from 'vitest';
import { isValidProductionMonth, isValidWorkDate } from './productionRecords';

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
