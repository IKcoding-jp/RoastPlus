'use client';

import { FiCheck, FiCheckCircle } from 'react-icons/fi';
import { Card, Button } from '@/components/ui';
import { selectReorderItems, CATEGORY_LABELS, formatUpdatedBy } from '@/lib/inventory';
import { STATUS_VISUAL } from './statusVisual';
import type { InventoryItem } from '@/types';

interface ReorderListProps {
  items: InventoryItem[];
  onResolve: (item: InventoryItem) => void;
}

/**
 * 要発注リスト。1枚のカード内に行を border で区切って並べるリスト型。
 * 各行は「品目名 + 状態タグ(淡色) + 補足」と、塗らない success ゴーストの「対応済みにする」。
 * 空のときは安心感のあるチェック付きメッセージを出す。
 */
export function ReorderList({ items, onResolve }: ReorderListProps) {
  const reorder = selectReorderItems(items);

  return (
    <Card variant="table">
      {reorder.length === 0 ? (
        <div className="flex items-center gap-2.5 p-4 text-sm text-ink-sub">
          <FiCheckCircle className="h-[18px] w-[18px] shrink-0 text-success" aria-hidden="true" />
          発注が必要な品目はありません。
        </div>
      ) : (
        <ul className="divide-y divide-edge-subtle">
          {reorder.map((item) => {
            const visual = STATUS_VISUAL[item.status];
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-ink">{item.name}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-bold ${visual.subtleBg} ${visual.text}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${visual.dot}`} aria-hidden="true" />
                      {visual.label}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    {CATEGORY_LABELS[item.category]} · {formatUpdatedBy(item.updatedBy)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => onResolve(item)}
                  aria-label={`${item.name}を対応済みにする`}
                  className="shrink-0 gap-1.5 !border !border-success !text-success hover:!bg-success-subtle max-sm:w-full"
                >
                  <FiCheck className="h-4 w-4" aria-hidden="true" />
                  対応済みにする
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
