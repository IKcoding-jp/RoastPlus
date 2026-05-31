'use client';

import { MdCheck } from 'react-icons/md';
import { Card, Button, Badge, EmptyState } from '@/components/ui';
import { selectReorderItems, STATUS_LABELS, CATEGORY_LABELS } from '@/lib/inventory';
import type { InventoryItem, InventoryStatus } from '@/types';

// 状態を色で直感的に伝えるための配色バリアント。
// low（少ない）= 警告(黄系)、out（切れた）= 危険(赤系)。
type ReorderVariant = 'warning' | 'danger';

// 行の左端に表示する状態インジケーターの色（一目で 🟡🔴 を見分けるため）。
const ACCENT_CLASS: Record<ReorderVariant, string> = {
  warning: 'bg-warning',
  danger: 'bg-danger',
};

function getReorderVariant(status: InventoryStatus): ReorderVariant {
  return status === 'out' ? 'danger' : 'warning';
}

interface ReorderListProps {
  items: InventoryItem[];
  onResolve: (item: InventoryItem) => void;
}

export function ReorderList({ items, onResolve }: ReorderListProps) {
  const reorder = selectReorderItems(items);

  if (reorder.length === 0) {
    return <EmptyState title="要発注なし" description="不足している品目はありません" />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {reorder.map((item) => {
        const variant = getReorderVariant(item.status);
        return (
          <li key={item.id}>
            <Card variant="table">
              <div className="flex items-stretch">
                {/* 状態を色で示す左端アクセントバー */}
                <span className={`w-1.5 shrink-0 ${ACCENT_CLASS[variant]}`} aria-hidden="true" />
                <div className="flex flex-1 items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-bold text-ink">{item.name}</span>
                      <Badge variant={variant}>{STATUS_LABELS[item.status]}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-ink-sub">{CATEGORY_LABELS[item.category]}</div>
                  </div>
                  <Button
                    variant="success"
                    onClick={() => onResolve(item)}
                    className="shrink-0 gap-2"
                    aria-label={`${item.name}を対応済みにする`}
                  >
                    <MdCheck className="h-5 w-5" aria-hidden="true" />
                    対応済みにする
                  </Button>
                </div>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
