'use client';

import { useEffect, useMemo, useState } from 'react';
import { HiDownload } from 'react-icons/hi';
import { MdFactory } from 'react-icons/md';
import LoginPage from '@/app/login/page';
import { Loading } from '@/components/Loading';
import { useToastContext } from '@/components/Toast';
import { HandpickEntryModal } from '@/components/production-record/HandpickEntryModal';
import { MonthSettingsModal } from '@/components/production-record/MonthSettingsModal';
import { PackageEntryModal } from '@/components/production-record/PackageEntryModal';
import { RoastEntryModal } from '@/components/production-record/RoastEntryModal';
import { Badge, Button, Card, EmptyState, FloatingNav, Input, Select } from '@/components/ui';
import { useProductionRecord } from '@/hooks/useProductionRecord';
import { useAuth } from '@/lib/auth';
import {
  saveHandpickEntry,
  savePackageEntry,
  saveProductionRecordMonth,
  saveRoastEntry,
  subscribeRecentProductionMonths,
} from '@/lib/firestore/productionRecords';
import {
  buildBlendLabel,
  buildMonthlySummary,
  buildProductionRecordCsv,
  calculatePackageTotals,
  calculatePremixBags,
  calculateRoastYield,
  calculateUsableGreenGram,
  formatKg,
  formatPercent,
  formatProductionMonthLabel,
  getProductionRecordCsvFileName,
  sumHandpick,
  sumRoast,
} from '@/lib/productionRecords';
import type {
  HandpickEntry,
  HandpickEntryInput,
  PackageEntry,
  PackageEntryInput,
  ProductionRecordMonth,
  ProductionRecordMonthInput,
  RoastEntry,
  RoastEntryInput,
} from '@/types';

