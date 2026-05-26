export const SEAL_CALCULATOR_RULES = {
  premixBagGrams: 500,
  roastedYieldRate: 0.8,
  gramsPerPack: 8.5,
  labelsPerSheet: 18,
  extraSheets: 2,
  shelfLifeMonths: 10,
} as const;

export function parsePremixBagCount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const bagCount = Number(trimmed);
  if (!Number.isFinite(bagCount) || bagCount <= 0) return null;

  return bagCount;
}

export function calculateRequiredSealSheets(premixBagCount: number): number {
  const labelCount =
    (premixBagCount * SEAL_CALCULATOR_RULES.premixBagGrams * SEAL_CALCULATOR_RULES.roastedYieldRate) /
    SEAL_CALCULATOR_RULES.gramsPerPack;

  return Math.ceil(labelCount / SEAL_CALCULATOR_RULES.labelsPerSheet) + SEAL_CALCULATOR_RULES.extraSheets;
}

export function calculateBestBeforeYearMonth(manufacturingYearMonth: string): string | null {
  const match = /^(\d{4})-(\d{2})$/.exec(manufacturingYearMonth);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;

  const date = new Date(Date.UTC(year, monthIndex + SEAL_CALCULATOR_RULES.shelfLifeMonths, 1));
  const bestBeforeYear = date.getUTCFullYear();
  const bestBeforeMonth = String(date.getUTCMonth() + 1).padStart(2, '0');

  return `${bestBeforeYear}-${bestBeforeMonth}`;
}

export function formatYearMonthLabel(yearMonth: string): string | null {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!match) return null;

  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  return `${match[1]}年${month}月`;
}
