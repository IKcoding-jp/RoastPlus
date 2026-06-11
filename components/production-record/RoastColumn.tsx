import { Badge, Button, Card } from '@/components/ui';
import { formatKg, formatPercent } from '@/lib/productionRecords';
import type { RoastEntry } from '@/types';
import { ColumnStat } from './ColumnStat';
import { RecentEmptyHint } from './RecentEmptyHint';

interface RoastColumnProps {
  /** 当月の焙煎件数（バッジ表示） */
  count: number;
  premixBags: number;
  roastYield: number;
  /** 直近の記録プレビュー（降順・先頭3件） */
  recent: RoastEntry[];
  /** 入力可否。読み込み中のちらつきを避けるため isLoading は含めず「設定済みの月があるか」で判定する */
  disabled: boolean;
  onAdd: () => void;
  onEdit: (entry: RoastEntry) => void;
}

/** 2列目：焙煎。プレミックス袋数・歩留まりの統計＋入力＋直近3件。 */
export function RoastColumn({ count, premixBags, roastYield, recent, disabled, onAdd, onEdit }: RoastColumnProps) {
  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">焙煎</h2>
        <Badge variant="secondary" size="md">
          {count}件
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ColumnStat label="プレミックス袋数" value={premixBags} unit="袋" />
        <ColumnStat label="焙煎歩留まり" value={formatPercent(roastYield)} />
      </div>

      <Button type="button" size="sm" variant="primary" disabled={disabled} onClick={onAdd}>
        焙煎を入力
      </Button>

      <div className="space-y-2">
        {recent.length === 0 ? (
          <RecentEmptyHint />
        ) : (
          recent.map((entry) => (
            // eslint-disable-next-line local/no-raw-button -- 複数行のカード型タップ行のため Button では表現できない
            <button
              key={entry.id}
              type="button"
              onClick={() => onEdit(entry)}
              className="w-full rounded-lg border border-edge bg-surface p-3 text-left transition-colors hover:bg-ground"
            >
              <div className="text-sm font-bold text-ink">{entry.workDate}</div>
              <p className="mt-1 text-xs text-ink-sub">
                焙煎前 {formatKg(entry.beforeRoastWeightGram)} kg → 焙煎後 {formatKg(entry.afterRoastWeightGram)} kg
              </p>
            </button>
          ))
        )}
      </div>
    </Card>
  );
}
