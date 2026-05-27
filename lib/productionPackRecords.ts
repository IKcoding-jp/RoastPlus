import type {
  ProductionPackMonthlySummary,
  ProductionPackRecord,
  ProductionPackRecordInput,
  ProductionPackTeamCounts,
} from '@/types';

const WORK_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WORK_MONTH_PATTERN = /^\d{4}-\d{2}$/;
const PACK_COUNT_ERROR = '0以上の整数で入力してください';
const WORK_DATE_ERROR = '作業日が正しくありません';
const WORK_MONTH_ERROR = '対象年月が正しくありません';

export function getTodayProductionPackDate(timeZone: string = 'Asia/Tokyo'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

export function isValidProductionPackWorkDate(workDate: string): boolean {
  if (!WORK_DATE_PATTERN.test(workDate)) {
    return false;
  }

  const [year, month, day] = workDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidProductionPackMonth(month: string): boolean {
  if (!WORK_MONTH_PATTERN.test(month)) {
    return false;
  }

  const [, monthText] = month.split('-');
  const monthNumber = Number(monthText);
  return monthNumber >= 1 && monthNumber <= 12;
}

export function getProductionPackMonthRange(month: string): { startDate: string; endDate: string } {
  if (!isValidProductionPackMonth(month)) {
    throw new Error(WORK_MONTH_ERROR);
  }

  const [year, monthNumber] = month.split('-').map(Number);
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  const nextMonthYear = monthNumber === 12 ? year + 1 : year;

  return {
    startDate: `${month}-01`,
    endDate: `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`,
  };
}

export function normalizePackCountInput(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    if (Number.isSafeInteger(value) && value >= 0) {
      return value;
    }
    throw new Error(PACK_COUNT_ERROR);
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return 0;
  }

  if (!/^\d+$/.test(trimmed)) {
    throw new Error(PACK_COUNT_ERROR);
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(PACK_COUNT_ERROR);
  }

  return parsed;
}

export function normalizePackCountFieldValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') {
    return '';
  }

  if (!/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed.replace(/^0+(?=\d)/, '');
}

function validateTeamCounts(team: ProductionPackTeamCounts): ProductionPackTeamCounts {
  return {
    successCount: normalizePackCountInput(team.successCount),
    failureCount: normalizePackCountInput(team.failureCount),
  };
}

export function calculateProductionPackTotals(input: Pick<ProductionPackRecordInput, 'teamA' | 'teamB'>) {
  const successTotal = input.teamA.successCount + input.teamB.successCount;
  const failureTotal = input.teamA.failureCount + input.teamB.failureCount;

  return {
    successTotal,
    failureTotal,
    total: successTotal + failureTotal,
  };
}

export function calculateProductionPackFailureRate(failureTotal: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return failureTotal / total;
}

export function buildProductionPackRecord(input: ProductionPackRecordInput): ProductionPackRecord {
  if (!isValidProductionPackWorkDate(input.workDate)) {
    throw new Error(WORK_DATE_ERROR);
  }

  const teamA = validateTeamCounts(input.teamA);
  const teamB = validateTeamCounts(input.teamB);
  const totals = calculateProductionPackTotals({ teamA, teamB });

  return {
    workDate: input.workDate,
    teamA,
    teamB,
    ...totals,
    note: input.note,
  };
}

export function isProductionPackWorkDateEditable(workDate: string, todayDate: string): boolean {
  return isValidProductionPackWorkDate(workDate) && workDate <= todayDate;
}

export function isProductionPackRecordEditable(record: ProductionPackRecord | null, todayDate: string): boolean {
  return record !== null && isProductionPackWorkDateEditable(record.workDate, todayDate);
}

export function formatProductionPackDateLabel(workDate: string): string {
  const [year, month, day] = workDate.split('-').map(Number);
  return `${year}年${month}月${day}日`;
}

export function formatProductionPackMonthLabel(month: string): string {
  if (!isValidProductionPackMonth(month)) {
    throw new Error(WORK_MONTH_ERROR);
  }

  const [year, monthNumber] = month.split('-').map(Number);
  return `${year}年${monthNumber}月`;
}

function isProductionPackRecordIncludedInMonthlySummary(record: ProductionPackRecord, month: string): boolean {
  return record.workDate.startsWith(`${month}-`) && record.status !== 'cancelled';
}

export function buildProductionPackMonthlySummary(
  month: string,
  records: ProductionPackRecord[]
): ProductionPackMonthlySummary {
  if (!isValidProductionPackMonth(month)) {
    throw new Error(WORK_MONTH_ERROR);
  }

  const dailyRecords = records
    .filter((record) => isProductionPackRecordIncludedInMonthlySummary(record, month))
    .sort((a, b) => a.workDate.localeCompare(b.workDate))
    .map((record) => ({
      workDate: record.workDate,
      successTotal: record.successTotal,
      failureTotal: record.failureTotal,
      total: record.total,
      failureRate: calculateProductionPackFailureRate(record.failureTotal, record.total),
    }));

  const totals = dailyRecords.reduce(
    (acc, record) => ({
      successTotal: acc.successTotal + record.successTotal,
      failureTotal: acc.failureTotal + record.failureTotal,
      total: acc.total + record.total,
    }),
    { successTotal: 0, failureTotal: 0, total: 0 }
  );

  return {
    month,
    totals,
    failureRate: calculateProductionPackFailureRate(totals.failureTotal, totals.total),
    dailyRecords,
  };
}

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildProductionPackMonthlyCsv(summary: ProductionPackMonthlySummary): string {
  const rows: Array<Array<string | number>> = [
    ['日付', '成功数', '失敗数', '総数', '失敗率'],
    ...summary.dailyRecords.map((record) => [
      record.workDate,
      record.successTotal,
      record.failureTotal,
      record.total,
      formatProductionPackFailureRate(record.failureRate),
    ]),
    [
      '月合計',
      summary.totals.successTotal,
      summary.totals.failureTotal,
      summary.totals.total,
      formatProductionPackFailureRate(summary.failureRate),
    ],
  ];

  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}`;
}

export function formatProductionPackFailureRate(failureRate: number): string {
  return `${(failureRate * 100).toFixed(1)}%`;
}

export function getProductionPackMonthlyCsvFileName(month: string): string {
  if (!isValidProductionPackMonth(month)) {
    throw new Error(WORK_MONTH_ERROR);
  }

  return `production-pack-records-${month}.csv`;
}

export function createEmptyProductionPackInput(workDate: string): ProductionPackRecordInput {
  return {
    workDate,
    teamA: { successCount: 0, failureCount: 0 },
    teamB: { successCount: 0, failureCount: 0 },
  };
}
