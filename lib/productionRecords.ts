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

const WORK_MONTH_PATTERN = /^\d{4}-\d{2}$/;
const WORK_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const DEFAULT_POWDER_PER_PACK_GRAM = 8.5;
const PREMIX_BAG_GRAM = 500;
const THIRTY_KG_BASE_GRAM = 30000;
export const MAX_BLEND_ITEMS = 4;

export const PRODUCTION_RECORD_ERROR_MESSAGES = {
  weightInput: '0以上の数値で入力してください',
  countInput: '0以上の整数で入力してください',
  blendItems: '配合は1〜4件、各比率は0以上、合計100%で入力してください',
  month: '対象月が正しくありません',
  greenBeanTotal: '生豆総量は0より大きい値で入力してください',
  powderPerPack: '1袋粉量は0より大きい値で入力してください',
  workDate: '作業日が正しくありません',
  handpickSegment: '区分は1回目または2回目を選択してください',
  handpickGreen: '今回生豆重量は0より大きい値で入力してください',
  roastWeight: '焙煎前後の重量を正しく入力してください',
  handpickEntryCollision: '同じ日付・区分・豆名の記録が既にあります。先にそちらを確認してください',
  roastEntryCollision: '同じ日付の焙煎記録が既にあります。先にそちらを確認してください',
  packageEntryCollision: '同じ日付のパッケージ記録が既にあります。先にそちらを確認してください',
} as const;

export function isValidProductionMonth(month: string): boolean {
  if (!WORK_MONTH_PATTERN.test(month)) {
    return false;
  }

  const [, monthText] = month.split('-');
  const monthNumber = Number(monthText);
  return monthNumber >= 1 && monthNumber <= 12;
}

