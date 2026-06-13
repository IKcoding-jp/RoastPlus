'use client';

import { STATUS_VISUAL, STATUS_VISUAL_ORDER } from './statusVisual';
import type { InventoryStatus } from '@/types';

interface StatusToggleProps {
  value: InventoryStatus;
  onChange: (status: InventoryStatus) => void;
  disabled?: boolean;
}

/**
 * 在庫状態のセグメントコントロール。
 *
 * ニュートラルの外枠(bg-ground)の中で、選択中の1つだけが状態色で塗られる。
 * 各セグメントは「ドット + ラベル」で示し、未選択はドット・文字とも薄いグレー(currentColor)。
 *
 * 共通 Button はタップ用に min-height が大きく、コンパクトなセグメント表現に合わないため、
 * ここでは専用の小ボタンを用いる。生 button の使用はこの特殊コントロールに限った意図的なもの。
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
        // 選択中は状態色で塗り(statusVisual.segActive)、未選択はドット・文字とも薄いグレー
        const stateClass = selected
          ? `${visual.segActive} shadow-sm`
          : 'bg-transparent text-ink-muted hover:text-ink-sub';
        return (
          // eslint-disable-next-line local/no-raw-button -- セグメントコントロール専用の小ボタン。共通Buttonはサイズが合わない
          <button
            key={status}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(status)}
            className={`inline-flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-[7px] px-3 text-[13px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-spot/40 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[72px] sm:flex-none ${stateClass}`}
          >
            <span
              className={`h-[7px] w-[7px] shrink-0 rounded-full bg-current ${selected ? 'opacity-100' : 'opacity-50'}`}
              aria-hidden="true"
            />
            {visual.label}
          </button>
        );
      })}
    </div>
  );
}
