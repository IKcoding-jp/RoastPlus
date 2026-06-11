import { useMemo } from 'react';
import {
  buildBlendLabel,
  buildMonthlySummary,
  buildProductionRecordCsv,
  calculatePremixBags,
  calculateRoastYield,
  calculateUsableGreenGram,
  getTodayWorkDate,
  sumHandpick,
  sumPackage,
  sumRoast,
} from '@/lib/productionRecords';
import type { HandpickEntry, PackageEntry, ProductionRecordMonth, RoastEntry } from '@/types';

/**
 * 月docと3種entriesから画面表示用の派生値（集計・サマリー・CSV・直近3件）を計算する。
 * lib/productionRecords の純粋関数を呼ぶだけのプレゼンテーション集約（page.tsx から移設）。
 */
export function useProductionRecordStats(
  monthDoc: ProductionRecordMonth | null,
  handpickEntries: HandpickEntry[],
  roastEntries: RoastEntry[],
  packageEntries: PackageEntry[]
) {
  const beanNames = useMemo(() => (monthDoc ? monthDoc.blendItems.map((item) => item.beanName) : []), [monthDoc]);
  const powderPerPackGram = monthDoc?.powderPerPackGram ?? 0;
  const defaultWorkDate = getTodayWorkDate();
  const blendLabel = monthDoc ? buildBlendLabel(monthDoc.blendItems) : '';

  const handpickTotals = useMemo(() => sumHandpick(handpickEntries), [handpickEntries]);
  // 欠点率 = 欠点豆合計 / ハンドピック済み合計（0除算はガード）
  const handpickDefectRate = useMemo(() => {
    const { handpickedTotalGram, defectTotalGram } = handpickTotals;
    return handpickedTotalGram <= 0 ? 0 : defectTotalGram / handpickedTotalGram;
  }, [handpickTotals]);

  // 焙煎：プレミックス袋数は使用可能生豆（ハンドピック済み−欠点）から算出
  const roastTotals = useMemo(() => sumRoast(roastEntries), [roastEntries]);
  const usableGreenGram = calculateUsableGreenGram(handpickTotals.handpickedTotalGram, handpickTotals.defectTotalGram);
  const premix = useMemo(() => calculatePremixBags(usableGreenGram), [usableGreenGram]);
  const roastYield = useMemo(
    () => calculateRoastYield(roastTotals.beforeTotalGram, roastTotals.afterTotalGram),
    [roastTotals]
  );

  const packageTotals = useMemo(() => sumPackage(packageEntries), [packageEntries]);

  // 月合計サマリーとそのCSV文字列（BOM/CRLF込み）。下部バー・モーダルの元データ
  const summary = useMemo(
    () => (monthDoc ? buildMonthlySummary(monthDoc, handpickEntries, roastEntries, packageEntries) : null),
    [monthDoc, handpickEntries, roastEntries, packageEntries]
  );
  const csvPreview = useMemo(() => (summary ? buildProductionRecordCsv(summary) : ''), [summary]);

  // 各列の最新3件（createdAt降順は購読側で保証済み）
  const recentHandpick = handpickEntries.slice(0, 3);
  const recentRoast = roastEntries.slice(0, 3);
  const recentPackage = packageEntries.slice(0, 3);

  return {
    beanNames,
    powderPerPackGram,
    defaultWorkDate,
    blendLabel,
    handpickTotals,
    handpickDefectRate,
    premix,
    roastYield,
    packageTotals,
    summary,
    csvPreview,
    recentHandpick,
    recentRoast,
    recentPackage,
  };
}
