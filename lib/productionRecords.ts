import type { BlendItem, HandpickEntry, PackageEntry, RoastEntry, TeamCounts } from '@/types';

const WORK_MONTH_PATTERN = /^\d{4}-\d{2}$/;
const WORK_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const DEFAULT_POWDER_PER_PACK_GRAM = 8.5;
export const PREMIX_BAG_GRAM = 500;
export const THIRTY_KG_BASE_GRAM = 30000;
export const MAX_BLEND_ITEMS = 4;

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
