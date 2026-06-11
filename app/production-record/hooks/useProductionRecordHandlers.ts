import type { ToastType } from '@/hooks/useToast';
import {
  productionRecordMonthExists,
  saveHandpickEntry,
  savePackageEntry,
  saveProductionRecordMonth,
  saveRoastEntry,
} from '@/lib/firestore/productionRecords';
import { buildProductionRecordCsv, getProductionRecordCsvFileName } from '@/lib/productionRecords';
import type {
  HandpickEntry,
  HandpickEntryInput,
  PackageEntry,
  PackageEntryInput,
  ProductionRecordMonth,
  ProductionRecordMonthInput,
  ProductionRecordMonthlySummary,
  RoastEntry,
  RoastEntryInput,
} from '@/types';

interface UseProductionRecordHandlersArgs {
  userId: string | undefined;
  showToast: (message: string, type?: ToastType) => void;
  recentMonths: ProductionRecordMonth[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  newMonthInput: string;
  monthDoc: ProductionRecordMonth | null;
  summary: ProductionRecordMonthlySummary | null;
  editingHandpick: HandpickEntry | null;
  editingRoast: RoastEntry | null;
  editingPackage: PackageEntry | null;
  /** 月設定モーダルを新規モードで開く（既存月チェック通過後） */
  openCreateMonthSettings: () => void;
  /** 月設定モーダルを編集モードで開く */
  openEditMonthSettings: () => void;
}

/**
 * 生産記録ページの保存・作成・CSV出力ハンドラ群（page.tsx から移設）。
 * 保存・確認の失敗は showToast でユーザーに必ず通知する（握りつぶさない）。
 */
export function useProductionRecordHandlers({
  userId,
  showToast,
  recentMonths,
  selectedMonth,
  setSelectedMonth,
  newMonthInput,
  monthDoc,
  summary,
  editingHandpick,
  editingRoast,
  editingPackage,
  openCreateMonthSettings,
  openEditMonthSettings,
}: UseProductionRecordHandlersArgs) {
  // 月設定の保存（モーダル側が成功時に onClose を呼ぶ）
  const handleSaveMonth = async (input: ProductionRecordMonthInput) => {
    if (!userId) {
      return;
    }
    await saveProductionRecordMonth(userId, input);
    setSelectedMonth(input.month);
    showToast('保存しました', 'success');
  };

  // 各entryは「キーが同じなら上書き更新（upsert）」。編集中entryのidを渡し、キー変更時は旧docを付け替える。
  const handleSaveHandpick = async (input: HandpickEntryInput) => {
    if (!userId || !selectedMonth) {
      return;
    }
    await saveHandpickEntry(userId, selectedMonth, input, editingHandpick?.id);
    showToast('保存しました', 'success');
  };

  const handleSaveRoast = async (input: RoastEntryInput) => {
    if (!userId || !selectedMonth) {
      return;
    }
    await saveRoastEntry(userId, selectedMonth, input, editingRoast?.id);
    showToast('保存しました', 'success');
  };

  const handleSavePackage = async (input: PackageEntryInput) => {
    if (!userId || !selectedMonth) {
      return;
    }
    await savePackageEntry(userId, selectedMonth, input, editingPackage?.id);
    showToast('保存しました', 'success');
  };

  // 新規作成（月設定モーダルを空で開くだけ。保存するまで selectedMonth は変えず画面遷移しない）。
  // 既存月を「作成」すると現在値表示なしで上書き＝データ損失になるため、既存チェックでブロックする。
  const handleCreateMonth = async () => {
    const existsMessage = 'その対象月は既に存在します。「対象月」から選んで設定を編集してください';
    if (recentMonths.some((month) => month.month === newMonthInput)) {
      showToast(existsMessage, 'error');
      return;
    }
    // recentMonths は最新24件のみ購読のため、窓外の古い既存月は Firestore へ直接確認する
    if (userId) {
      try {
        if (await productionRecordMonthExists(userId, newMonthInput)) {
          showToast(existsMessage, 'error');
          return;
        }
      } catch {
        showToast('対象月の確認に失敗しました。通信環境を確認して再度お試しください', 'error');
        return;
      }
    }
    openCreateMonthSettings();
  };

  // 既存の月設定を編集（選択中の月の monthDoc を初期値にして開く。保存は同じ月キーで上書き=upsert）
  const handleEditMonth = () => {
    if (!monthDoc) {
      return;
    }
    openEditMonthSettings();
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

  return {
    handleSaveMonth,
    handleSaveHandpick,
    handleSaveRoast,
    handleSavePackage,
    handleCreateMonth,
    handleEditMonth,
    handleExportCsv,
  };
}
