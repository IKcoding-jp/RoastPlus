import { HiChevronRight } from 'react-icons/hi';
import { MdSummarize } from 'react-icons/md';
import { Card } from '@/components/ui';

interface MonthlySummaryBarProps {
  onOpen: () => void;
}

/** 下部の月合計バー（本社提出用・毎日は使わないため普段は隠し、タップでモーダル表示）。 */
export function MonthlySummaryBar({ onOpen }: MonthlySummaryBarProps) {
  return (
    <Card className="p-1.5 sm:p-2">
      {/* eslint-disable-next-line local/no-raw-button -- バー全体をタップしてモーダルを開く行のため Button では表現できない */}
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-ground"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-field text-ink-sub">
          <MdSummarize className="h-5 w-5" />
        </span>
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-semibold text-ink">月合計・CSV出力</span>
          <span className="text-xs font-normal text-ink-muted">本社提出用の月合計（月末にまとめて）</span>
        </span>
        {/* 「押すと開ける」ことを示す視覚的な手がかり */}
        <span className="ml-auto flex shrink-0 items-center gap-0.5 text-sm font-medium text-ink-muted">
          開く
          <HiChevronRight className="h-5 w-5" />
        </span>
      </button>
    </Card>
  );
}
