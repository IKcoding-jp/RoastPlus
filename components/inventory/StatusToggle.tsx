'use client';

import { Button } from '@/components/ui';
import { STATUS_LABELS } from '@/lib/inventory';
import type { InventoryStatus } from '@/types';

const STATUS_ORDER: InventoryStatus[] = ['enough', 'low', 'out'];

/**
 * 信号機メタファーで状態を色分けするセグメントコントロール。
 * 選択中は該当色で塗り、未選択は outline(枠付き)で 3 つが揃ったセグメントに見せる。
 * enough=success(緑) / low=warning(黄) / out=danger(赤)。
 * Button の variant 取りうる値は components/ui/Button.tsx の ButtonProps で確認済み。
 */
const SELECTED_VARIANT: Record<InventoryStatus, 'success' | 'warning' | 'danger'> = {
  enough: 'success',
  low: 'warning',
  out: 'danger',
};

/**
 * 未選択時の状態ドット色(セマンティック)。色覚多様性に配慮しラベル文字も併記する。
 */
const DOT_COLOR: Record<InventoryStatus, string> = {
  enough: 'bg-success',
  low: 'bg-warning',
  out: 'bg-danger',
};

interface StatusToggleProps {
  value: InventoryStatus;
  onChange: (status: InventoryStatus) => void;
  disabled?: boolean;
}

export function StatusToggle({ value, onChange, disabled }: StatusToggleProps) {
  return (
    <div className="flex gap-2" role="group" aria-label="在庫状態">
      {STATUS_ORDER.map((status) => {
        const selected = status === value;
        // warning(黄/金)背景はテーマ非依存の固定色。text-ink等のテーマ変数は
        // ダークテーマで明色に反転し再び読めなくなるため、黄背景上は固定の濃色で上書きする。
        // Button の className は variantStyles の後に連結されるため text-page を上書きできる。
        const warningTextOverride = selected && SELECTED_VARIANT[status] === 'warning' ? ' text-gray-900' : '';
        // 状態ドットの色: 未選択は信号機色(セマンティック)で直感化。選択中はボタンが
        // 該当色で塗られ文字が白/濃色になるため、ドットは bg-current で文字色を継承し視認性を確保する。
        const dotColor = selected ? 'bg-current' : DOT_COLOR[status];
        return (
          <Button
            key={status}
            type="button"
            size="lg"
            variant={selected ? SELECTED_VARIANT[status] : 'outline'}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(status)}
            className={`flex-1 gap-2${warningTextOverride}`}
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} aria-hidden="true" />
            {STATUS_LABELS[status]}
          </Button>
        );
      })}
    </div>
  );
}
