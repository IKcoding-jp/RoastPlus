import { MdFactory, MdSettings } from 'react-icons/md';
import { Button, Select } from '@/components/ui';
import { formatProductionMonthLabel } from '@/lib/productionRecords';

interface MonthOption {
  value: string;
  label: string;
}

interface ProductionRecordHeaderProps {
  selectedMonth: string;
  blendLabel: string;
  monthOptions: MonthOption[];
  onSelectMonth: (month: string) => void;
  onOpenMonthMenu: () => void;
}

/** 画面上部のヘッダー。タイトル・対象月セレクト・「月の設定」ボタン。 */
export function ProductionRecordHeader({
  selectedMonth,
  blendLabel,
  monthOptions,
  onSelectMonth,
  onOpenMonthMenu,
}: ProductionRecordHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted">
          <MdFactory className="h-5 w-5" />
          <span>月次生産</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink">生産記録</h1>
        {selectedMonth ? (
          <p className="mt-1 text-sm text-ink-sub">
            {formatProductionMonthLabel(selectedMonth)}
            {blendLabel ? `　配合: ${blendLabel}` : ''}
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-sub">対象月を作成して記録を始めます。</p>
        )}
      </div>
      {/* 毎日触る「対象月の切替」は表に。月1回の管理操作（作成・設定編集）は「月の設定」へ集約する。 */}
      <div className="flex items-end gap-2">
        {monthOptions.length > 0 && (
          <Select
            label="対象月"
            options={monthOptions}
            value={selectedMonth}
            onChange={(event) => onSelectMonth(event.target.value)}
            className="sm:w-[160px] !min-h-[42px] !py-2 !text-base"
          />
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onOpenMonthMenu}
          className="!min-h-[42px] whitespace-nowrap !py-2 !text-base"
        >
          <MdSettings className="h-5 w-5" />
          月の設定
        </Button>
      </div>
    </header>
  );
}
