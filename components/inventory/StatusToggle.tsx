'use client';

import { Button } from '@/components/ui';
import { STATUS_VISUAL, STATUS_VISUAL_ORDER } from './statusVisual';
import type { InventoryStatus } from '@/types';

interface StatusToggleProps {
  value: InventoryStatus;
  onChange: (status: InventoryStatus) => void;
  disabled?: boolean;
}

/**
 * 在庫状態のセグメントコントロール。
 * ニュートラルの外枠(bg-ground)の中で、選択中の1つだけが状態色で塗られる。
 * 各セグメントは「ドット + ラベル」で状態を示し、色だけに依存しない。
 */
export function StatusToggle({ value, onChange, disabled }: StatusToggleProps) {
  return (
    <div
      className="inline-flex w-full gap-0.5 rounded-[10px] border border-edge bg-ground p-0.5 sm:w-auto"
      role="group"
      aria-label="在庫状態"
    >
      {STATUS_VISUAL_ORDER.map((status) => {
        const visual = STATUS_VISUAL[status];
        const selected = status === value;
        return (
          <Button
            key={status}
            type="button"
            variant="ghost"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(status)}
            className={`!min-h-0 h-[34px] flex-1 gap-1.5 rounded-[7px] !px-3 !py-0 text-[13px] font-bold transition-colors motion-reduce:transition-none sm:min-w-[72px] sm:flex-none ${
              selected
                ? `${visual.segActive} shadow-sm hover:opacity-95`
                : 'bg-transparent text-ink-muted hover:bg-transparent hover:text-ink-sub'
            }`}
          >
            <span
              className={`h-[7px] w-[7px] shrink-0 rounded-full bg-current ${selected ? 'opacity-100' : 'opacity-50'}`}
              aria-hidden="true"
            />
            {visual.label}
          </Button>
        );
      })}
    </div>
  );
}
