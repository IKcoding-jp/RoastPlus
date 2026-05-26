export type ProductionPackRecordStatus = 'active' | 'cancelled';

export interface ProductionPackTeamCounts {
  successCount: number;
  failureCount: number;
}

export interface ProductionPackTotals {
  successTotal: number;
  failureTotal: number;
  total: number;
}

export interface ProductionPackRecordInput {
  workDate: string;
  teamA: ProductionPackTeamCounts;
  teamB: ProductionPackTeamCounts;
  note?: string;
}

export interface ProductionPackRecord extends ProductionPackRecordInput, ProductionPackTotals {
  status?: ProductionPackRecordStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProductionPackMonthlyDailyRecord extends ProductionPackTotals {
  workDate: string;
}

export interface ProductionPackMonthlySummary {
  month: string;
  totals: ProductionPackTotals;
  dailyRecords: ProductionPackMonthlyDailyRecord[];
}