export function isValidWorkDate(date: string): boolean {
  if (!WORK_DATE_PATTERN.test(date)) {
    return false;
  }

  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

// 当月を yyyy-MM で返す（ローカル時刻=現場のJST基準）。新規作成フォームの初期値に使う。
// 日付キーは toISOString() を使わず getMonth()+1 で組む（UTCずれで月がまたがるのを防ぐ）。
export function getCurrentProductionMonth(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// 今日を yyyy-MM-dd で返す（ローカル時刻=現場のJST基準）。入力モーダルの作業日初期値に使う。
export function getTodayWorkDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateDefectRate(defectTotalGram: number, handpickedTotalGram: number): number {
  if (handpickedTotalGram <= 0) {
    return 0;
  }
  return defectTotalGram / handpickedTotalGram;
}

export function calculateUsableGreenGram(handpickedTotalGram: number, defectTotalGram: number): number {
  return Math.max(0, handpickedTotalGram - defectTotalGram);
}

export function calculatePremixBags(usableGreenGram: number): { bags: number; remainderGram: number } {
  const usable = usableGreenGram < 0 ? 0 : usableGreenGram;
  return {
    bags: Math.floor(usable / PREMIX_BAG_GRAM),
    remainderGram: usable % PREMIX_BAG_GRAM,
  };
}

export function calculateRoastYield(beforeTotalGram: number, afterTotalGram: number): number {
  if (beforeTotalGram <= 0) {
    return 0;
  }
  return afterTotalGram / beforeTotalGram;
}

export function calculateMoistureLossRate(roastYield: number): number {
  if (roastYield <= 0) {
    return 0;
  }
  return 1 - roastYield;
}

export function calculateDailyTheoryPacks(afterRoastGram: number, powderPerPackGram: number): number {
  if (powderPerPackGram <= 0) {
    return 0;
  }
  return Math.floor(afterRoastGram / powderPerPackGram);
}

export function calculateThirtyKgTheoryPacks(
  defectRate: number,
  roastYield: number,
  powderPerPackGram: number
): number {
  if (powderPerPackGram <= 0 || roastYield <= 0) {
    return 0;
  }
  // 欠点率が1を超える異常入力では (1 - defectRate) が負になるため、0でクランプして負の袋数を防ぐ
  // （calculateUsableGreenGram / calculatePremixBags と同じ非負クランプ方針）
  return Math.floor((THIRTY_KG_BASE_GRAM * Math.max(0, 1 - defectRate) * roastYield) / powderPerPackGram);
}

export function calculatePackageTotals(
  teamA: TeamCounts,
  teamB: TeamCounts
): { goodTotal: number; defectiveTotal: number; producedTotal: number; defectRate: number } {
  const goodTotal = teamA.goodCount + teamB.goodCount;
  const defectiveTotal = teamA.defectiveCount + teamB.defectiveCount;
  const producedTotal = goodTotal + defectiveTotal;
  const defectRate = producedTotal <= 0 ? 0 : defectiveTotal / producedTotal;

  return { goodTotal, defectiveTotal, producedTotal, defectRate };
}

export function buildBlendLabel(blendItems: BlendItem[]): string {
  return blendItems.map((item) => `${item.beanName} ${item.ratioPercent}%`).join(' / ');
}

export function sumHandpick(entries: HandpickEntry[]): {
  handpickedTotalGram: number;
  defectTotalGram: number;
} {
  return entries.reduce(
    (acc, entry) => ({
      handpickedTotalGram: acc.handpickedTotalGram + entry.greenBeanWeightGram,
      defectTotalGram: acc.defectTotalGram + entry.defectBeanWeightGram,
    }),
    { handpickedTotalGram: 0, defectTotalGram: 0 }
  );
}

export function sumRoast(entries: RoastEntry[]): { beforeTotalGram: number; afterTotalGram: number } {
  return entries.reduce(
    (acc, entry) => ({
      beforeTotalGram: acc.beforeTotalGram + entry.beforeRoastWeightGram,
      afterTotalGram: acc.afterTotalGram + entry.afterRoastWeightGram,
    }),
    { beforeTotalGram: 0, afterTotalGram: 0 }
  );
}

export function sumPackage(entries: PackageEntry[]): {
  goodTotal: number;
  defectiveTotal: number;
  producedTotal: number;
} {
  return entries.reduce(
    (acc, entry) => {
      const totals = calculatePackageTotals(entry.teamA, entry.teamB);
      return {
        goodTotal: acc.goodTotal + totals.goodTotal,
        defectiveTotal: acc.defectiveTotal + totals.defectiveTotal,
        producedTotal: acc.producedTotal + totals.producedTotal,
      };
    },
    { goodTotal: 0, defectiveTotal: 0, producedTotal: 0 }
  );
}

export function buildMonthlySummary(
  monthDoc: ProductionRecordMonth,
  handpickEntries: HandpickEntry[],
  roastEntries: RoastEntry[],
  packageEntries: PackageEntry[]
): ProductionRecordMonthlySummary {
  const handpickTotals = sumHandpick(handpickEntries);
  const roastTotals = sumRoast(roastEntries);
  const packageTotals = sumPackage(packageEntries);

  const defectRate = calculateDefectRate(handpickTotals.defectTotalGram, handpickTotals.handpickedTotalGram);
  const roastYield = calculateRoastYield(roastTotals.beforeTotalGram, roastTotals.afterTotalGram);
  const moistureLossRate = calculateMoistureLossRate(roastYield);
  const usableGreenGram = calculateUsableGreenGram(handpickTotals.handpickedTotalGram, handpickTotals.defectTotalGram);
  const premix = calculatePremixBags(usableGreenGram);
  const thirtyKgTheoryPacks = calculateThirtyKgTheoryPacks(defectRate, roastYield, monthDoc.powderPerPackGram);
  const packageLossRate =
    packageTotals.producedTotal <= 0 ? 0 : packageTotals.defectiveTotal / packageTotals.producedTotal;

  return {
    month: monthDoc.month,
    blendLabel: buildBlendLabel(monthDoc.blendItems),
    greenBeanTotalGram: monthDoc.greenBeanTotalGram,
    defectBeanTotalGram: handpickTotals.defectTotalGram,
    defectRate,
    roastBeforeTotalGram: roastTotals.beforeTotalGram,
    roastAfterTotalGram: roastTotals.afterTotalGram,
    roastYield,
    moistureLossRate,
    premixBags: premix.bags,
    premixRemainderGram: premix.remainderGram,
    thirtyKgTheoryPacks,
    monthlyGoodCount: packageTotals.goodTotal,
    monthlyDefectiveCount: packageTotals.defectiveTotal,
    monthlyProducedCount: packageTotals.producedTotal,
    packageLossRate,
  };
}

export function normalizeWeightInput(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(PRODUCTION_RECORD_ERROR_MESSAGES.weightInput);
  }
  return value;
}

export function normalizeCountInput(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(PRODUCTION_RECORD_ERROR_MESSAGES.countInput);
  }
  return value;
}

export function validateBlendItems(items: BlendItem[]): void {
  if (items.length < 1 || items.length > MAX_BLEND_ITEMS) {
    throw new Error(PRODUCTION_RECORD_ERROR_MESSAGES.blendItems);
  }

  let sum = 0;
  for (const item of items) {
    if (!Number.isFinite(item.ratioPercent) || item.ratioPercent < 0) {
      throw new Error(PRODUCTION_RECORD_ERROR_MESSAGES.blendItems);
    }
    sum += item.ratioPercent;
  }

  if (sum !== 100) {
    throw new Error(PRODUCTION_RECORD_ERROR_MESSAGES.blendItems);
  }
}

