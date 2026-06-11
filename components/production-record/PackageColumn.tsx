import { Badge, Button, Card } from '@/components/ui';
import type { PackageEntry } from '@/types';
import { ColumnStat } from './ColumnStat';
import { RecentEmptyHint } from './RecentEmptyHint';

interface PackageColumnProps {
  /** 当月のパッケージ件数（バッジ表示） */
  count: number;
  goodTotal: number;
  defectiveTotal: number;
  producedTotal: number;
  /** 直近の記録プレビュー（降順・先頭3件） */
  recent: PackageEntry[];
  /** 入力可否。読み込み中のちらつきを避けるため isLoading は含めず「設定済みの月があるか」で判定する */
  disabled: boolean;
  onAdd: () => void;
  onEdit: (entry: PackageEntry) => void;
}

/** 3列目：パッケージ。良品/不良品/生産個数の統計＋入力＋直近3件。 */
export function PackageColumn({
  count,
  goodTotal,
  defectiveTotal,
  producedTotal,
  recent,
  disabled,
  onAdd,
  onEdit,
}: PackageColumnProps) {
  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">パッケージ</h2>
        <Badge variant="secondary" size="md">
          {count}件
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ColumnStat label="良品数" value={goodTotal} labelClassName="text-info" valueClassName="text-info" />
        <ColumnStat label="不良品数" value={defectiveTotal} labelClassName="text-danger" valueClassName="text-danger" />
        <ColumnStat label="生産個数" value={producedTotal} />
      </div>

      <Button type="button" size="sm" variant="primary" disabled={disabled} onClick={onAdd}>
        パッケージを入力
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
                A班 良 {entry.teamA.goodCount} / 不 {entry.teamA.defectiveCount}　B班 良 {entry.teamB.goodCount} / 不{' '}
                {entry.teamB.defectiveCount}
              </p>
            </button>
          ))
        )}
      </div>
    </Card>
  );
}
