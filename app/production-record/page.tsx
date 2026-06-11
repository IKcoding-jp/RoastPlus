'use client';

import { MdFactory } from 'react-icons/md';
import LoginPage from '@/app/login/page';
import { Loading } from '@/components/Loading';
import { useToastContext } from '@/components/Toast';
import { HandpickColumn } from '@/components/production-record/HandpickColumn';
import { HandpickEntryModal } from '@/components/production-record/HandpickEntryModal';
import { MonthlySummaryBar } from '@/components/production-record/MonthlySummaryBar';
import { MonthlySummaryModal } from '@/components/production-record/MonthlySummaryModal';
import { MonthMenuModal } from '@/components/production-record/MonthMenuModal';
import { MonthSettingsModal } from '@/components/production-record/MonthSettingsModal';
import { PackageColumn } from '@/components/production-record/PackageColumn';
import { PackageEntryModal } from '@/components/production-record/PackageEntryModal';
import { ProductionRecordHeader } from '@/components/production-record/ProductionRecordHeader';
import { RoastColumn } from '@/components/production-record/RoastColumn';
import { RoastEntryModal } from '@/components/production-record/RoastEntryModal';
import { Button, Card, EmptyState, FloatingNav } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import {
  useProductionRecordData,
  useProductionRecordHandlers,
  useProductionRecordModals,
  useProductionRecordStats,
} from './hooks';

