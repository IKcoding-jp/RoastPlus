import type { InventoryCategory, InventoryItem, InventoryItemInput, InventoryStatus } from '@/types';

export const STATUS_LABELS: Record<InventoryStatus, string> = {
  enough: '十分',
  low: '少ない',
  out: '切れた',
};

export const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  'green-bean': '生豆',
  material: '資材',
  consumable: '消耗品',
};

const VALID_STATUSES: InventoryStatus[] = ['enough', 'low', 'out'];
const VALID_CATEGORIES: InventoryCategory[] = ['green-bean', 'material', 'consumable'];

export function normalizeInventoryStatus(value: unknown): InventoryStatus {
  return VALID_STATUSES.includes(value as InventoryStatus) ? (value as InventoryStatus) : 'enough';
}

export function normalizeInventoryCategory(value: unknown): InventoryCategory {
  return VALID_CATEGORIES.includes(value as InventoryCategory) ? (value as InventoryCategory) : 'consumable';
}

/** low / out が「要発注」状態 */
export function isReorderStatus(status: InventoryStatus): boolean {
  return status === 'low' || status === 'out';
}

export function selectReorderItems(items: InventoryItem[]): InventoryItem[] {
  return items.filter((item) => isReorderStatus(item.status));
}

export function countReorderItems(items: InventoryItem[]): number {
  return selectReorderItems(items).length;
}

/**
 * 入力を正規化し保存可能な形にする。
 * name をトリムし空なら例外。note は空白のみなら省略。status/category を正規化。
 */
export function buildInventoryItemInput(input: InventoryItemInput): InventoryItemInput {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new Error('品目名を入力してください');
  }
  const note = input.note?.trim();
  const result: InventoryItemInput = {
    name,
    category: normalizeInventoryCategory(input.category),
    status: normalizeInventoryStatus(input.status),
  };
  if (note && note.length > 0) {
    result.note = note;
  }
  return result;
}
