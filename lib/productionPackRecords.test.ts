import { describe, expect, it } from 'vitest';
import {
  buildProductionPackRecord,
  buildProductionPackMonthlyCsv,
  buildProductionPackMonthlySummary,
  calculateProductionPackTotals,
  calculateProductionPackFailureRate,
  formatProductionPackDateLabel,
  formatProductionPackFailureRate,
  getProductionPackMonthRange,
  getProductionPackMonthlyCsvFileName,
  isProductionPackRecordEditable,
  isProductionPackWorkDateEditable,
  isValidProductionPackMonth,
  normalizePackCountFieldValue,
  normalizePackCountInput,
} from './productionPackRecords';
import type { ProductionPackRecord } from '@/types';

describe('normalizePackCountInput', () => {
  it('treats empty input as 0', () => {
    expect(normalizePackCountInput('')).toBe(0);
    expect(normalizePackCountInput('   ')).toBe(0);
  });

  it('accepts zero or positive integers', () => {
    expect(normalizePackCountInput('0')).toBe(0);
    expect(normalizePackCountInput('12')).toBe(12);
  });

  it('rejects negative, decimal, and non-number input', () => {
    expect(() => normalizePackCountInput('-1')).toThrow('0以上の整数で入力してください');
    expect(() => normalizePackCountInput('1.5')).toThrow('0以上の整数で入力してください');
    expect(() => normalizePackCountInput('abc')).toThrow('0以上の整数で入力してください');
  });
});

describe('calculateProductionPackTotals', () => {
  it('calculates success, failure, and overall totals from both teams', () => {
    expect(
      calculateProductionPackTotals({
        teamA: { successCount: 120, failureCount: 3 },
        teamB: { successCount: 98, failureCount: 2 },
      })
    ).toEqual({
      successTotal: 218,
      failureTotal: 5,
      total: 223,
    });
  });
});

describe('buildProductionPackRecord', () => {
  it('builds an active date-based record with calculated totals', () => {
    const record = buildProductionPackRecord({
      workDate: '2026-05-24',
      teamA: { successCount: 120, failureCount: 3 },
      teamB: { successCount: 98, failureCount: 2 },
    });

    expect(record).toMatchObject({
      workDate: '2026-05-24',
      teamA: { successCount: 120, failureCount: 3 },
      teamB: { successCount: 98, failureCount: 2 },
      successTotal: 218,
      failureTotal: 5,
      total: 223,
    });
  });

  it('rejects an invalid work date', () => {
    expect(() =>
      buildProductionPackRecord({
        workDate: '2026/05/24',
        teamA: { successCount: 0, failureCount: 0 },
        teamB: { successCount: 0, failureCount: 0 },
      })
    ).toThrow('作業日が正しくありません');
  });
});

describe('isProductionPackRecordEditable', () => {
  const baseRecord: ProductionPackRecord = {
    workDate: '2026-05-24',
    teamA: { successCount: 1, failureCount: 0 },
    teamB: { successCount: 2, failureCount: 0 },
    successTotal: 3,
    failureTotal: 0,
    total: 3,
  };

  it('allows editing records on today or past dates', () => {
    expect(isProductionPackRecordEditable(baseRecord, '2026-05-24')).toBe(true);
    expect(isProductionPackRecordEditable(baseRecord, '2026-05-25')).toBe(true);
    expect(isProductionPackRecordEditable(baseRecord, '2026-05-23')).toBe(false);
    expect(isProductionPackRecordEditable(null, '2026-05-24')).toBe(false);
  });
});

describe('normalizePackCountFieldValue', () => {
  it('removes unnecessary leading zeros while preserving editable empty input', () => {
    expect(normalizePackCountFieldValue('')).toBe('');
    expect(normalizePackCountFieldValue('0')).toBe('0');
    expect(normalizePackCountFieldValue('00')).toBe('0');
    expect(normalizePackCountFieldValue('011')).toBe('11');
  });
});

describe('calculateProductionPackFailureRate', () => {
  it('calculates the failure ratio from failure and total counts', () => {
    expect(calculateProductionPackFailureRate(5, 125)).toBe(0.04);
  });

  it('returns 0 when total is 0', () => {
    expect(calculateProductionPackFailureRate(0, 0)).toBe(0);
  });
});

describe('isProductionPackWorkDateEditable', () => {
  it('allows today and past work dates, but rejects future dates', () => {
    expect(isProductionPackWorkDateEditable('2026-05-24', '2026-05-24')).toBe(true);
    expect(isProductionPackWorkDateEditable('2026-05-23', '2026-05-24')).toBe(true);
    expect(isProductionPackWorkDateEditable('2026-05-25', '2026-05-24')).toBe(false);
  });
});