export default function ProductionRecordPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToastContext();
  const userId = user?.uid;

  // データ源（購読・対象月state）／派生計算／モーダルstate／ハンドラを各フックに集約する
  const data = useProductionRecordData(userId, showToast);
  const stats = useProductionRecordStats(data.monthDoc, data.handpickEntries, data.roastEntries, data.packageEntries);
  const modals = useProductionRecordModals();
  const handlers = useProductionRecordHandlers({
    userId,
    showToast,
    recentMonths: data.recentMonths,
    selectedMonth: data.selectedMonth,
    setSelectedMonth: data.setSelectedMonth,
    newMonthInput: data.newMonthInput,
    monthDoc: data.monthDoc,
    summary: stats.summary,
    editingHandpick: modals.editingHandpick,
    editingRoast: modals.editingRoast,
    editingPackage: modals.editingPackage,
    openCreateMonthSettings: modals.openCreateMonthSettings,
    openEditMonthSettings: modals.openEditMonthSettings,
  });

  if (authLoading) {
    return <Loading />;
  }

  if (!user) {
    return <LoginPage />;
  }

  // 入力可否：読み込み中のちらつきを避けるため isLoading は含めず「設定済みの月があるか」で判定する
  const inputDisabled = !data.selectedMonth || !data.monthDoc;

  return (
    <div className="min-h-screen bg-page pt-20 pb-4 px-4 sm:px-6 lg:px-8 transition-colors duration-1000">
      <FloatingNav backHref="/" />

      <div className="mx-auto flex min-h-[calc(100vh-7.5rem)] w-full max-w-7xl flex-col gap-4">
        <ProductionRecordHeader
          selectedMonth={data.selectedMonth}
          blendLabel={stats.blendLabel}
          monthOptions={data.monthOptions}
          onSelectMonth={data.setSelectedMonth}
          onOpenMonthMenu={modals.openMonthMenu}
        />

        {/* 月生産単位が0件のときの初期表示。残りの画面高さいっぱいに広げて中央に寄せる */}
        {data.monthOptions.length === 0 && !data.selectedMonth ? (
          <Card className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              title="生産記録がまだありません"
              description="右上の「対象月を作成」から対象月と配合・1袋粉量を設定すると、記録を始められます。"
              icon={<MdFactory className="h-8 w-8" />}
              action={
                <Button type="button" size="sm" onClick={handlers.handleCreateMonth}>
                  対象月を作成
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            {/* 本体3列：iPad横向き相当（md以上）で3列表示。スマホでは隠す。
                flex-1 + lg:grid-rows-1 で残りの高さいっぱいにカードを縦に伸ばす。 */}
            <main className="hidden min-h-0 flex-1 gap-4 md:grid lg:grid-cols-3 lg:grid-rows-1">
              <HandpickColumn
                count={data.handpickEntries.length}
                handpickedTotalGram={stats.handpickTotals.handpickedTotalGram}
                defectRate={stats.handpickDefectRate}
                recent={stats.recentHandpick}
                disabled={inputDisabled}
                onAdd={() => modals.openHandpick()}
                onEdit={modals.openHandpick}
              />
              <RoastColumn
                count={data.roastEntries.length}
                premixBags={stats.premix.bags}
                roastYield={stats.roastYield}
                recent={stats.recentRoast}
                disabled={inputDisabled}
                onAdd={() => modals.openRoast()}
                onEdit={modals.openRoast}
              />
              <PackageColumn
                count={data.packageEntries.length}
                goodTotal={stats.packageTotals.goodTotal}
                defectiveTotal={stats.packageTotals.defectiveTotal}
                producedTotal={stats.packageTotals.producedTotal}
                recent={stats.recentPackage}
                disabled={inputDisabled}
                onAdd={() => modals.openPackage()}
                onEdit={modals.openPackage}
              />
            </main>

            {/* スマホ向け案内（3列はmd以上） */}
            <Card className="p-4 md:hidden">
              <EmptyState
                title="入力はiPad横向きで行います"
                description="記録の入力・編集は、画面を横向き（md以上の幅）にすると3列で表示されます。"
                icon={<MdFactory className="h-8 w-8" />}
                size="sm"
              />
            </Card>

            {/* 下部：月合計バー（本社提出用・毎日は使わないため普段は隠し、タップでモーダル表示） */}
            <MonthlySummaryBar onOpen={modals.openSummary} />
          </>
        )}
      </div>

      {/* モーダル群（モーダルは show prop を持たないため、親が条件レンダリングで開閉する） */}
      {modals.isMonthSettingsOpen && (
        <MonthSettingsModal
          month={modals.isEditingMonth ? data.selectedMonth : data.newMonthInput}
          initial={modals.isEditingMonth ? data.monthDoc : null}
          handpickedTotalGram={modals.isEditingMonth ? stats.handpickTotals.handpickedTotalGram : 0}
          onClose={modals.closeMonthSettings}
          onSave={handlers.handleSaveMonth}
        />
      )}
      {modals.isHandpickOpen && (
        <HandpickEntryModal
          beanNames={stats.beanNames}
          initial={modals.editingHandpick}
          defaultWorkDate={stats.defaultWorkDate}
          onClose={modals.closeHandpick}
          onSave={handlers.handleSaveHandpick}
        />
      )}
      {modals.isRoastOpen && (
        <RoastEntryModal
          powderPerPackGram={stats.powderPerPackGram}
          initial={modals.editingRoast}
          defaultWorkDate={stats.defaultWorkDate}
          onClose={modals.closeRoast}
          onSave={handlers.handleSaveRoast}
        />
      )}
      {modals.isPackageOpen && (
        <PackageEntryModal
          initial={modals.editingPackage}
          defaultWorkDate={stats.defaultWorkDate}
          onClose={modals.closePackage}
          onSave={handlers.handleSavePackage}
        />
      )}

      {/* 月の設定メニュー：月1回の管理操作（設定編集・新規作成）をまとめた小さなメニュー */}
      {modals.isMonthMenuOpen && (
        <MonthMenuModal
          selectedMonth={data.selectedMonth}
          canEditMonth={Boolean(data.selectedMonth && data.monthDoc)}
          newMonthInput={data.newMonthInput}
          onClose={modals.closeMonthMenu}
          onEditMonth={handlers.handleEditMonth}
          onChangeNewMonth={data.setNewMonthInput}
          onCreateMonth={handlers.handleCreateMonth}
        />
      )}

      {/* 月合計サマリー（本社提出用）モーダル：普段は隠し、バーのタップで開く */}
      {modals.isSummaryOpen && (
        <MonthlySummaryModal
          summary={stats.summary}
          csvPreview={stats.csvPreview}
          isLoading={data.isLoading}
          onClose={modals.closeSummary}
          onExportCsv={handlers.handleExportCsv}
        />
      )}
    </div>
  );
}
