import { useState, useEffect } from 'react';
import { SortAscending, SortDescending } from 'phosphor-react';
import { ROAST_LEVELS } from '@/lib/constants';
import {
  Button,
  FilterModal,
  FilterOptionButton,
  FilterSearchInput,
  FilterSection,
  FilterSortOption,
  Input,
} from '@/components/ui';

type SortOption = 'newest' | 'oldest' | 'beanName';

const inputControlClassName = '!min-h-[40px] !rounded-lg !py-2 !text-sm';
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
    setTempSelectedRoastLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));
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

  const hasActiveFilters = tempSearchQuery.trim() || tempDateFrom || tempDateTo || tempSelectedRoastLevels.length > 0;

  const sortOptions = [
    { id: 'newest', label: '新しい順', icon: <SortDescending size={20} weight="bold" /> },
    { id: 'oldest', label: '古い順', icon: <SortAscending size={20} weight="bold" /> },
    { id: 'beanName', label: '名前順', icon: <SortAscending size={20} weight="bold" /> },
  ] as const;

  return (
    <FilterModal
      show={isOpen}
      onClose={onClose}
      title="フィルター"
      headerAction={
        hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={handleReset}
            className="!min-h-0 !px-0 !py-0 !rounded-none !text-xs !font-semibold !text-spot underline underline-offset-2 hover:!text-spot-hover"
          >
            リセット
          </Button>
        ) : null
      }
      footer={
        <>
          <Button variant="surface" onClick={onClose} className="flex-1 !min-h-[44px] !rounded-lg !text-sm">
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleApply} className="flex-1 !min-h-[44px] !rounded-lg !text-sm">
            適用
          </Button>
        </>
      }
    >
      {/* 検索バー */}
      <FilterSection label="検索">
        <FilterSearchInput
          value={tempSearchQuery}
          onChange={setTempSearchQuery}
          placeholder="豆の名前で検索..."
          className={inputControlClassName}
        />
      </FilterSection>

      {/* ソート */}
      <FilterSection label="ソート">
        <div className="grid grid-cols-3 gap-1.5">
          {sortOptions.map((opt) => (
            <FilterOptionButton
              key={opt.id}
              selected={tempSortOption === opt.id}
              type="button"
              aria-pressed={tempSortOption === opt.id}
              onClick={() => setTempSortOption(opt.id)}
              className="!min-h-[40px] !px-1 !text-[12px] whitespace-nowrap gap-1"
            >
              {opt.icon}
              {opt.label}
            </FilterOptionButton>
          ))}
        </div>
      </FilterSection>

      {/* 日付範囲 */}
      <FilterSection label="日付範囲">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-muted">開始日</span>
            <Input
              type="date"
              value={tempDateFrom}
              onChange={(e) => setTempDateFrom(e.target.value)}
              className={inputControlClassName}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-muted">終了日</span>
            <Input
              type="date"
              value={tempDateTo}
              onChange={(e) => setTempDateTo(e.target.value)}
              className={inputControlClassName}
            />
          </div>
        </div>
      </FilterSection>

      {/* 焙煎度合い */}
      <FilterSection label="焙煎度合い">
        <div className="grid grid-cols-4 gap-2">
          {ROAST_LEVELS.map((level) => (
            <FilterOptionButton
              key={level}
              selected={tempSelectedRoastLevels.includes(level)}
              type="button"
              aria-pressed={tempSelectedRoastLevels.includes(level)}
              onClick={() => handleRoastLevelToggle(level)}
              className="!min-h-[40px] !px-1.5 !text-[12px] whitespace-nowrap"
            >
              {level}
            </FilterOptionButton>
          ))}
        </div>
      </FilterSection>
    </FilterModal>
  );
}
