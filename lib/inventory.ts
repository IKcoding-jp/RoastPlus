import type { InventoryItem, InventoryItemInput, InventoryStatus } from '@/types';

export const STATUS_LABELS: Record<InventoryStatus, string> = {
  enough: '十分',
  low: '少ない',
  out: '切れた',
};

const VALID_STATUSES: InventoryStatus[] = ['enough', 'low', 'out'];

export function normalizeInventoryStatus(value: unknown): InventoryStatus {
  return VALID_STATUSES.includes(value as InventoryStatus) ? (value as InventoryStatus) : 'enough';
}

/** low / out が「要発注」状態 */
export function isReorderStatus(status: InventoryStatus): boolean {
  return status === 'low' || status === 'out';
}

/**
 * 要発注(low / out)品目を抽出する。
 * 緊急度順に out(切れた)を low(少ない)より前に並べる。
 * 同一 status 内は元の順序を維持する(Array.prototype.sort は安定ソート)。
 */
export function selectReorderItems(items: InventoryItem[]): InventoryItem[] {
  const reorderItems = items.filter((item) => isReorderStatus(item.status));
  const urgency: Record<'out' | 'low', number> = { out: 0, low: 1 };
  return reorderItems.sort((a, b) => urgency[a.status as 'out' | 'low'] - urgency[b.status as 'out' | 'low']);
}

export function countReorderItems(items: InventoryItem[]): number {
  return selectReorderItems(items).length;
}

/**
 * 入力を正規化し保存可能な形にする。
 * name をトリムし空なら例外。status を正規化する。
 */
export function buildInventoryItemInput(input: InventoryItemInput): InventoryItemInput {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new Error('品目名を入力してください');
  }
  return {
    name,
    status: normalizeInventoryStatus(input.status),
  };
}