// 当月を yyyy-MM で返す（ローカル時刻基準）
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// 今日を yyyy-MM-dd で返す（モーダルの作業日初期値に使う）
function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ProductionRecordPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToastContext();

  const [recentMonths, setRecentMonths] = useState<ProductionRecordMonth[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [newMonthInput, setNewMonthInput] = useState(getCurrentMonth);

  // モーダル開閉（モーダルは show prop を持たず、親が条件レンダリングで開閉する）
  const [isMonthSettingsOpen, setIsMonthSettingsOpen] = useState(false);
  // 月設定モーダルが編集モードか（true=選択中の月の設定を初期値入りで編集 / false=新規作成）
  const [isEditingMonth, setIsEditingMonth] = useState(false);
  const [editingHandpick, setEditingHandpick] = useState<HandpickEntry | null>(null);
  const [isHandpickOpen, setIsHandpickOpen] = useState(false);
  const [editingRoast, setEditingRoast] = useState<RoastEntry | null>(null);
  const [isRoastOpen, setIsRoastOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageEntry | null>(null);
  const [isPackageOpen, setIsPackageOpen] = useState(false);

  // 月docと3種entriesを購読
  const { monthDoc, handpickEntries, roastEntries, packageEntries, isLoading } = useProductionRecord(
    user?.uid,
    selectedMonth || undefined
  );

  // 月生産単位の一覧を購読（最新24件）。最初の取得で選択中月を初期化
  useEffect(() => {
    if (!user) {
      return;
    }

    let hasInitialized = false;
    return subscribeRecentProductionMonths(
      user.uid,
      (months) => {
        setRecentMonths(months);
        // 初回のみ：最新月があればそれを選択する（以降はユーザー選択を尊重）
        if (!hasInitialized) {
          hasInitialized = true;
          if (months.length > 0) {
            setSelectedMonth(months[0].month);
          }
        }
      },
      () => {
        showToast('生産記録の読み込みに失敗しました', 'error');
        hasInitialized = true;
      }
    );
  }, [showToast, user]);

  // 月セレクトの選択肢
  const monthOptions = useMemo(
    () => recentMonths.map((month) => ({ value: month.month, label: formatProductionMonthLabel(month.month) })),
    [recentMonths]
  );

  // 月設定から得られる派生値（モーダルへ渡す）
  const beanNames = useMemo(() => (monthDoc ? monthDoc.blendItems.map((item) => item.beanName) : []), [monthDoc]);
  const powderPerPackGram = monthDoc?.powderPerPackGram ?? 0;
  const defaultWorkDate = getTodayDate();

  // 配合ラベル（上部概要）
  const blendLabel = monthDoc ? buildBlendLabel(monthDoc.blendItems) : '';

  // 1列目：ハンドピック集計
  const handpickTotals = useMemo(() => sumHandpick(handpickEntries), [handpickEntries]);
  const handpickDefectRate = useMemo(() => {
    // 欠点率 = 欠点豆合計 / ハンドピック済み合計（0除算はガード）
    const { handpickedTotalGram, defectTotalGram } = handpickTotals;
    return handpickedTotalGram <= 0 ? 0 : defectTotalGram / handpickedTotalGram;
  }, [handpickTotals]);

  // 2列目：焙煎集計（プレミックス袋数は使用可能生豆から算出）
  const roastTotals = useMemo(() => sumRoast(roastEntries), [roastEntries]);
  const usableGreenGram = calculateUsableGreenGram(handpickTotals.handpickedTotalGram, handpickTotals.defectTotalGram);
  const premix = useMemo(() => calculatePremixBags(usableGreenGram), [usableGreenGram]);
  const roastYield = useMemo(
    () => calculateRoastYield(roastTotals.beforeTotalGram, roastTotals.afterTotalGram),
    [roastTotals]
  );

  // 3列目：パッケージ当日合計（当月の全entryを合算した teamA/teamB を作る）
  const packageTotals = useMemo(() => {
    const teamA = packageEntries.reduce(
      (acc, entry) => ({
        goodCount: acc.goodCount + entry.teamA.goodCount,
        defectiveCount: acc.defectiveCount + entry.teamA.defectiveCount,
      }),
      { goodCount: 0, defectiveCount: 0 }
    );
    const teamB = packageEntries.reduce(
      (acc, entry) => ({
        goodCount: acc.goodCount + entry.teamB.goodCount,
        defectiveCount: acc.defectiveCount + entry.teamB.defectiveCount,
      }),
      { goodCount: 0, defectiveCount: 0 }
    );
    return calculatePackageTotals(teamA, teamB);
  }, [packageEntries]);

  // 月合計サマリー（CSV/下部表示の元データ）
  const summary = useMemo(() => {
    if (!monthDoc) {
      return null;
    }
    return buildMonthlySummary(monthDoc, handpickEntries, roastEntries, packageEntries);
  }, [monthDoc, handpickEntries, roastEntries, packageEntries]);

  // CSVプレビュー文字列（BOM/CRLFを含む）
  const csvPreview = useMemo(() => (summary ? buildProductionRecordCsv(summary) : ''), [summary]);

  // 各列の最新2件（createdAt降順は購読側で保証済み）
  const recentHandpick = handpickEntries.slice(0, 2);
  const recentRoast = roastEntries.slice(0, 2);
  const recentPackage = packageEntries.slice(0, 2);

  // 月設定の保存（モーダル側が成功時に onClose を呼ぶ）
  const handleSaveMonth = async (input: ProductionRecordMonthInput) => {
    if (!user) {
      return;
    }
    await saveProductionRecordMonth(user.uid, input);
    setSelectedMonth(input.month);
    showToast('保存しました', 'success');
  };

  // 各entryは「キーが同じなら上書き更新（upsert）」。編集中entryのidを渡し、キー変更時は旧docを付け替える。
  const handleSaveHandpick = async (input: HandpickEntryInput) => {
    if (!user || !selectedMonth) {
      return;
    }
    await saveHandpickEntry(user.uid, selectedMonth, input, editingHandpick?.id);
    showToast('保存しました', 'success');
  };

  const handleSaveRoast = async (input: RoastEntryInput) => {
    if (!user || !selectedMonth) {
      return;
    }
    await saveRoastEntry(user.uid, selectedMonth, input, editingRoast?.id);
    showToast('保存しました', 'success');
  };

  const handleSavePackage = async (input: PackageEntryInput) => {
    if (!user || !selectedMonth) {
      return;
    }
    await savePackageEntry(user.uid, selectedMonth, input, editingPackage?.id);
    showToast('保存しました', 'success');
  };

  // 新規作成（月設定モーダルを空で開くだけ。保存するまで selectedMonth は変えず画面遷移しない）
  const handleCreateMonth = () => {
    // 既存月と同じ対象月を「作成」すると、同じ月ドキュメントを現在値表示なしで上書きしてしまう。
    // データ損失を防ぐため作成はブロックし、「対象月」から選んで編集するよう促す。
    if (recentMonths.some((month) => month.month === newMonthInput)) {
      showToast('その対象月は既に存在します。「対象月」から選んで設定を編集してください', 'error');
      return;
    }
    setIsEditingMonth(false);
    setIsMonthSettingsOpen(true);
  };

  // 既存の月設定を編集（選択中の月の monthDoc を初期値にして開く。保存は同じ月キーで上書き=upsert）
  const handleEditMonth = () => {
    if (!monthDoc) {
      return;
    }
    setIsEditingMonth(true);
    setIsMonthSettingsOpen(true);
  };

  // CSV出力（productionPacks/monthly と同じパターン）
  const handleExportCsv = () => {
    if (!summary) {
      return;
    }
    const csv = buildProductionRecordCsv(summary);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getProductionRecordCsvFileName(summary.month);
    link.click();
    window.URL.revokeObjectURL(url);
    showToast('CSVを出力しました', 'success');
  };

  if (authLoading) {
    return <Loading />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-page pt-20 pb-4 px-4 sm:px-6 lg:px-8 transition-colors duration-1000">
      <FloatingNav backHref="/" />

      <div className="mx-auto flex min-h-[calc(100vh-7.5rem)] w-full max-w-7xl flex-col gap-4">
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            {monthOptions.length > 0 && (
              <div className="flex items-end gap-2">
                <Select
                  label="対象月"
                  options={monthOptions}
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="sm:w-[160px] !min-h-[42px] !py-2 !text-base"
                />
                {selectedMonth && monthDoc && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleEditMonth}
                    className="!min-h-[42px] whitespace-nowrap !py-2 !text-base"
                  >
                    設定を編集
                  </Button>
                )}
              </div>
            )}
            <div className="flex items-end gap-2">
              <Input
                type="month"
                label="新規作成"
                value={newMonthInput}
                onChange={(event) => setNewMonthInput(event.target.value || getCurrentMonth())}
                className="sm:w-[160px] !min-h-[42px] !py-2 !text-base"
              />
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={handleCreateMonth}
                className="!min-h-[42px] whitespace-nowrap !py-2 !text-base"
              >
                対象月を作成
              </Button>
            </div>
          </div>
        </header>

        {/* 月生産単位が0件のときの初期表示。残りの画面高さいっぱいに広げて中央に寄せる */}
        {monthOptions.length === 0 && !selectedMonth ? (
          <Card className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              title="生産記録がまだありません"
              description="右上の「対象月を作成」から対象月と配合・1袋粉量を設定すると、記録を始められます。"
              icon={<MdFactory className="h-8 w-8" />}
              action={
                <Button type="button" size="sm" onClick={handleCreateMonth}>
                  対象月を作成
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            {/* 本体3列：iPad横向き相当（md以上）で3列表示。スマホでは隠す */}
            <main className="hidden gap-4 md:grid lg:grid-cols-3">
              {/* 1列目：生豆ハンドピック */}
              <Card className="flex flex-col gap-4 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-ink">生豆ハンドピック</h2>
                  <Badge variant="secondary" size="md">
                    {handpickEntries.length}件
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <ColumnStat label="ハンドピック済み" value={formatKg(handpickTotals.handpickedTotalGram)} unit="kg" />
                  <ColumnStat label="欠点率" value={formatPercent(handpickDefectRate)} />
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={!selectedMonth || !monthDoc || isLoading}
                  onClick={() => {
                    setEditingHandpick(null);
                    setIsHandpickOpen(true);
                  }}
                >
                  欠点豆を入力
                </Button>

                <div className="space-y-2">
                  {recentHandpick.length === 0 ? (
                    <p className="text-sm text-ink-muted">まだ記録がありません。</p>
                  ) : (
                    recentHandpick.map((entry) => (
                      // eslint-disable-next-line local/no-raw-button -- 複数行のカード型タップ行のため Button では表現できない
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          setEditingHandpick(entry);
                          setIsHandpickOpen(true);
                        }}
                        className="w-full rounded-lg border border-edge bg-surface p-3 text-left transition-colors hover:bg-ground"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-ink">{entry.beanName}</span>
                          <span className="text-xs text-ink-muted">{entry.segment === 'first' ? '前半' : '後半'}</span>
                        </div>
                        <p className="mt-1 text-xs text-ink-sub">
                          {entry.workDate}　生豆 {formatKg(entry.greenBeanWeightGram)} kg / 欠点{' '}
                          {entry.defectBeanWeightGram} g
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </Card>

              {/* 2列目：焙煎 */}
              <Card className="flex flex-col gap-4 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-ink">焙煎</h2>
                  <Badge variant="secondary" size="md">
                    {roastEntries.length}件
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <ColumnStat label="プレミックス袋数" value={premix.bags} unit="袋" />
                  <ColumnStat label="焙煎歩留まり" value={formatPercent(roastYield)} />
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={!selectedMonth || !monthDoc || isLoading}
                  onClick={() => {
                    setEditingRoast(null);
                    setIsRoastOpen(true);
                  }}
                >
                  焙煎を入力
                </Button>

                <div className="space-y-2">
                  {recentRoast.length === 0 ? (
                    <p className="text-sm text-ink-muted">まだ記録がありません。</p>
                  ) : (
                    recentRoast.map((entry) => (
                      // eslint-disable-next-line local/no-raw-button -- 複数行のカード型タップ行のため Button では表現できない
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          setEditingRoast(entry);
                          setIsRoastOpen(true);
                        }}
                        className="w-full rounded-lg border border-edge bg-surface p-3 text-left transition-colors hover:bg-ground"
                      >
                        <div className="text-sm font-bold text-ink">{entry.workDate}</div>
                        <p className="mt-1 text-xs text-ink-sub">
                          焙煎前 {formatKg(entry.beforeRoastWeightGram)} kg → 焙煎後{' '}
                          {formatKg(entry.afterRoastWeightGram)} kg
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </Card>

              {/* 3列目：パッケージ */}
              <Card className="flex flex-col gap-4 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-ink">パッケージ</h2>
                  <Badge variant="secondary" size="md">
                    {packageEntries.length}件
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <ColumnStat
                    label="良品数"
                    value={packageTotals.goodTotal}
                    labelClassName="text-info"
                    valueClassName="text-info"
                  />
                  <ColumnStat
                    label="不良品数"
                    value={packageTotals.defectiveTotal}
                    labelClassName="text-danger"
                    valueClassName="text-danger"
                  />
                  <ColumnStat label="生産個数" value={packageTotals.producedTotal} />
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={!selectedMonth || !monthDoc || isLoading}
                  onClick={() => {
                    setEditingPackage(null);
                    setIsPackageOpen(true);
                  }}
                >
                  パッケージを入力
                </Button>

                <div className="space-y-2">
                  {recentPackage.length === 0 ? (
                    <p className="text-sm text-ink-muted">まだ記録がありません。</p>
                  ) : (
                    recentPackage.map((entry) => (
                      // eslint-disable-next-line local/no-raw-button -- 複数行のカード型タップ行のため Button では表現できない
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          setEditingPackage(entry);
                          setIsPackageOpen(true);
                        }}
                        className="w-full rounded-lg border border-edge bg-surface p-3 text-left transition-colors hover:bg-ground"
                      >
                        <div className="text-sm font-bold text-ink">{entry.workDate}</div>
                        <p className="mt-1 text-xs text-ink-sub">
                          A班 良 {entry.teamA.goodCount} / 不 {entry.teamA.defectiveCount}　B班 良{' '}
                          {entry.teamB.goodCount} / 不 {entry.teamB.defectiveCount}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </Card>
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

            {/* 下部：月合計サマリー + CSV */}
            <Card className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink">月合計サマリー</h2>
                  <p className="mt-1 text-sm text-ink-muted">本社報告用の月合計です。</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleExportCsv}
                  disabled={!summary || isLoading}
                  className="w-full sm:w-auto"
                >
                  <HiDownload className="h-5 w-5" />
                  CSV出力
                </Button>
              </div>

              {!summary ? (
                <div className="flex min-h-[120px] items-center justify-center text-sm text-ink-muted">
                  {isLoading ? '読み込み中...' : '対象月の設定がありません。'}
                </div>
              ) : (
                <>
                  {/* 配合は数値ではないため独立した行にし、数値タイルの大きさを揃える */}
                  <div className="rounded-xl border border-edge bg-surface p-4">
                    <div className="text-xs font-semibold text-ink-muted">配合</div>
                    <p className="mt-1 text-lg font-bold text-ink">{summary.blendLabel}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <SummaryTile label="生豆重量" value={formatKg(summary.greenBeanTotalGram)} unit="kg" />
                    <SummaryTile label="欠点豆重量" value={summary.defectBeanTotalGram} unit="g" />
                    <SummaryTile label="欠点率" value={formatPercent(summary.defectRate)} />
                    <SummaryTile label="焙煎後重量" value={formatKg(summary.roastAfterTotalGram)} unit="kg" />
                    <SummaryTile label="焙煎ロス率" value={formatPercent(summary.moistureLossRate)} />
                    <SummaryTile label="30kg理論袋数" value={summary.thirtyKgTheoryPacks} unit="袋" />
                    <SummaryTile
                      label="月良品数"
                      value={summary.monthlyGoodCount}
                      unit="個"
                      valueClassName="text-info"
                    />
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
                </>
              )}
            </Card>
          </>
        )}
      </div>

      {/* モーダル群（モーダルは show prop を持たないため、親が条件レンダリングで開閉する） */}
      {isMonthSettingsOpen && (
        <MonthSettingsModal
          month={isEditingMonth ? selectedMonth : newMonthInput}
          initial={isEditingMonth ? monthDoc : null}
          handpickedTotalGram={isEditingMonth ? handpickTotals.handpickedTotalGram : 0}
          onClose={() => {
            setIsMonthSettingsOpen(false);
            setIsEditingMonth(false);
          }}
          onSave={handleSaveMonth}
        />
      )}
      {isHandpickOpen && (
        <HandpickEntryModal
          beanNames={beanNames}
          initial={editingHandpick}
          defaultWorkDate={defaultWorkDate}
          onClose={() => {
            setIsHandpickOpen(false);
            setEditingHandpick(null);
          }}
          onSave={handleSaveHandpick}
        />
      )}
      {isRoastOpen && (
        <RoastEntryModal
          powderPerPackGram={powderPerPackGram}
          initial={editingRoast}
          defaultWorkDate={defaultWorkDate}
          onClose={() => {
            setIsRoastOpen(false);
            setEditingRoast(null);
          }}
          onSave={handleSaveRoast}
        />
      )}
      {isPackageOpen && (
        <PackageEntryModal
          initial={editingPackage}
          defaultWorkDate={defaultWorkDate}
          onClose={() => {
            setIsPackageOpen(false);
            setEditingPackage(null);
          }}
          onSave={handleSavePackage}
        />
      )}
    </div>
  );
}

interface ColumnStatProps {
  label: string;
  value: React.ReactNode;
  /** 数値の単位（小さく添える） */
  unit?: string;
  /** ラベルの色分け（良品=青/不良品=赤）。漢字が苦手でも色で判別できるようにする */
  labelClassName?: string;
  valueClassName?: string;
}

/** 3列カード上部の統計タイル。全列で同じ構成・高さにし、入力ボタンの位置を一致させる */
function ColumnStat({ label, value, unit, labelClassName, valueClassName }: ColumnStatProps) {
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

interface SummaryTileProps {
  label: string;
  value: React.ReactNode;
  /** 数値の単位（小さく添える）。比率など単位がない項目は省略する */
  unit?: string;
  valueClassName?: string;
}

function SummaryTile({ label, value, unit, valueClassName }: SummaryTileProps) {
  return (
    <div className="flex min-h-[88px] flex-col rounded-xl border border-edge bg-surface p-3">
      <div className="text-xs font-semibold text-ink-muted">{label}</div>
      <p className={`mt-auto pt-2 text-2xl font-bold tabular-nums text-ink ${valueClassName ?? ''}`}>
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-ink-sub">{unit}</span>}
      </p>
    </div>
  );
}
