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
export const PREMIX_BAG_GRAM = 500;
export const THIRTY_KG_BASE_GRAM = 30000;
export const MAX_BLEND_ITEMS = 4;

const WEIGHT_INPUT_ERROR = '0以上の数値で入力してください';
const COUNT_INPUT_ERROR = '0以上の整数で入力してください';
const BLEND_ITEMS_ERROR = '配合は1〜4件、各比率は0以上、合計100%で入力してください';
const MONTH_INPUT_ERROR = '対象月が正しくありません';
const GREEN_BEAN_TOTAL_ERROR = '生豆総量は0より大きい値で入力してください';
const POWDER_PER_PACK_ERROR = '1袋粉量は0より大きい値で入力してください';
const WORK_DATE_ERROR = '作業日が正しくありません';
const HANDPICK_SEGMENT_ERROR = '区分は1回目または2回目を選択してください';
const HANDPICK_GREEN_ERROR = '今回生豆重量は0より大きい値で入力してください';
const ROAST_WEIGHT_ERROR = '焙煎前後の重量を正しく入力してください';

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
  return Math.floor((THIRTY_KG_BASE_GRAM * (1 - defectRate) * roastYield) / powderPerPackGram);
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
  const usableGreenGram = calculateUsableGreenGram(
    handpickTotals.handpickedTotalGram,
    handpickTotals.defectTotalGram
  );
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
    throw new Error(WEIGHT_INPUT_ERROR);
  }
  return value;
}

export function normalizeCountInput(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(COUNT_INPUT_ERROR);
  }
  return value;
}

export function validateBlendItems(items: BlendItem[]): void {
  if (items.length < 1 || items.length > MAX_BLEND_ITEMS) {
    throw new Error(BLEND_ITEMS_ERROR);
  }

  let sum = 0;
  for (const item of items) {
    if (!Number.isFinite(item.ratioPercent) || item.ratioPercent < 0) {
      throw new Error(BLEND_ITEMS_ERROR);
    }
    sum += item.ratioPercent;
  }

  if (sum !== 100) {
    throw new Error(BLEND_ITEMS_ERROR);
  }
}

export function buildProductionRecordMonth(input: ProductionRecordMonthInput): ProductionRecordMonthInput {
  if (!isValidProductionMonth(input.month)) {
    throw new Error(MONTH_INPUT_ERROR);
  }
  validateBlendItems(input.blendItems);
  if (!(input.greenBeanTotalGram > 0)) {
    throw new Error(GREEN_BEAN_TOTAL_ERROR);
  }
  if (!(input.powderPerPackGram > 0)) {
    throw new Error(POWDER_PER_PACK_ERROR);
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
    throw new Error(WORK_DATE_ERROR);
  }
  if (input.segment !== 'first' && input.segment !== 'second') {
    throw new Error(HANDPICK_SEGMENT_ERROR);
  }
  if (!(input.greenBeanWeightGram > 0)) {
    throw new Error(HANDPICK_GREEN_ERROR);
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
    throw new Error(WORK_DATE_ERROR);
  }
  if (!(input.beforeRoastWeightGram > 0) || !(input.afterRoastWeightGram > 0)) {
    throw new Error(ROAST_WEIGHT_ERROR);
  }
  if (input.afterRoastWeightGram > input.beforeRoastWeightGram) {
    throw new Error(ROAST_WEIGHT_ERROR);
  }

  return {
    workDate: input.workDate,
    beforeRoastWeightGram: input.beforeRoastWeightGram,
    afterRoastWeightGram: input.afterRoastWeightGram,
  };
}

export function buildPackageEntry(input: PackageEntryInput): PackageEntryInput {
  if (!isValidWorkDate(input.workDate)) {
    throw new Error(WORK_DATE_ERROR);
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
