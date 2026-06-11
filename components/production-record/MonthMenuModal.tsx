import { HiChevronRight, HiX } from 'react-icons/hi';
import { MdSettings } from 'react-icons/md';
import { Button, IconButton, Input, Modal } from '@/components/ui';
import { formatProductionMonthLabel, getCurrentProductionMonth } from '@/lib/productionRecords';

interface MonthMenuModalProps {
  selectedMonth: string;
  /** 設定編集行を出すか（選択中の月の monthDoc があるとき） */
  canEditMonth: boolean;
  newMonthInput: string;
  onClose: () => void;
  onEditMonth: () => void;
  onChangeNewMonth: (value: string) => void;
  onCreateMonth: () => void;
}

/** 月1回の管理操作（設定編集・新規作成）をまとめた小さなメニュー。 */
export function MonthMenuModal({
  selectedMonth,
  canEditMonth,
  newMonthInput,
  onClose,
  onEditMonth,
  onChangeNewMonth,
  onCreateMonth,
}: MonthMenuModalProps) {
  return (
    <Modal
      show={true}
      onClose={onClose}
      contentClassName="rounded-2xl max-w-sm w-full bg-overlay border border-edge shadow-xl"
    >
      {/* ヘッダー：他モーダルと揃えてタイトル＋閉じる(×) */}
      <div className="flex items-center justify-between border-b border-edge p-5">
        <h2 className="text-lg font-bold text-ink">月の設定</h2>
        <IconButton onClick={onClose} rounded aria-label="閉じる">
          <HiX className="h-5 w-5" />
        </IconButton>
      </div>

      <div className="space-y-5 p-5">
        {/* 現在選択中の月の設定（配合・粉量）を編集。月が選ばれていないときは出さない。
            濃色ブロックではなく、アイコン＋2行ラベル＋右矢印の軽いメニュー行にする。 */}
        {canEditMonth && (
          // eslint-disable-next-line local/no-raw-button -- アイコン＋2行ラベル＋右シェブロンのメニュー行のため Button では表現できない
          <button
            type="button"
            onClick={() => {
              onClose();
              onEditMonth();
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-edge bg-surface px-4 py-3 text-left transition-colors hover:bg-ground"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-field text-ink-sub">
              <MdSettings className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">この月の設定を編集</span>
              <span className="block truncate text-xs text-ink-muted">
                {formatProductionMonthLabel(selectedMonth)}・配合や1袋粉量
              </span>
            </span>
            <HiChevronRight className="h-5 w-5 shrink-0 text-ink-muted" />
          </button>
        )}

        {/* 新しい月生産単位を作る。何月分かは作業日とは別に選ぶ（spec第5章）。
            編集行があるときだけ上に区切り線を引いて、別操作だと分かるようにする。 */}
        <div className={canEditMonth ? 'space-y-2 border-t border-edge pt-5' : 'space-y-2'}>
          <p className="text-sm font-semibold text-ink">新しい月を作る</p>
          <p className="text-xs text-ink-muted">「何月分」として作るかを選びます（作業日とは別です）。</p>
          <div className="flex items-end gap-2">
            <Input
              type="month"
              label="対象月"
              value={newMonthInput}
              onChange={(event) => onChangeNewMonth(event.target.value || getCurrentProductionMonth())}
              className="flex-1 !min-h-[42px] !py-2 !text-base"
            />
            <Button
              type="button"
              variant="primary"
              className="!min-h-[42px] whitespace-nowrap"
              onClick={() => {
                onClose();
                onCreateMonth();
              }}
            >
              作成
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