describe('formatProductionPackDateLabel', () => {
  it('formats yyyy-mm-dd as a Japanese date label', () => {
    expect(formatProductionPackDateLabel('2026-05-24')).toBe('2026年5月24日');
  });
});

describe('isValidProductionPackMonth', () => {
  it('accepts yyyy-mm and rejects invalid months', () => {
    expect(isValidProductionPackMonth('2026-05')).toBe(true);
    expect(isValidProductionPackMonth('2026-5')).toBe(false);
    expect(isValidProductionPackMonth('2026-00')).toBe(false);
    expect(isValidProductionPackMonth('2026-13')).toBe(false);
  });
});

describe('getProductionPackMonthRange', () => {
  it('returns the first day of the selected month and next month', () => {
    expect(getProductionPackMonthRange('2026-05')).toEqual({
      startDate: '2026-05-01',
      endDate: '2026-06-01',
    });
  });

  it('handles December to January rollover', () => {
    expect(getProductionPackMonthRange('2026-12')).toEqual({
      startDate: '2026-12-01',
      endDate: '2027-01-01',
    });
  });
});

describe('buildProductionPackMonthlySummary', () => {
  const records: Array<ProductionPackRecord & { status?: 'active' | 'cancelled' }> = [
    {
      workDate: '2026-05-02',
      teamA: { successCount: 80, failureCount: 2 },
      teamB: { successCount: 50, failureCount: 1 },
      successTotal: 130,
      failureTotal: 3,
      total: 133,
      status: 'active',
    },
    {
      workDate: '2026-05-01',
      teamA: { successCount: 70, failureCount: 3 },
      teamB: { successCount: 50, failureCount: 2 },
      successTotal: 120,
      failureTotal: 5,
      total: 125,
    },
    {
      workDate: '2026-05-03',
      teamA: { successCount: 99, failureCount: 9 },
      teamB: { successCount: 1, failureCount: 1 },
      successTotal: 100,
      failureTotal: 10,
      total: 110,
      status: 'cancelled',
    },
    {
      workDate: '2026-06-01',
      teamA: { successCount: 10, failureCount: 0 },
      teamB: { successCount: 10, failureCount: 0 },
      successTotal: 20,
      failureTotal: 0,
      total: 20,
    },
  ];

  it('summarizes only active records in the selected month by ascending date', () => {
    expect(buildProductionPackMonthlySummary('2026-05', records)).toEqual({
      month: '2026-05',
      totals: {
        successTotal: 250,
        failureTotal: 8,
        total: 258,
      },
      failureRate: 8 / 258,
      dailyRecords: [
        { workDate: '2026-05-01', successTotal: 120, failureTotal: 5, total: 125, failureRate: 0.04 },
        { workDate: '2026-05-02', successTotal: 130, failureTotal: 3, total: 133, failureRate: 3 / 133 },
      ],
    });
  });
});

describe('buildProductionPackMonthlyCsv', () => {
  it('builds a UTF-8 BOM csv with daily rows and monthly total row', () => {
    const summary = buildProductionPackMonthlySummary('2026-05', [
      {
        workDate: '2026-05-01',
        teamA: { successCount: 70, failureCount: 3 },
        teamB: { successCount: 50, failureCount: 2 },
        successTotal: 120,
        failureTotal: 5,
        total: 125,
      },
      {
        workDate: '2026-05-02',
        teamA: { successCount: 80, failureCount: 2 },
        teamB: { successCount: 50, failureCount: 1 },
        successTotal: 130,
        failureTotal: 3,
        total: 133,
      },
    ]);

    expect(buildProductionPackMonthlyCsv(summary)).toBe(
      '\uFEFF日付,成功数,失敗数,総数,失敗率\r\n2026-05-01,120,5,125,4.0%\r\n2026-05-02,130,3,133,2.3%\r\n月合計,250,8,258,3.1%'
    );
  });
});

describe('formatProductionPackFailureRate', () => {
  it('formats failure rate as a percentage with one decimal place', () => {
    expect(formatProductionPackFailureRate(0.0404)).toBe('4.0%');
    expect(formatProductionPackFailureRate(0)).toBe('0.0%');
  });
});

describe('getProductionPackMonthlyCsvFileName', () => {
  it('uses the selected month in the file name', () => {
    expect(getProductionPackMonthlyCsvFileName('2026-05')).toBe('production-pack-records-2026-05.csv');
  });
});
