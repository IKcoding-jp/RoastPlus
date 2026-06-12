/**
 * productionRecords コレクションの Zod スキーマ（Firestore 読み取り境界の検証用）
 *
 * PoC: #504 — Firestore境界への実行時スキーマ検証導入
 *
 * 使用方針:
 * - 読み取り（onSnapshot / getDoc）時に safeParse でデータを検証する
 * - 検証失敗時は console.warn でイシューを記録し、既存の手動正規化へフォールバックする
 * - タイムスタンプ（createdAt / updatedAt）は Firestore SDK が管理するため検証対象外
 */

import { z } from 'zod';

export const BlendItemSchema = z.object({
  beanName: z.string(),
  ratioPercent: z.number(),
});

export const ProductionRecordMonthDocSchema = z.object({
  month: z.string(),
  greenBeanTotalGram: z.number(),
  powderPerPackGram: z.number(),
  blendItems: z.array(BlendItemSchema),
});

export const HandpickSegmentSchema = z.union([z.literal('first'), z.literal('second')]);

export const HandpickEntryDocSchema = z.object({
  workDate: z.string(),
  beanName: z.string(),
  segment: HandpickSegmentSchema,
  greenBeanWeightGram: z.number(),
  defectBeanWeightGram: z.number(),
});

export const RoastEntryDocSchema = z.object({
  workDate: z.string(),
  beforeRoastWeightGram: z.number(),
  afterRoastWeightGram: z.number(),
});

export const TeamCountsSchema = z.object({
  goodCount: z.number(),
  defectiveCount: z.number(),
});

export const PackageEntryDocSchema = z.object({
  workDate: z.string(),
  teamA: TeamCountsSchema,
  teamB: TeamCountsSchema,
});

export type ProductionRecordMonthDoc = z.infer<typeof ProductionRecordMonthDocSchema>;
export type HandpickEntryDoc = z.infer<typeof HandpickEntryDocSchema>;
export type RoastEntryDoc = z.infer<typeof RoastEntryDocSchema>;
export type PackageEntryDoc = z.infer<typeof PackageEntryDocSchema>;
