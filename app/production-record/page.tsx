'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { useProductionRecord } from '@/hooks/useProductionRecord';
import { useAuth } from '@/lib/auth';
import { readMonthListCache, writeMonthListCache } from '@/lib/productionRecordCache';
import {
  productionRecordMonthExists,
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
  formatProductionMonthLabel,
  getCurrentProductionMonth,
  getProductionRecordCsvFileName,
  getTodayWorkDate,
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

export default function ProductionRecordPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToastContext();

  const [recentMonths, setRecentMonths] = useState<ProductionRecordMonth[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [newMonthInput, setNewMonthInput] = useState(getCurrentProductionMonth);

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
  // 月の設定メニュー（新規作成・設定編集をまとめた小さなメニュー）の開閉
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false);
  // 月合計サマリー（本社提出用）モーダルの開閉
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // user が確定した最初の描画で、月リストをキャッシュから同期的に差し込む。
  // useEffect だと一度「空状態」が描画されてしまうため、描画の途中で入れて
  // 空状態↔グリッドの入替・対象月セレクトのポップインを防ぐ（フックと同じ公式パターン）。
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
  if (user && user.uid !== hydratedUserId) {
    setHydratedUserId(user.uid);
    const cachedMonths = readMonthListCache(user.uid);
    if (cachedMonths && cachedMonths.length > 0) {
      setRecentMonths(cachedMonths);
      setSelectedMonth((prev) => prev || cachedMonths[0].month);
    }
  }

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
        // 次回オープン時に即描画するため、最新の月リストをキャッシュに保存
        writeMonthListCache(user.uid, months);
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
  const defaultWorkDate = getTodayWorkDate();

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

  // 各列の最新3件（createdAt降順は購読側で保証済み）
  const recentHandpick = handpickEntries.slice(0, 3);
  const recentRoast = roastEntries.slice(0, 3);
  const recentPackage = packageEntries.slice(0, 3);

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
  const handleCreateMonth = async () => {
    // 既存月と同じ対象月を「作成」すると、同じ月ドキュメントを現在値表示なしで上書きしてしまう。
    // データ損失を防ぐため作成はブロックし、「対象月」から選んで編集するよう促す。
    const notifyExisting = () =>
      showToast('その対象月は既に存在します。「対象月」から選んで設定を編集してください', 'error');
    if (recentMonths.some((month) => month.month === newMonthInput)) {
      notifyExisting();
      return;
    }
    // recentMonths は最新24件しか購読しないため、窓外の古い既存月は Firestore へ直接問い合わせて確認する。
    if (user) {
      try {
        if (await productionRecordMonthExists(user.uid, newMonthInput)) {
          notifyExisting();
          return;
        }
      } catch {
        showToast('対象月の確認に失敗しました。通信環境を確認して再度お試しください', 'error');
        return;
      }
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

  const inputDisabled = !selectedMonth || !monthDoc;

  return (
    <div className="min-h-screen bg-page pt-20 pb-4 px-4 sm:px-6 lg:px-8 transition-colors duration-1000">
      <FloatingNav backHref="/" />

      <div className="mx-auto flex min-h-[calc(100vh-7.5rem)] w-full max-w-7xl flex-col gap-4">
        <ProductionRecordHeader
          selectedMonth={selectedMonth}
          blendLabel={blendLabel}
          monthOptions={monthOptions}
          onSelectMonth={setSelectedMonth}
          onOpenMonthMenu={() => setIsMonthMenuOpen(true)}
        />

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
            {/* 本体3列：iPad横向き相当（md以上）で3列表示。スマホでは隠す。
                flex-1 + lg:grid-rows-1 で残りの高さいっぱいにカードを縦に伸ばす。 */}
            <main className="hidden min-h-0 flex-1 gap-4 md:grid lg:grid-cols-3 lg:grid-rows-1">
              <HandpickColumn
                count={handpickEntries.length}
                handpickedTotalGram={handpickTotals.handpickedTotalGram}
                defectRate={handpickDefectRate}
                recent={recentHandpick}
                disabled={inputDisabled}
                onAdd={() => {
                  setEditingHandpick(null);
                  setIsHandpickOpen(true);
                }}
                onEdit={(entry) => {
                  setEditingHandpick(entry);
                  setIsHandpickOpen(true);
                }}
              />
              <RoastColumn
                count={roastEntries.length}
                premixBags={premix.bags}
                roastYield={roastYield}
                recent={recentRoast}
                disabled={inputDisabled}
                onAdd={() => {
                  setEditingRoast(null);
                  setIsRoastOpen(true);
                }}
                onEdit={(entry) => {
                  setEditingRoast(entry);
                  setIsRoastOpen(true);
                }}
              />
              <PackageColumn
                count={packageEntries.length}
                goodTotal={packageTotals.goodTotal}
                defectiveTotal={packageTotals.defectiveTotal}
                producedTotal={packageTotals.producedTotal}
                recent={recentPackage}
                disabled={inputDisabled}
                onAdd={() => {
                  setEditingPackage(null);
                  setIsPackageOpen(true);
                }}
                onEdit={(entry) => {
                  setEditingPackage(entry);
                  setIsPackageOpen(true);
                }}
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
            <MonthlySummaryBar onOpen={() => setIsSummaryOpen(true)} />
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

      {/* 月の設定メニュー：月1回の管理操作（設定編集・新規作成）をまとめた小さなメニュー */}
      {isMonthMenuOpen && (
        <MonthMenuModal
          selectedMonth={selectedMonth}
          canEditMonth={Boolean(selectedMonth && monthDoc)}
          newMonthInput={newMonthInput}
          onClose={() => setIsMonthMenuOpen(false)}
          onEditMonth={handleEditMonth}
          onChangeNewMonth={setNewMonthInput}
          onCreateMonth={handleCreateMonth}
        />
      )}

      {/* 月合計サマリー（本社提出用）モーダル：普段は隠し、バーのタップで開く */}
      {isSummaryOpen && (
        <MonthlySummaryModal
          summary={summary}
          csvPreview={csvPreview}
          isLoading={isLoading}
          onClose={() => setIsSummaryOpen(false)}
          onExportCsv={handleExportCsv}
        />
      )}
    </div>
  );
}
