import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass,
  X,
  Faders,
  CalendarBlank,
  SortAscending,
  Thermometer,
} from 'phosphor-react';
import { ROAST_LEVELS } from '@/lib/constants';
import { Button, IconButton, Input } from '@/components/ui';

type SortOption = 'newest' | 'oldest' | 'beanName';

interface TastingSessionFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  sortOption: SortOption;
  dateFrom: string;
  dateTo: string;
  selectedRoastLevels: Array<'浅煎り' | '中煎り' | '中深煎り' | '深煎り'>;
  onApply: (filters: {
    searchQuery: string;
    sortOption: SortOption;
    dateFrom: string;
    dateTo: string;
    selectedRoastLevels: Array<'浅煎り' | '中煎り' | '中深煎り' | '深煎り'>;
  }) => void;
}

export function TastingSessionFilterModal({
  isOpen,
  onClose,
  searchQuery,
  sortOption,
  dateFrom,
  dateTo,
  selectedRoastLevels,
  onApply,
}: TastingSessionFilterModalProps) {
  const [tempSearchQuery, setTempSearchQuery] = useState(searchQuery);
  const [tempSortOption, setTempSortOption] = useState(sortOption);
  const [tempDateFrom, setTempDateFrom] = useState(dateFrom);
  const [tempDateTo, setTempDateTo] = useState(dateTo);
  const [tempSelectedRoastLevels, setTempSelectedRoastLevels] = useState(selectedRoastLevels);

  // モーダルが開かれたときに現在の値を設定
  // NOTE: モーダルの一時状態を親のpropsと同期させる必要があるためeffect内でsetStateを使用
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- モーダルオープン時の状態同期に必要
      setTempSearchQuery(searchQuery);
       
      setTempSortOption(sortOption);
       
      setTempDateFrom(dateFrom);
       
      setTempDateTo(dateTo);
       
      setTempSelectedRoastLevels(selectedRoastLevels);
    }
  }, [isOpen, searchQuery, sortOption, dateFrom, dateTo, selectedRoastLevels]);

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleRoastLevelToggle = (level: '浅煎り' | '中煎り' | '中深煎り' | '深煎り') => {
    setTempSelectedRoastLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const handleApply = () => {
    onApply({
      searchQuery: tempSearchQuery,
      sortOption: tempSortOption,
      dateFrom: tempDateFrom,
      dateTo: tempDateTo,
      selectedRoastLevels: tempSelectedRoastLevels,
    });
    onClose();
  };

  const handleReset = () => {
    setTempSearchQuery('');
    setTempSortOption('newest');
    setTempDateFrom('');
    setTempDateTo('');
    setTempSelectedRoastLevels([]);
  };

  const hasActiveFilters =
    tempSearchQuery.trim() || tempDateFrom || tempDateTo || tempSelectedRoastLevels.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col bg-overlay border-2 border-edge-strong"
          >
            {/* ヘッダー */}
            <div className="px-5 py-4 flex items-center justify-between bg-[#261a14]">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-xl bg-white/10">
                  <Faders size={20} weight="fill" className="text-primary" />
                </div>
                <h2 className="text-[15px] font-bold text-white tracking-tight">フィルター設定</h2>
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[11px] font-semibold text-white/50 underline underline-offset-2 hover:text-white/80 transition-colors"
                  >
                    リセット
                  </button>
                )}
                <IconButton
                  variant="ghost"
                  onClick={onClose}
                  aria-label="閉じる"
                  className="text-white/60 hover:text-white/90 hover:bg-white/10"
                >
                  <X size={20} weight="bold" />
                </IconButton>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* 検索バー */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-muted">
                  <MagnifyingGlass size={16} weight="bold" />
                  豆の名前で検索
                </label>
                <Input
                  type="text"
                  value={tempSearchQuery}
                  onChange={(e) => setTempSearchQuery(e.target.value)}
                  placeholder="豆の名前を入力..."
                />
              </div>

              {/* ソート */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-muted">
                  <SortAscending size={16} weight="bold" />
                  並び替え
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'newest', label: '新しい順' },
                      { id: 'oldest', label: '古い順' },
                      { id: 'beanName', label: '名前順' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={tempSortOption === opt.id}
                      onClick={() => setTempSortOption(opt.id)}
                      className={`py-2 rounded-xl text-xs font-semibold text-center transition-colors ${
                        tempSortOption === opt.id
                          ? 'bg-spot text-white border border-spot shadow-sm'
                          : 'bg-ground border border-edge text-ink-sub hover:border-edge-strong'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 日付範囲 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-muted">
                  <CalendarBlank size={16} weight="bold" />
                  日付範囲
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="date"
                    value={tempDateFrom}
                    onChange={(e) => setTempDateFrom(e.target.value)}
                  />
                  <Input
                    type="date"
                    value={tempDateTo}
                    onChange={(e) => setTempDateTo(e.target.value)}
                  />
                </div>
              </div>

              {/* 焙煎度合い */}
              <div className="space-y-2 pb-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-muted">
                  <Thermometer size={16} weight="bold" />
                  焙煎度合い
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {ROAST_LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={tempSelectedRoastLevels.includes(level)}
                      onClick={() => handleRoastLevelToggle(level)}
                      className={`py-2 rounded-xl text-[11px] font-semibold text-center transition-colors ${
                        tempSelectedRoastLevels.includes(level)
                          ? 'bg-[#261a14] text-[#f5c89a] border border-[#261a14]'
                          : 'bg-ground border border-edge text-ink-sub hover:border-edge-strong'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* フッター */}
            <div className="p-5 pt-4 border-t flex gap-3 bg-ground border-edge">
              <Button
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                variant="primary"
                onClick={handleApply}
                className="flex-1"
              >
                適用
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
