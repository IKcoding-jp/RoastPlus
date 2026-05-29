import type { FirestoreTimestamp } from './common';

export interface BlendItem {
  beanName: string;
  ratioPercent: number;
}

export interface ProductionRecordMonthInput {
  month: string;
  greenBeanTotalGram: number;
  powderPerPackGram: number;
  blendItems: BlendItem[];
}

export interface ProductionRecordMonth extends ProductionRecordMonthInput {
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export type HandpickSegment = 'first' | 'second';

export interface HandpickEntryInput {
  workDate: string;
  beanName: string;
  segment: HandpickSegment;
  greenBeanWeightGram: number;
  defectBeanWeightGram: number;
}

export interface HandpickEntry extends HandpickEntryInput {
  id: string;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface RoastEntryInput {
  workDate: string;
  beforeRoastWeightGram: number;
  afterRoastWeightGram: number;
}

export interface RoastEntry extends RoastEntryInput {
  id: string;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface TeamCounts {
  goodCount: number;
  defectiveCount: number;
}

export interface PackageEntryInput {
  workDate: string;
  teamA: TeamCounts;
  teamB: TeamCounts;
}

export interface PackageEntry extends PackageEntryInput {
  id: string;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface ProductionRecordMonthlySummary {
  month: string;
  blendLabel: string;
  greenBeanTotalGram: number;
  defectBeanTotalGram: number;
  defectRate: number;
  roastBeforeTotalGram: number;
  roastAfterTotalGram: number;
  roastYield: number;
  moistureLossRate: number;
  premixBags: number;
  premixRemainderGram: number;
  thirtyKgTheoryPacks: number;
  monthlyGoodCount: number;
  monthlyDefectiveCount: number;
  monthlyProducedCount: number;
  packageLossRate: number;
}
