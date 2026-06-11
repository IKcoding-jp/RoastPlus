import { HiDownload, HiX } from 'react-icons/hi';
import { Button, IconButton, Modal } from '@/components/ui';
import { formatKg, formatPercent } from '@/lib/productionRecords';
import type { ProductionRecordMonthlySummary } from '@/types';
import { SummaryTile } from './SummaryTile';

interface MonthlySummaryModalProps {
  summary: ProductionRecordMonthlySummary | null;
  csvPreview: string;
  isLoading: boolean;
  onClose: () => void;
  onExportCsv: () => void;
}

/** 月合計サマリー（本社提出用）モーダル。数値タイル＋CSVプレビュー＋CSV出力。 */
export function MonthlySummaryModal({
  summary,
  csvPreview,
  isLoading,
  onClose,
  onExportCsv,
}: MonthlySummaryModalProps) {
  return (
    <Modal
      show={true}
      onClose={onClose}
      contentClassName="rounded-2xl max-w-3xl w-full max-h-full flex flex-col overflow-hidden bg-overlay border border-edge shadow-xl"
    >
      {/* ヘッダーはスクロール領域の外に置き、常に見える固定部にする */}
      <div className="flex shrink-0 items-center justify-between border-b border-edge bg-surface p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold text-ink sm:text-xl">月合計サマリー</h2>
          <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">本社提出用の月合計です。</p>
        </div>
        <IconButton onClick={onClose} rounded aria-label="閉じる">
          <HiX className="h-6 w-6" />
        </IconButton>
      </div>

      {/* 本文のみ内部スクロール。画面の低い端末でもモーダル全体は画面内に収まる */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 sm:space-y-4 sm:p-5">
        {!summary ? (
          <div className="flex min-h-[120px] items-center justify-center text-sm text-ink-muted">
            {isLoading ? '読み込み中...' : '対象月の設定がありません。'}
          </div>
        ) : (
          <>
            {/* 配合は数値ではないため独立した行にし、数値タイルの大きさを揃える */}
            <div className="rounded-xl border border-edge bg-surface p-3 sm:p-4">
              <div className="text-xs font-semibold text-ink-muted">配合</div>
              <p className="mt-1 text-base font-bold text-ink sm:text-lg">{summary.blendLabel}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              <SummaryTile label="生豆重量" value={formatKg(summary.greenBeanTotalGram)} unit="kg" />
              <SummaryTile label="欠点豆重量" value={summary.defectBeanTotalGram} unit="g" />
              <SummaryTile label="欠点率" value={formatPercent(summary.defectRate)} />
              <SummaryTile label="焙煎後重量" value={formatKg(summary.roastAfterTotalGram)} unit="kg" />
              <SummaryTile label="焙煎ロス率" value={formatPercent(summary.moistureLossRate)} />
              <SummaryTile label="30kg理論袋数" value={summary.thirtyKgTheoryPacks} unit="袋" />
              <SummaryTile label="月良品数" value={summary.monthlyGoodCount} unit="個" valueClassName="text-info" />
              <SummaryTile
                label="月不良品数"
                value={summary.monthlyDefectiveCount}
                unit="個"
                valueClassName="text-danger"
              />
              <SummaryTile label="月生産個数" value={summary.monthlyProducedCount} unit="個" />
              <SummaryTile label="不良率" value={formatPercent(summary.packageLossRate)} />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink-muted">CSVプレビュー</h3>
              <pre className="overflow-x-auto rounded-lg border border-edge bg-field p-3 text-xs text-ink-sub">
                {csvPreview}
              </pre>
            </div>

            {/* このモーダルの主目的＝CSV出力。最下部に主要アクションとして右寄せ配置 */}
            <div className="flex justify-end border-t border-edge pt-4">
              <Button type="button" onClick={onExportCsv} disabled={isLoading}>
                <HiDownload className="h-5 w-5" />
                CSV出力
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
