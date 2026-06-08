'use client';

import { useEffect, useState } from 'react';
import {
  subscribeProductionRecordMonth,
  subscribeHandpickEntries,
  subscribeRoastEntries,
  subscribePackageEntries,
} from '@/lib/firestore';
import { readProductionRecordCache, writeProductionRecordCache } from '@/lib/productionRecordCache';
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

  // 対象が切り替わった瞬間に、描画の途中でキャッシュ値へ state を差し替える。
  // useEffect より一歩早く（=0/空が一瞬も見えない形で）前回値を入れるための公式パターン。
  // hydratedKey と現在の鍵が食い違う最初の描画でだけ走り、以降は走らない。
  const currentKey = userId && month ? `${userId}:${month}` : null;
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  if (currentKey !== hydratedKey) {
    setHydratedKey(currentKey);
    const cached = currentKey ? readProductionRecordCache(userId, month) : null;
    setMonthDoc(cached?.monthDoc ?? null);
    setHandpickEntries(cached?.handpickEntries ?? []);
    setRoastEntries(cached?.roastEntries ?? []);
    setPackageEntries(cached?.packageEntries ?? []);
  }

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

    // 次回オープン時に即描画するためのキャッシュ書き込み用。
    // state setter は非同期なので、最新値は別途ローカル変数で持ち回る。
    // 起点は前回キャッシュ（部分的な更新で良い値を空で潰さないため）。
    const cached = readProductionRecordCache(userId, month);
    let latestMonthDoc: ProductionRecordMonth | null = cached?.monthDoc ?? null;
    let latestHandpick: HandpickEntry[] = cached?.handpickEntries ?? [];
    let latestRoast: RoastEntry[] = cached?.roastEntries ?? [];
    let latestPackage: PackageEntry[] = cached?.packageEntries ?? [];

    const persist = () => {
      writeProductionRecordCache(userId, month, {
        monthDoc: latestMonthDoc,
        handpickEntries: latestHandpick,
        roastEntries: latestRoast,
        packageEntries: latestPackage,
      });
    };

    const unsubscribeMonth = subscribeProductionRecordMonth(
      userId,
      month,
      (m) => {
        setMonthDoc(m);
        latestMonthDoc = m;
        readyMonth = true;
        updateLoading();
        persist();
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
        latestHandpick = entries;
        readyHandpick = true;
        updateLoading();
        persist();
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
        latestRoast = entries;
        readyRoast = true;
        updateLoading();
        persist();
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
        latestPackage = entries;
        readyPackage = true;
        updateLoading();
        persist();
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
