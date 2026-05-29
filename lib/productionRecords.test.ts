import { describe, expect, it } from 'vitest';
import {
  buildBlendLabel,
  calculateDailyTheoryPacks,
  calculateDefectRate,
  calculateMoistureLossRate,
  calculatePackageTotals,
  calculatePremixBags,
  calculateRoastYield,
  calculateThirtyKgTheoryPacks,
  calculateUsableGreenGram,
  isValidProductionMonth,
  isValidWorkDate,
  sumHandpick,
  sumPackage,
  sumRoast,
} from './productionRecords';
import type { BlendItem, HandpickEntry, PackageEntry, RoastEntry, TeamCounts } from '@/types';

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

describe('calculateRoastYield', () => {
  it('returns after / before as a ratio', () => {
    expect(calculateRoastYield(2000, 1660)).toBeCloseTo(0.83, 5);
  });

  it('returns 0 when before total is 0 or negative', () => {
    expect(calculateRoastYield(0, 1660)).toBe(0);
    expect(calculateRoastYield(-100, 1660)).toBe(0);
  });
});

describe('calculateMoistureLossRate', () => {
  it('returns 1 - roastYield', () => {
    expect(calculateMoistureLossRate(0.83)).toBeCloseTo(0.17, 5);
  });

  it('returns 0 when roastYield is 0 or negative', () => {
    expect(calculateMoistureLossRate(0)).toBe(0);
    expect(calculateMoistureLossRate(-0.1)).toBe(0);
  });
});

describe('calculateDailyTheoryPacks', () => {
  it('floors after-roast grams divided by powder per pack', () => {
    expect(calculateDailyTheoryPacks(1660, 8.5)).toBe(195);
  });

  it('returns 0 when powder per pack is 0 or negative', () => {
    expect(calculateDailyTheoryPacks(1660, 0)).toBe(0);
    expect(calculateDailyTheoryPacks(1660, -1)).toBe(0);
  });
});

describe('calculateThirtyKgTheoryPacks', () => {
  it('floors 30000 * (1 - defectRate) * roastYield / powder', () => {
    // 30000 * (1 - 0.031) * 0.83 / 8.5 = 2838.07... -> 2838
    expect(calculateThirtyKgTheoryPacks(0.031, 0.83, 8.5)).toBe(2838);
  });

  it('returns 0 when powder or roastYield is 0 or negative', () => {
    expect(calculateThirtyKgTheoryPacks(0.031, 0.83, 0)).toBe(0);
    expect(calculateThirtyKgTheoryPacks(0.031, 0, 8.5)).toBe(0);
    expect(calculateThirtyKgTheoryPacks(0.031, -0.1, 8.5)).toBe(0);
  });
});

describe('calculatePackageTotals', () => {
  it('sums both teams and computes the defect rate', () => {
    const teamA: TeamCounts = { goodCount: 1500, defectiveCount: 50 };
    const teamB: TeamCounts = { goodCount: 1340, defectiveCount: 32 };
    // good=2840, defective=82, produced=2922, defectRate=82/2922=0.02806...
    expect(calculatePackageTotals(teamA, teamB)).toEqual({
      goodTotal: 2840,
      defectiveTotal: 82,
      producedTotal: 2922,
      defectRate: 82 / 2922,
    });
  });

  it('returns defectRate 0 when produced total is 0', () => {
    const empty: TeamCounts = { goodCount: 0, defectiveCount: 0 };
    expect(calculatePackageTotals(empty, empty)).toEqual({
      goodTotal: 0,
      defectiveTotal: 0,
      producedTotal: 0,
      defectRate: 0,
    });
  });
});

describe('buildBlendLabel', () => {
  it('joins blend items as "name ratio%" separated by " / "', () => {
    const items: BlendItem[] = [
      { beanName: 'ブラジル', ratioPercent: 80 },
      { beanName: 'グアテマラ', ratioPercent: 20 },
    ];
    expect(buildBlendLabel(items)).toBe('ブラジル 80% / グアテマラ 20%');
  });

  it('handles a single blend item', () => {
    expect(buildBlendLabel([{ beanName: 'ブラジル', ratioPercent: 100 }])).toBe('ブラジル 100%');
  });

  it('returns an empty string for no items', () => {
    expect(buildBlendLabel([])).toBe('');
  });
});

describe('sumHandpick', () => {
  it('sums green bean and defect grams across entries', () => {
    const entries: HandpickEntry[] = [
      {
        id: 'h1',
        workDate: '2026-08-01',
        beanName: 'ブラジル',
        segment: 'first',
        greenBeanWeightGram: 10000,
        defectBeanWeightGram: 320,
      },
      {
        id: 'h2',
        workDate: '2026-08-02',
        beanName: 'ブラジル',
        segment: 'second',
        greenBeanWeightGram: 10000,
        defectBeanWeightGram: 300,
      },
    ];
    expect(sumHandpick(entries)).toEqual({ handpickedTotalGram: 20000, defectTotalGram: 620 });
  });

  it('returns zero totals for an empty list', () => {
    expect(sumHandpick([])).toEqual({ handpickedTotalGram: 0, defectTotalGram: 0 });
  });
});

describe('sumRoast', () => {
  it('sums before and after grams across entries', () => {
    const entries: RoastEntry[] = [
      { id: 'r1', workDate: '2026-08-01', beforeRoastWeightGram: 1000, afterRoastWeightGram: 830 },
      { id: 'r2', workDate: '2026-08-02', beforeRoastWeightGram: 1000, afterRoastWeightGram: 830 },
    ];
    expect(sumRoast(entries)).toEqual({ beforeTotalGram: 2000, afterTotalGram: 1660 });
  });

  it('returns zero totals for an empty list', () => {
    expect(sumRoast([])).toEqual({ beforeTotalGram: 0, afterTotalGram: 0 });
  });
});

describe('sumPackage', () => {
  it('sums good, defective, and produced totals across entries', () => {
    const entries: PackageEntry[] = [
      {
        id: 'p1',
        workDate: '2026-08-01',
        teamA: { goodCount: 1000, defectiveCount: 30 },
        teamB: { goodCount: 500, defectiveCount: 20 },
      },
      {
        id: 'p2',
        workDate: '2026-08-02',
        teamA: { goodCount: 500, defectiveCount: 20 },
        teamB: { goodCount: 840, defectiveCount: 12 },
      },
    ];
    expect(sumPackage(entries)).toEqual({ goodTotal: 2840, defectiveTotal: 82, producedTotal: 2922 });
  });

  it('returns zero totals for an empty list', () => {
    expect(sumPackage([])).toEqual({ goodTotal: 0, defectiveTotal: 0, producedTotal: 0 });
  });
});
