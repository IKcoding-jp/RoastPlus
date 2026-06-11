import type { ReactNode } from 'react';

interface ColumnStatProps {
  label: string;
  value: ReactNode;
  /** 数値の単位（小さく添える） */
  unit?: string;
  /** ラベルの色分け（良品=青/不良品=赤）。漢字が苦手でも色で判別できるようにする */
  labelClassName?: string;
  valueClassName?: string;
}

/** 3列カード上部の統計タイル。全列で同じ構成・高さにし、入力ボタンの位置を一致させる */
export function ColumnStat({ label, value, unit, labelClassName, valueClassName }: ColumnStatProps) {
  return (
    <div className="rounded-lg border border-edge bg-field p-3">
      <div className={`text-xs font-semibold ${labelClassName ?? 'text-ink-muted'}`}>{label}</div>
      <p className={`mt-1 text-xl font-bold tabular-nums text-ink ${valueClassName ?? ''}`}>
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-ink-muted">{unit}</span>}
      </p>
    </div>
  );
}
