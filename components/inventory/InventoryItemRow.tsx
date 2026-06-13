'use client';

import { FiEdit2, FiTrash2, FiClock } from 'react-icons/fi';
import { IconButton } from '@/components/ui';
import { StatusToggle } from './StatusToggle';
import { STATUS_VISUAL } from './statusVisual';
import { toJSDate } from '@/lib/firestoreUtils';
import type { FirestoreTimestamp, InventoryItem, InventoryStatus } from '@/types';

/**
 * 最終更新時刻を「M/D HH:mm」形式に整形する。
 * updatedAt が保留書き込み等で未確定（undefined/変換不能）なら null を返す。
 */
function formatUpdatedAt(value: FirestoreTimestamp | undefined): string | null {
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
 * 「すべての品目」の1件カード。
 * 上段=状態ドット＋品目名＋編集/削除 / 中段=最終更新 / 下段=状態セグメント、の縦構成。
 * 1件ずつ独立したカードにし、状態を変えても並び順・タップ位置が動かないようにする。
 */
export function InventoryItemRow({ item, onEdit, onDelete, onStatusChange }: InventoryItemRowProps) {
  const updatedAtLabel = formatUpdatedAt(item.updatedAt);
  const visual = STATUS_VISUAL[item.status];

  return (
    <div className="rounded-xl border border-edge bg-surface p-3.5 shadow-card-glow">
      <div className="flex items-center gap-2">
        {/* 状態ドット（緑=十分 / アンバー=少ない / 赤=切れた）。一目で状態が分かる */}
        <span className={`h-[9px] w-[9px] shrink-0 rounded-full ${visual.dot}`} aria-hidden="true" />
        <span className="min-w-0 truncate text-sm font-bold text-ink">{item.name}</span>
        {/* 最終更新は品目名の横に置いてコンパクト化。estimate により値が消えずチラつかない */}
        {updatedAtLabel && (
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-ink-muted">
            <FiClock className="h-3 w-3 shrink-0" aria-hidden="true" />
            {updatedAtLabel}
          </span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
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
      <div className="mt-2.5">
        <StatusToggle value={item.status} onChange={(status) => onStatusChange(item, status)} />
      </div>
    </div>
  );
}
