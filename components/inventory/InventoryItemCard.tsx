'use client';

import { MdEdit, MdDelete } from 'react-icons/md';
import { Badge, Card, IconButton } from '@/components/ui';
import { StatusToggle } from '@/components/inventory/StatusToggle';
import { CATEGORY_LABELS } from '@/lib/inventory';
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

/**
 * 最終更新者の表示名を整形する。
 * メール形式（@を含む）なら @ より前のローカル部だけを表示し、
 * 共有現場で個人のメールアドレス全体が露出しないようにする。
 * displayName（@を含まない）はそのまま返す。
 */
function formatUpdatedBy(updatedBy: string): string {
  const atIndex = updatedBy.indexOf('@');
  return atIndex > 0 ? updatedBy.slice(0, atIndex) : updatedBy;
}

interface InventoryItemCardProps {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onStatusChange: (item: InventoryItem, status: InventoryStatus) => void;
}

/**
 * 全品目一覧の1品目カード。
 * 上段=品目名+カテゴリ+編集/削除、中段=在庫状態トグル、下段=最終更新。
 */
export function InventoryItemCard({ item, onEdit, onDelete, onStatusChange }: InventoryItemCardProps) {
  const updatedAtLabel = formatUpdatedAt(item.updatedAt);

  return (
    <Card variant="table" className="p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-bold text-ink">{item.name}</div>
            <Badge variant="secondary" size="sm" className="mt-1">
              {CATEGORY_LABELS[item.category]}
            </Badge>
          </div>
          <div className="flex shrink-0 gap-1">
            <IconButton variant="default" aria-label={`${item.name}を編集`} onClick={() => onEdit(item)}>
              <MdEdit className="h-5 w-5" />
            </IconButton>
            <IconButton variant="danger" aria-label={`${item.name}を削除`} onClick={() => onDelete(item)}>
              <MdDelete className="h-5 w-5" />
            </IconButton>
          </div>
        </div>

        <StatusToggle value={item.status} onChange={(status) => onStatusChange(item, status)} />

        {item.updatedBy && (
          <div className="text-xs text-ink-muted">
            最終更新: {formatUpdatedBy(item.updatedBy)}
            {updatedAtLabel && ` (${updatedAtLabel})`}
          </div>
        )}
      </div>
    </Card>
  );
}
