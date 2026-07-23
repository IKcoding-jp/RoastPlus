'use client';

import { useEffect, useState } from 'react';
import { subscribeInventoryItems } from '@/lib/firestore';
import type { InventoryItem } from '@/types';

/**
 * `users/{userId}/inventory` をリアルタイム購読するフック。
 * @param userId 未確定（未ログイン判定前）の間は null を渡す。null の間は購読しない。
 * @returns { items, isLoading }
 */
export function useInventory(userId: string | null): { items: InventoryItem[]; isLoading: boolean } {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- userId 確定前の初期化に必要
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeInventoryItems(
      userId,
      (next) => {
        setItems(next);
        setIsLoading(false);
      },
      (error) => {
        console.error('Failed to subscribe inventory items:', error);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  return { items, isLoading };
}