export function buildProductionRecordMonth(input: ProductionRecordMonthInput): ProductionRecordMonthInput {
  if (!isValidProductionMonth(input.month)) {
    throw new Error(PRODUCTION_RECORD_ERROR_MESSAGES.month);
  }
  validateBlendItems(input.blendItems);
  if (!(input.greenBeanTotalGram > 0)) {
    throw new Error(PRODUCTION_RECORD_ERROR_MESSAGES.greenBeanTotal);
  }
  if (!(input.powderPerPackGram > 0)) {
    throw new Error(PRODUCTION_RECORD_ERROR_MESSAGES.powderPerPack);
  }

  return {
    month: input.month,
    greenBeanTotalGram: input.greenBeanTotalGram,
    powderPerPackGram: input.powderPerPackGram,
    blendItems: input.blendItems,
  };
}

export function buildHandpickEntry(input: HandpickEntryInput): HandpickEntryInput {
  if (!isValidWorkDate(input.workDate)) {
    throw new Error(PRODUCTION_RECORD_ERROR_MESSAGES.workDate);
  }
  if (input.segment !== 'first' && input.segment !== 'second') {
    throw new Error(PRODUCTION_RECORD_ERROR_MESSAGES.handpickSegment);
  }
  if (!(input.greenBeanWeightGram > 0)) {
    throw new Error(PRODUCTION_RECORD_ERROR_MESSAGES.handpickGreen);
  }
  const defectBeanWeightGram = normalizeWeightInput(input.defectBeanWeightGram);

  return {
    workDate: input.workDate,
    beanName: input.beanName,
    segment: input.segment,
    greenBeanWeightGram: input.greenBeanWeightGram,
    defectBeanWeightGram,
  };
}

export function buildRoastEntry(input: RoastEntryInput): RoastEntryInput {
  if (!isValidWorkDate(input.workDate)) {
    throw new Error(PRODUCTION_RECORD_ERROR_MESSAGES.workDate);
  }
  if (!(input.beforeRoastWeightGram > 0) || !(input.afterRoastWeightGram > 0)) {
    throw new Error(PRODUCTION_RECORD_ERROR_MESSAGES.roastWeight);
  }
  if (input.afterRoastWeightGram > input.beforeRoastWeightGram) {
    throw new Error(PRODUCTION_RECORD_ERROR_MESSAGES.roastWeight);
  }

  return {
    workDate: input.workDate,
    beforeRoastWeightGram: input.beforeRoastWeightGram,
    afterRoastWeightGram: input.afterRoastWeightGram,
  };
}

export function buildPackageEntry(input: PackageEntryInput): PackageEntryInput {
  if (!isValidWorkDate(input.workDate)) {
    throw new Error(PRODUCTION_RECORD_ERROR_MESSAGES.workDate);
  }

  return {
    workDate: input.workDate,
    teamA: {
      goodCount: normalizeCountInput(input.teamA.goodCount),
      defectiveCount: normalizeCountInput(input.teamA.defectiveCount),
    },
    teamB: {
      goodCount: normalizeCountInput(input.teamB.goodCount),
      defectiveCount: normalizeCountInput(input.teamB.defectiveCount),
    },
  };
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

// 対象月(yyyy-MM)を本社報告用の「YYYY年M月分」表記に変換する（CSV・画面ラベル共通）
export function formatProductionMonthLabel(month: string): string {
  const [year, monthPart] = month.split('-');
  if (!year || !monthPart) {
    return month;
  }
  return `${year}年${Number(monthPart)}月分`;
}

export function formatKg(gram: number): string {
  return (gram / 1000).toFixed(2);
}

export function escapeCsvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildProductionRecordCsv(summary: ProductionRecordMonthlySummary): string {
  const header = [
    '対象月',
    '配合',
    '生豆重量kg',
    '欠点豆重量g',
    '欠点率',
    '焙煎後重量kg',
    // 焙煎後重量はアフターピック後に計測する運用のため、この値は「水分蒸発＋アフターピック損失」の合算ロス
    '焙煎ロス率',
    '30kg理論袋数',
    '月良品数',
    '月不良品数',
    '月生産個数',
    'パッケージロス率',
  ];

  const dataRow: Array<string | number> = [
    formatProductionMonthLabel(summary.month),
    summary.blendLabel,
    formatKg(summary.greenBeanTotalGram),
    summary.defectBeanTotalGram,
    formatPercent(summary.defectRate),
    formatKg(summary.roastAfterTotalGram),
    formatPercent(summary.moistureLossRate),
    summary.thirtyKgTheoryPacks,
    summary.monthlyGoodCount,
    summary.monthlyDefectiveCount,
    summary.monthlyProducedCount,
    formatPercent(summary.packageLossRate),
  ];

  const rows = [header, dataRow.map((cell) => String(cell))];
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}`;
}

export function getProductionRecordCsvFileName(month: string): string {
  return `production-record-${month}.csv`;
}
