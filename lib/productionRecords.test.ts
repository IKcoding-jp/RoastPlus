import { describe, expect, it } from 'vitest';
import {
  buildBlendLabel,
  buildHandpickEntry,
  buildMonthlySummary,
  buildPackageEntry,
  buildProductionRecordCsv,
  buildProductionRecordMonth,
  buildRoastEntry,
  calculateDailyTheoryPacks,
  calculateDefectRate,
  calculateMoistureLossRate,
  calculatePackageTotals,
  calculatePremixBags,
  calculateRoastYield,
  calculateThirtyKgTheoryPacks,
  calculateUsableGreenGram,
  escapeCsvCell,
  formatKg,
  formatPercent,
  formatProductionMonthLabel,
  getCurrentProductionMonth,
  getProductionRecordCsvFileName,
  getTodayWorkDate,
  isValidProductionMonth,
  isValidWorkDate,
  normalizeCountInput,
  normalizeWeightInput,
  sumHandpick,
  sumPackage,
  sumRoast,
  validateBlendItems,
} from './productionRecords';
import type {
  BlendItem,
  HandpickEntry,
  HandpickEntryInput,
  PackageEntry,
  PackageEntryInput,
  ProductionRecordMonth,
  ProductionRecordMonthInput,
  ProductionRecordMonthlySummary,
  RoastEntry,
  RoastEntryInput,
  TeamCounts,
} from '@/types';

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

describe('getCurrentProductionMonth', () => {
  it('formats local time as yyyy-MM with zero-padded month', () => {
    // 1月→01 / 9月→09 の0埋めと、年の連結を確認（ローカル時刻基準で組む）
    expect(getCurrentProductionMonth(new Date(2026, 0, 15))).toBe('2026-01');
    expect(getCurrentProductionMonth(new Date(2026, 8, 1))).toBe('2026-09');
    expect(getCurrentProductionMonth(new Date(2026, 11, 31))).toBe('2026-12');
  });
});

