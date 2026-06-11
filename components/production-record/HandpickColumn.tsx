import { Badge, Button, Card } from '@/components/ui';
import { formatKg, formatPercent } from '@/lib/productionRecords';
import type { HandpickEntry } from '@/types';
import { ColumnStat } from './ColumnStat';
import { RecentEmptyHint } from './RecentEmptyHint';

interface HandpickColumnProps {
  /** 当月のハンドピック件数（バッジ表示） */
  count: number;
  handpickedTotalGram: number;
  defectRate: number;
  /** 直近の記録プレビュー（降順・先頭3件） */
  recent: HandpickEntry[];
  /** 入力可否。読み込み中のちらつきを避けるため isLoading は含めず「設定済みの月があるか」で判定する */
  disabled: boolean;
  onAdd: () => void;
  onEdit: (entry: HandpickEntry) => void;
}

/** 1列目：生豆ハンドピック。統計タイル＋入力ボタン＋直近3件のプレビュー。 */
export function HandpickColumn({
  count,
  handpickedTotalGram,
  defectRate,
  recent,
  disabled,
  onAdd,
  onEdit,
}: HandpickColumnProps) {
  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">生豆ハンドピック</h2>
        <Badge variant="secondary" size="md">
          {count}件
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ColumnStat label="ハンドピック済み" value={formatKg(handpickedTotalGram)} unit="kg" />
        <ColumnStat label="欠点率" value={formatPercent(defectRate)} />
      </div>

      <Button type="button" size="sm" variant="primary" disabled={disabled} onClick={onAdd}>
        欠点豆を入力
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
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-ink">{entry.beanName}</span>
                <span className="text-xs text-ink-muted">{entry.segment === 'first' ? '前半' : '後半'}</span>
              </div>
              <p className="mt-1 text-xs text-ink-sub">
                {entry.workDate}　生豆 {formatKg(entry.greenBeanWeightGram)} kg / 欠点 {entry.defectBeanWeightGram} g
              </p>
            </button>
          ))
        )}
      </div>
    </Card>
  );
}
