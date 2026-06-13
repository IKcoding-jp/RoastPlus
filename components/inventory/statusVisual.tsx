import { STATUS_LABELS } from '@/lib/inventory';
import type { InventoryStatus } from '@/types';

/**
 * 在庫状態(十分/少ない/切れた)の視覚表現を一元定義する。
 *
 * StatusToggle(セグメントコントロール) / InventoryItemRow / ReorderList が必ずこの定義を参照し、
 * 表現を統一する。色は既存のセマンティックCSS変数(--success/--warning/--danger とその -subtle)を
 * Tailwindユーティリティ経由で参照し、ハードコード色は使わず7テーマで自動対応する。
 *
 * 状態は色だけに頼らず「色 + ドット + 日本語ラベル」で示し、セグメントは選択中のみ着色する。
 */
export interface StatusVisual {
  /** 日本語ラベル（十分/少ない/切れた） */
  label: string;
  /** セグメント選択中の塗り(背景+文字色)。 */
  segActive: string;
  /** 淡色チップの背景（要発注タグ用） */
  subtleBg: string;
  /** 状態色のテキスト */
  text: string;
  /** 状態ドットの色 */
  dot: string;
}

export const STATUS_VISUAL: Record<InventoryStatus, StatusVisual> = {
  enough: {
    label: STATUS_LABELS.enough,
    segActive: 'bg-success text-white',
    subtleBg: 'bg-success-subtle',
    text: 'text-success',
    dot: 'bg-success',
  },
  low: {
    label: STATUS_LABELS.low,
    segActive: 'bg-warning text-white',
    subtleBg: 'bg-warning-subtle',
    text: 'text-warning',
    dot: 'bg-warning',
  },
  out: {
    label: STATUS_LABELS.out,
    segActive: 'bg-danger text-white',
    subtleBg: 'bg-danger-subtle',
    text: 'text-danger',
    dot: 'bg-danger',
  },
};

/** トグルで状態を並べる順序（十分 → 少ない → 切れた） */
export const STATUS_VISUAL_ORDER: InventoryStatus[] = ['enough', 'low', 'out'];