describe('getTodayWorkDate', () => {
  it('formats local time as yyyy-MM-dd with zero-padded month and day', () => {
    // 月・日とも0埋め（1月5日→01-05）。toISOString()不使用のため深夜でも日付がまたがらない
    expect(getTodayWorkDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(getTodayWorkDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
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

  it('clamps to 0 when defectRate exceeds 1 (defect grams exceed handpicked grams)', () => {
    // 欠点率が1を超えると (1 - defectRate) が負になるが、理論袋数は0でクランプする
    expect(calculateThirtyKgTheoryPacks(1.2, 0.83, 8.5)).toBe(0);
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

describe('buildMonthlySummary', () => {
  const monthDoc: ProductionRecordMonth = {
    month: '2026-08',
    greenBeanTotalGram: 20000,
    powderPerPackGram: 8.5,
    blendItems: [
      { beanName: 'ブラジル', ratioPercent: 80 },
      { beanName: 'グアテマラ', ratioPercent: 20 },
    ],
  };

  const handpickEntries: HandpickEntry[] = [
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

  const roastEntries: RoastEntry[] = [
    { id: 'r1', workDate: '2026-08-01', beforeRoastWeightGram: 1000, afterRoastWeightGram: 830 },
    { id: 'r2', workDate: '2026-08-02', beforeRoastWeightGram: 1000, afterRoastWeightGram: 830 },
  ];

  const packageEntries: PackageEntry[] = [
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

  it('composes a monthly summary from month doc and all entries', () => {
    const summary = buildMonthlySummary(monthDoc, handpickEntries, roastEntries, packageEntries);

    const expectedDefectRate = 620 / 20000; // 0.031
    const expectedRoastYield = 1660 / 2000; // 0.83
    const expectedThirtyKg = Math.floor((30000 * (1 - expectedDefectRate) * expectedRoastYield) / 8.5);
    // usable = 20000 - 620 = 19380 -> 38 bags, remainder 380

    expect(summary).toEqual({
      month: '2026-08',
      blendLabel: 'ブラジル 80% / グアテマラ 20%',
      greenBeanTotalGram: 20000,
      defectBeanTotalGram: 620,
      defectRate: expectedDefectRate,
      roastBeforeTotalGram: 2000,
      roastAfterTotalGram: 1660,
      roastYield: expectedRoastYield,
      moistureLossRate: 1 - expectedRoastYield,
      premixBags: 38,
      premixRemainderGram: 380,
      thirtyKgTheoryPacks: expectedThirtyKg,
      monthlyGoodCount: 2840,
      monthlyDefectiveCount: 82,
      monthlyProducedCount: 2922,
      packageLossRate: 82 / 2922,
    });
  });

  it('guards against division by zero with empty entries', () => {
    const emptyMonthDoc: ProductionRecordMonth = {
      month: '2026-09',
      greenBeanTotalGram: 0,
      powderPerPackGram: 8.5,
      blendItems: [],
    };
    const summary = buildMonthlySummary(emptyMonthDoc, [], [], []);

    expect(summary).toEqual({
      month: '2026-09',
      blendLabel: '',
      greenBeanTotalGram: 0,
      defectBeanTotalGram: 0,
      defectRate: 0,
      roastBeforeTotalGram: 0,
      roastAfterTotalGram: 0,
      roastYield: 0,
      moistureLossRate: 0,
      premixBags: 0,
      premixRemainderGram: 0,
      thirtyKgTheoryPacks: 0,
      monthlyGoodCount: 0,
      monthlyDefectiveCount: 0,
      monthlyProducedCount: 0,
      packageLossRate: 0,
    });
  });
});

describe('normalizeWeightInput', () => {
  it('accepts zero and positive finite numbers', () => {
    expect(normalizeWeightInput(0)).toBe(0);
    expect(normalizeWeightInput(8.5)).toBe(8.5);
    expect(normalizeWeightInput(20000)).toBe(20000);
  });

  it('throws for negative, NaN, or non-finite values', () => {
    expect(() => normalizeWeightInput(-1)).toThrow('0以上の数値で入力してください');
    expect(() => normalizeWeightInput(Number.NaN)).toThrow('0以上の数値で入力してください');
    expect(() => normalizeWeightInput(Number.POSITIVE_INFINITY)).toThrow('0以上の数値で入力してください');
  });
});

describe('normalizeCountInput', () => {
  it('accepts zero and positive integers', () => {
    expect(normalizeCountInput(0)).toBe(0);
    expect(normalizeCountInput(2840)).toBe(2840);
  });

  it('throws for negative, decimal, NaN, or non-finite values', () => {
    expect(() => normalizeCountInput(-1)).toThrow('0以上の整数で入力してください');
    expect(() => normalizeCountInput(1.5)).toThrow('0以上の整数で入力してください');
    expect(() => normalizeCountInput(Number.NaN)).toThrow('0以上の整数で入力してください');
    expect(() => normalizeCountInput(Number.POSITIVE_INFINITY)).toThrow('0以上の整数で入力してください');
  });
});

describe('validateBlendItems', () => {
  it('accepts 1 to 4 items whose ratios sum to exactly 100', () => {
    expect(() =>
      validateBlendItems([
        { beanName: 'ブラジル', ratioPercent: 80 },
        { beanName: 'グアテマラ', ratioPercent: 20 },
      ])
    ).not.toThrow();
    expect(() => validateBlendItems([{ beanName: 'ブラジル', ratioPercent: 100 }])).not.toThrow();
  });

  it('throws when there are no items or more than 4', () => {
    expect(() => validateBlendItems([])).toThrow();
    expect(() =>
      validateBlendItems([
        { beanName: 'a', ratioPercent: 20 },
        { beanName: 'b', ratioPercent: 20 },
        { beanName: 'c', ratioPercent: 20 },
        { beanName: 'd', ratioPercent: 20 },
        { beanName: 'e', ratioPercent: 20 },
      ])
    ).toThrow();
  });

  it('throws when a ratio is negative', () => {
    expect(() =>
      validateBlendItems([
        { beanName: 'a', ratioPercent: 120 },
        { beanName: 'b', ratioPercent: -20 },
      ])
    ).toThrow();
  });

  it('throws when ratios do not sum to exactly 100', () => {
    expect(() =>
      validateBlendItems([
        { beanName: 'a', ratioPercent: 80 },
        { beanName: 'b', ratioPercent: 10 },
      ])
    ).toThrow();
  });
});

describe('buildProductionRecordMonth', () => {
  const validInput: ProductionRecordMonthInput = {
    month: '2026-08',
    greenBeanTotalGram: 20000,
    powderPerPackGram: 8.5,
    blendItems: [
      { beanName: 'ブラジル', ratioPercent: 80 },
      { beanName: 'グアテマラ', ratioPercent: 20 },
    ],
  };

  it('returns the validated input shape', () => {
    expect(buildProductionRecordMonth(validInput)).toEqual(validInput);
  });

  it('throws for an invalid month', () => {
    expect(() => buildProductionRecordMonth({ ...validInput, month: '2026-13' })).toThrow();
  });

  it('throws when green bean total is not greater than 0', () => {
    expect(() => buildProductionRecordMonth({ ...validInput, greenBeanTotalGram: 0 })).toThrow();
  });

  it('throws when powder per pack is not greater than 0', () => {
    expect(() => buildProductionRecordMonth({ ...validInput, powderPerPackGram: 0 })).toThrow();
  });

  it('throws when blend items are invalid', () => {
    expect(() =>
      buildProductionRecordMonth({
        ...validInput,
        blendItems: [{ beanName: 'a', ratioPercent: 90 }],
      })
    ).toThrow();
  });
});

describe('buildHandpickEntry', () => {
  const validInput: HandpickEntryInput = {
    workDate: '2026-08-01',
    beanName: 'ブラジル',
    segment: 'first',
    greenBeanWeightGram: 10000,
    defectBeanWeightGram: 320,
  };

  it('returns the validated input shape', () => {
    expect(buildHandpickEntry(validInput)).toEqual(validInput);
  });

  it('accepts the second segment and zero defect weight', () => {
    expect(buildHandpickEntry({ ...validInput, segment: 'second', defectBeanWeightGram: 0 })).toEqual({
      ...validInput,
      segment: 'second',
      defectBeanWeightGram: 0,
    });
  });

  it('throws for invalid work date, segment, or weights', () => {
    expect(() => buildHandpickEntry({ ...validInput, workDate: '2026-08' })).toThrow();
    expect(() => buildHandpickEntry({ ...validInput, segment: 'third' as HandpickEntryInput['segment'] })).toThrow();
    expect(() => buildHandpickEntry({ ...validInput, greenBeanWeightGram: 0 })).toThrow();
    expect(() => buildHandpickEntry({ ...validInput, defectBeanWeightGram: -1 })).toThrow();
  });
});

describe('buildRoastEntry', () => {
  const validInput: RoastEntryInput = {
    workDate: '2026-08-01',
    beforeRoastWeightGram: 2000,
    afterRoastWeightGram: 1660,
  };

  it('returns the validated input shape', () => {
    expect(buildRoastEntry(validInput)).toEqual(validInput);
  });

  it('throws for invalid date, non-positive weights, or after > before', () => {
    expect(() => buildRoastEntry({ ...validInput, workDate: '2026/08/01' })).toThrow();
    expect(() => buildRoastEntry({ ...validInput, beforeRoastWeightGram: 0 })).toThrow();
    expect(() => buildRoastEntry({ ...validInput, afterRoastWeightGram: 0 })).toThrow();
    expect(() => buildRoastEntry({ ...validInput, beforeRoastWeightGram: 1000, afterRoastWeightGram: 1100 })).toThrow();
  });
});

describe('buildPackageEntry', () => {
  const validInput: PackageEntryInput = {
    workDate: '2026-08-01',
    teamA: { goodCount: 1000, defectiveCount: 30 },
    teamB: { goodCount: 500, defectiveCount: 20 },
  };

  it('returns the validated input shape', () => {
    expect(buildPackageEntry(validInput)).toEqual(validInput);
  });

  it('throws for invalid date or non-integer/negative counts', () => {
    expect(() => buildPackageEntry({ ...validInput, workDate: '2026-08' })).toThrow();
    expect(() => buildPackageEntry({ ...validInput, teamA: { goodCount: -1, defectiveCount: 0 } })).toThrow();
    expect(() => buildPackageEntry({ ...validInput, teamB: { goodCount: 1.5, defectiveCount: 0 } })).toThrow();
  });
});

describe('formatPercent', () => {
  it('formats a ratio as a percentage with one decimal place', () => {
    expect(formatPercent(0.031)).toBe('3.1%');
    expect(formatPercent(0.17)).toBe('17.0%');
    expect(formatPercent(0)).toBe('0.0%');
  });
});

describe('formatKg', () => {
  it('formats grams as kilograms with two decimal places', () => {
    expect(formatKg(20100)).toBe('20.10');
    expect(formatKg(1660)).toBe('1.66');
    expect(formatKg(0)).toBe('0.00');
  });
});

describe('escapeCsvCell', () => {
  it('leaves a plain value untouched', () => {
    expect(escapeCsvCell('ブラジル')).toBe('ブラジル');
    expect(escapeCsvCell(20000)).toBe('20000');
  });

  it('wraps values containing comma, quote, or newline in quotes (RFC4180)', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
    expect(escapeCsvCell('a\nb')).toBe('"a\nb"');
    expect(escapeCsvCell('a\rb')).toBe('"a\rb"');
  });
});

describe('buildProductionRecordCsv', () => {
  it('builds a BOM csv with a 12-column header and one CRLF data row', () => {
    const summary: ProductionRecordMonthlySummary = {
      month: '2026-08',
      blendLabel: 'ブラジル 80% / グアテマラ 20%',
      greenBeanTotalGram: 20000,
      defectBeanTotalGram: 620,
      defectRate: 0.031,
      roastBeforeTotalGram: 2000,
      roastAfterTotalGram: 1660,
      roastYield: 0.83,
      moistureLossRate: 0.17,
      premixBags: 38,
      premixRemainderGram: 380,
      thirtyKgTheoryPacks: 2838,
      monthlyGoodCount: 2840,
      monthlyDefectiveCount: 82,
      monthlyProducedCount: 2922,
      packageLossRate: 82 / 2922,
    };

    const header =
      '対象月,配合,生豆重量kg,欠点豆重量g,欠点率,焙煎後重量kg,焙煎ロス率,30kg理論袋数,月良品数,月不良品数,月生産個数,パッケージロス率';
    // 対象月は「YYYY年M月分」表記。配合はスラッシュを含むがカンマを含まないためクォート不要
    const dataRow = '2026年8月分,ブラジル 80% / グアテマラ 20%,20.00,620,3.1%,1.66,17.0%,2838,2840,82,2922,2.8%';

    expect(buildProductionRecordCsv(summary)).toBe(`\uFEFF${header}\r\n${dataRow}`);
  });
});

describe('getProductionRecordCsvFileName', () => {
  it('uses the target month in the file name', () => {
    expect(getProductionRecordCsvFileName('2026-08')).toBe('production-record-2026-08.csv');
  });
});

describe('formatProductionMonthLabel', () => {
  it('formats yyyy-MM as 「YYYY年M月分」 (zero-padded month is shown without leading zero)', () => {
    expect(formatProductionMonthLabel('2026-08')).toBe('2026年8月分');
    expect(formatProductionMonthLabel('2026-12')).toBe('2026年12月分');
  });

  it('returns the input unchanged when it is not yyyy-MM', () => {
    expect(formatProductionMonthLabel('')).toBe('');
    expect(formatProductionMonthLabel('2026')).toBe('2026');
  });
});
