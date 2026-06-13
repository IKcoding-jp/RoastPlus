'use client';

import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { IconButton } from '@/components/ui';
import { StatusToggle } from './StatusToggle';
import { toJSDate } from '@/lib/firestoreUtils';
import type { FirestoreTimestamp, InventoryItem, InventoryStatus } from '@/types';

/**
 * 最終更新時刻を「M/D HH:mm」形式に整形する。
 * updatedAt が保留書き込み等で未確定（undefined/変換不能）なら null を返す。
 */
export function formatUpdatedAt(value: FirestoreTimestamp | undefined): string | null {
  const date = toJSDate(value);
  if (!date) {
    return null;
  }
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

interface InventoryItemRowProps {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onStatusChange: (item: InventoryItem, status: InventoryStatus) => void;
}

/**
 * 「すべての品目」リストの1行。カードの羅列ではなく、親カード内に border で区切って並べる行レイアウト。
 * 左=品目名+最終更新 / 中=状態セグメント / 右=編集・削除アイコン。
 * 狭い画面ではセグメントを名前の下に折り返す。
 */
export function InventoryItemRow({ item, onEdit, onDelete, onStatusChange }: InventoryItemRowProps) {
  const updatedAtLabel = formatUpdatedAt(item.updatedAt);

  return (
    <div className="flex flex-wrap items-center gap-3.5 px-4 py-3">
      <div className="min-w-0 flex-1">
        <span className="text-sm font-bold text-ink">{item.name}</span>
        {updatedAtLabel && <div className="mt-0.5 text-[11.5px] text-ink-muted">最終更新 {updatedAtLabel}</div>}
      </div>

      <div className="order-3 w-full sm:order-none sm:w-auto">
        <StatusToggle value={item.status} onChange={(status) => onStatusChange(item, status)} />
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton
          variant="ghost"
          aria-label={`${item.name}を編集`}
          onClick={() => onEdit(item)}
          className="!min-h-0 !min-w-0 h-8 w-8 !p-0"
        >
          <FiEdit2 className="h-4 w-4" />
        </IconButton>
        <IconButton
          variant="danger"
          aria-label={`${item.name}を削除`}
          onClick={() => onDelete(item)}
          className="!min-h-0 !min-w-0 h-8 w-8 !p-0"
        >
          <FiTrash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}
