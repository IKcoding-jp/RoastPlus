import { useEffect, useMemo, useState } from 'react';
import { useProductionRecord } from '@/hooks/useProductionRecord';
import type { ToastType } from '@/hooks/useToast';
import { subscribeRecentProductionMonths } from '@/lib/firestore/productionRecords';
import { readMonthListCache, writeMonthListCache } from '@/lib/productionRecordCache';
import { formatProductionMonthLabel, getCurrentProductionMonth } from '@/lib/productionRecords';
import type { ProductionRecordMonth } from '@/types';

/**
 * 生産記録ページのデータ源。月リストの購読・対象月state・月docと3種entriesの購読をまとめる。
 * user が確定した最初の描画でキャッシュを同期的に差し込み、「空状態↔グリッド」のちらつきを防ぐ。
 */
export function useProductionRecordData(
  userId: string | undefined,
  showToast: (message: string, type?: ToastType) => void
) {
  const [recentMonths, setRecentMonths] = useState<ProductionRecordMonth[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [newMonthInput, setNewMonthInput] = useState(getCurrentProductionMonth);

  // user が確定した最初の描画で、月リストをキャッシュから同期的に差し込む。
  // useEffect だと一度「空状態」が描画されてしまうため、描画の途中で入れて
  // 空状態↔グリッドの入替・対象月セレクトのポップインを防ぐ（フックと同じ公式パターン）。
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
  if (userId && userId !== hydratedUserId) {
    setHydratedUserId(userId);
    const cachedMonths = readMonthListCache(userId);
    if (cachedMonths && cachedMonths.length > 0) {
      setRecentMonths(cachedMonths);
      setSelectedMonth((prev) => prev || cachedMonths[0].month);
    }
  }

  // 月docと3種entriesを購読
  const { monthDoc, handpickEntries, roastEntries, packageEntries, isLoading } = useProductionRecord(
    userId,
    selectedMonth || undefined
  );

  // 月生産単位の一覧を購読（最新24件）。最初の取得で選択中月を初期化
  useEffect(() => {
    if (!userId) {
      return;
    }

    let hasInitialized = false;
    return subscribeRecentProductionMonths(
      userId,
      (months) => {
        setRecentMonths(months);
        // 次回オープン時に即描画するため、最新の月リストをキャッシュに保存
        writeMonthListCache(userId, months);
        // 初回のみ：最新月があればそれを選択する（以降はユーザー選択を尊重）
        if (!hasInitialized) {
          hasInitialized = true;
          if (months.length > 0) {
            setSelectedMonth(months[0].month);
          }
        }
      },
      () => {
        showToast('生産記録の読み込みに失敗しました', 'error');
        hasInitialized = true;
      }
    );
  }, [showToast, userId]);

  // 月セレクトの選択肢
  const monthOptions = useMemo(
    () => recentMonths.map((month) => ({ value: month.month, label: formatProductionMonthLabel(month.month) })),
    [recentMonths]
  );

  return {
    recentMonths,
    selectedMonth,
    setSelectedMonth,
    newMonthInput,
    setNewMonthInput,
    monthDoc,
    handpickEntries,
    roastEntries,
    packageEntries,
    isLoading,
    monthOptions,
  };
}
