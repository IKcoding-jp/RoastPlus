'use client';

import { Button } from '@/components/ui';
import { STATUS_LABELS } from '@/lib/inventory';
import type { InventoryStatus } from '@/types';

const STATUS_ORDER: InventoryStatus[] = ['enough', 'low', 'out'];

/**
 * 信号機メタファーで状態を色分けする。選択中のみ着色し、未選択は ghost。
 * enough=success(緑) / low=warning(黄) / out=danger(赤)。
 * Button の variant 取りうる値は components/ui/Button.tsx の ButtonProps で確認済み。
 */
const SELECTED_VARIANT: Record<InventoryStatus, 'success' | 'warning' | 'danger'> = {
  enough: 'success',
  low: 'warning',
  out: 'danger',
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
        return (
          <Button
            key={status}
            type="button"
            size="lg"
            variant={selected ? SELECTED_VARIANT[status] : 'ghost'}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(status)}
            className="flex-1"
          >
            {STATUS_LABELS[status]}
          </Button>
        );
      })}
    </div>
  );
}
