import { useState } from 'react';
import type { HandpickEntry, PackageEntry, RoastEntry } from '@/types';

/**
 * 生産記録ページのモーダル開閉・編集対象stateを一元管理する（page.tsx から移設）。
 * モーダルは show prop を持たず、親が条件レンダリングで開閉するため bool/編集entry を保持する。
 */
export function useProductionRecordModals() {
  // 月設定モーダル（新規/編集の2モード）。isEditingMonth=true で選択中の月の設定を初期値入りで編集
  const [isMonthSettingsOpen, setIsMonthSettingsOpen] = useState(false);
  const [isEditingMonth, setIsEditingMonth] = useState(false);
  const [editingHandpick, setEditingHandpick] = useState<HandpickEntry | null>(null);
  const [isHandpickOpen, setIsHandpickOpen] = useState(false);
  const [editingRoast, setEditingRoast] = useState<RoastEntry | null>(null);
  const [isRoastOpen, setIsRoastOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageEntry | null>(null);
  const [isPackageOpen, setIsPackageOpen] = useState(false);
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  return {
    // 月設定（新規作成は editing=false、設定編集は editing=true で開く）
    isMonthSettingsOpen,
    isEditingMonth,
    openCreateMonthSettings: () => {
      setIsEditingMonth(false);
      setIsMonthSettingsOpen(true);
    },
    openEditMonthSettings: () => {
      setIsEditingMonth(true);
      setIsMonthSettingsOpen(true);
    },
    closeMonthSettings: () => {
      setIsMonthSettingsOpen(false);
      setIsEditingMonth(false);
    },
    // ハンドピック入力（entry を渡すと編集、null/未指定で新規）
    isHandpickOpen,
    editingHandpick,
    openHandpick: (entry: HandpickEntry | null = null) => {
      setEditingHandpick(entry);
      setIsHandpickOpen(true);
    },
    closeHandpick: () => {
      setIsHandpickOpen(false);
      setEditingHandpick(null);
    },
    // 焙煎入力
    isRoastOpen,
    editingRoast,
    openRoast: (entry: RoastEntry | null = null) => {
      setEditingRoast(entry);
      setIsRoastOpen(true);
    },
    closeRoast: () => {
      setIsRoastOpen(false);
      setEditingRoast(null);
    },
    // パッケージ入力
    isPackageOpen,
    editingPackage,
    openPackage: (entry: PackageEntry | null = null) => {
      setEditingPackage(entry);
      setIsPackageOpen(true);
    },
    closePackage: () => {
      setIsPackageOpen(false);
      setEditingPackage(null);
    },
    // 月の設定メニュー（新規作成・設定編集をまとめた小さなメニュー）
    isMonthMenuOpen,
    openMonthMenu: () => setIsMonthMenuOpen(true),
    closeMonthMenu: () => setIsMonthMenuOpen(false),
    // 月合計サマリー（本社提出用）
    isSummaryOpen,
    openSummary: () => setIsSummaryOpen(true),
    closeSummary: () => setIsSummaryOpen(false),
  };
}
