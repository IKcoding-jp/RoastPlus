'use client';

import { useEffect, useState } from 'react';
import { subscribeInventoryItems } from '@/lib/firestore';
import type { InventoryItem } from '@/types';

/**
 * トップレベル共有コレクション `inventory` をリアルタイム購読するフック。
 * @returns { items, isLoading }
 */
export function useInventory(): { items: InventoryItem[]; isLoading: boolean } {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 購読開始のローディング同期に必要
    setIsLoading(true);
    const unsubscribe = subscribeInventoryItems(
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
  }, []);

  return { items, isLoading };
}
