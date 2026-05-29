'use client';

import { useEffect, useState } from 'react';
import {
  subscribeProductionRecordMonth,
  subscribeHandpickEntries,
  subscribeRoastEntries,
  subscribePackageEntries,
} from '@/lib/firestore';
import type { ProductionRecordMonth, HandpickEntry, RoastEntry, PackageEntry } from '@/types';

/**
 * 月doc(productionRecords/{month})と handpick/roast/package の3サブコレクションを
 * まとめてリアルタイム購読するフック。
 * userId と month の両方が定義されている時のみ購読し、cleanupで全unsubscribeを呼ぶ。
 * @param userId ユーザーID
 * @param month 対象月(yyyy-MM)
 * @returns { monthDoc, handpickEntries, roastEntries, packageEntries, isLoading }
 */
export function useProductionRecord(
  userId: string | undefined,
  month: string | undefined
): {
  monthDoc: ProductionRecordMonth | null;
  handpickEntries: HandpickEntry[];
  roastEntries: RoastEntry[];
  packageEntries: PackageEntry[];
  isLoading: boolean;
} {
  const [monthDoc, setMonthDoc] = useState<ProductionRecordMonth | null>(null);
  const [handpickEntries, setHandpickEntries] = useState<HandpickEntry[]>([]);
  const [roastEntries, setRoastEntries] = useState<RoastEntry[]>([]);
  const [packageEntries, setPackageEntries] = useState<PackageEntry[]>([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(userId && month));

  useEffect(() => {
    if (!userId || !month) {
      // 購読条件を満たさない場合は初期値に戻す
      // queueMicrotaskでeffect内の同期setStateを回避（react-hooks/set-state-in-effect対策）
      queueMicrotask(() => {
        setMonthDoc(null);
        setHandpickEntries([]);
        setRoastEntries([]);
        setPackageEntries([]);
        setIsLoading(false);
      });
      return;
    }

    // 購読開始時はローディング状態にする（4購読の初回callbackが揃うまで）
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 購読開始のローディング同期に必要
    setIsLoading(true);

    // 4購読それぞれの初回callback受信を追跡し、4つ揃ったらisLoadingを解除する
    let readyMonth = false;
    let readyHandpick = false;
    let readyRoast = false;
    let readyPackage = false;

    const updateLoading = () => {
      if (readyMonth && readyHandpick && readyRoast && readyPackage) {
        setIsLoading(false);
      }
    };

    const unsubscribeMonth = subscribeProductionRecordMonth(
      userId,
      month,
      (m) => {
        setMonthDoc(m);
        readyMonth = true;
        updateLoading();
      },
      (error) => {
        console.error('Failed to subscribe production record month:', error);
        readyMonth = true;
        updateLoading();
      }
    );

    const unsubscribeHandpick = subscribeHandpickEntries(
      userId,
      month,
      (entries) => {
        setHandpickEntries(entries);
        readyHandpick = true;
        updateLoading();
      },
      (error) => {
        console.error('Failed to subscribe handpick entries:', error);
        readyHandpick = true;
        updateLoading();
      }
    );

    const unsubscribeRoast = subscribeRoastEntries(
      userId,
      month,
      (entries) => {
        setRoastEntries(entries);
        readyRoast = true;
        updateLoading();
      },
      (error) => {
        console.error('Failed to subscribe roast entries:', error);
        readyRoast = true;
        updateLoading();
      }
    );

    const unsubscribePackage = subscribePackageEntries(
      userId,
      month,
      (entries) => {
        setPackageEntries(entries);
        readyPackage = true;
        updateLoading();
      },
      (error) => {
        console.error('Failed to subscribe package entries:', error);
        readyPackage = true;
        updateLoading();
      }
    );

    return () => {
      unsubscribeMonth();
      unsubscribeHandpick();
      unsubscribeRoast();
      unsubscribePackage();
    };
  }, [userId, month]);

  return { monthDoc, handpickEntries, roastEntries, packageEntries, isLoading };
}
