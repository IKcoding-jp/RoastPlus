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
