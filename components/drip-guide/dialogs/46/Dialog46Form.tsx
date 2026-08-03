'use client';

import React from 'react';
import { BookOpen, CaretRight } from 'phosphor-react';
import { TASTE_LABELS, STRENGTH_LABELS, type Taste46, type Strength46 } from '@/lib/drip-guide/recipe46';
import { Button, Select } from '@/components/ui';

interface Dialog46FormProps {
  servings: number;
  taste: Taste46;
  strength: Strength46;
  onServingsChange: (servings: number) => void;
  onTasteChange: (taste: Taste46) => void;
  onStrengthChange: (strength: Strength46) => void;
  onDescriptionClick: () => void;
}

const FIELD_LABEL_STYLES = 'mb-2 block text-[11px] font-bold tracking-[0.1em] text-ink-muted';

interface SegmentGroupProps<T extends string> {
  options: T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
}

function SegmentGroup<T extends string>({ options, labels, value, onChange }: SegmentGroupProps<T>) {
  return (
    <div className="flex gap-1 rounded-[14px] border border-edge p-1">
      {options.map((option) => {
        const selected = value === option;
        return (
          <Button
            key={option}
            type="button"
            variant="ghost"
            aria-pressed={selected}
            onClick={() => onChange(option)}
            className={`!min-h-[44px] flex-1 whitespace-nowrap !rounded-[11px] !px-1 !py-2.5 !text-[13px] transition-colors touch-manipulation ${
              selected ? '!bg-spot !font-bold !text-on-spot' : '!font-semibold text-ink-sub! hover:bg-ground!'
            }`}
          >
            {labels[option]}
          </Button>
        );
      })}
    </div>
  );
}

export const Dialog46Form: React.FC<Dialog46FormProps> = ({
  servings,
  taste,
  strength,
  onServingsChange,
  onTasteChange,
  onStrengthChange,
  onDescriptionClick,
}) => {
  return (
    <div className="space-y-4">
      {/* 4:6メソッドの解説を開くリンク行 */}
      <Button
        type="button"
        variant="ghost"
        onClick={onDescriptionClick}
        className="min-h-0! flex w-full items-center gap-2.5 !justify-start rounded-2xl! border border-edge px-4! !py-3.5 text-left! transition-colors hover:bg-ground touch-manipulation"
      >
        <BookOpen size={18} className="shrink-0 text-spot" />
        <span className="flex-1 text-sm font-bold text-ink">4:6メソッドのポイント（必読）</span>
        <CaretRight size={14} className="shrink-0 text-ink-muted" />
      </Button>

      {/* 人前選択 */}
      <div>
        <label htmlFor="servings-46" className={FIELD_LABEL_STYLES}>
          人前
        </label>
        <Select
          id="servings-46"
          value={String(servings)}
          onChange={(e) => onServingsChange(parseInt(e.target.value, 10))}
          options={[1, 2, 3, 4, 5, 6, 7, 8].map((s) => ({
            value: String(s),
            label: `${s}人前 (${s * 10}g / ${s * 150}g)`,
          }))}
          className="rounded-2xl! border! py-3! text-sm! !font-bold cursor-pointer"
          aria-label="人前を選択"
        />
      </div>

      {/* 味わい選択 */}
      <div>
        <p className={FIELD_LABEL_STYLES}>味わい</p>
        <SegmentGroup
          options={['basic', 'sweet', 'bright'] as Taste46[]}
          labels={TASTE_LABELS}
          value={taste}
          onChange={onTasteChange}
        />
      </div>

      {/* 濃度選択 */}
      <div>
        <p className={FIELD_LABEL_STYLES}>濃度</p>
        <SegmentGroup
          options={['light', 'strong2', 'strong3'] as Strength46[]}
          labels={STRENGTH_LABELS}
          value={strength}
          onChange={onStrengthChange}
        />
      </div>
    </div>
  );
};
