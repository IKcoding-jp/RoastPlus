import type { ReactNode } from 'react';

interface SummaryTileProps {
  label: string;
  value: ReactNode;
  /** 数値の単位（小さく添える）。比率など単位がない項目は省略する */
  unit?: string;
  valueClassName?: string;
}

/** 月合計サマリー内の数値タイル。スマホは一段小さく、sm以上で従来サイズに戻す。 */
export function SummaryTile({ label, value, unit, valueClassName }: SummaryTileProps) {
  return (
    // スマホは画面が低いためタイルを一段小さくし、sm以上で従来サイズに戻す
    <div className="flex min-h-[64px] flex-col rounded-xl border border-edge bg-surface p-2.5 sm:min-h-[88px] sm:p-3">
      <div className="text-xs font-semibold text-ink-muted">{label}</div>
      <p
        className={`mt-auto pt-1.5 text-xl font-bold tabular-nums text-ink sm:pt-2 sm:text-2xl ${valueClassName ?? ''}`}
      >
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-ink-sub">{unit}</span>}
      </p>
    </div>
  );
}
