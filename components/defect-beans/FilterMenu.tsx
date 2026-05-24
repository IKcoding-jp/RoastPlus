'use client';

import { useState } from 'react';
import { HiCheckCircle, HiCollection, HiXCircle } from 'react-icons/hi';
import { MdFilterList, MdSort, MdArrowUpward, MdArrowDownward } from 'react-icons/md';
import {
  Button,
  FilterModal,
  FilterOptionButton,
  FilterSearchInput,
  FilterSection,
  FilterSortOption,
} from '@/components/ui';

type FilterOption = 'all' | 'shouldRemove' | 'shouldNotRemove';
type SortOption = 'default' | 'createdAtDesc' | 'createdAtAsc' | 'nameAsc' | 'nameDesc';

interface FilterMenuProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterOption: FilterOption;
  onFilterChange: (option: FilterOption) => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
}

const SORT_OPTIONS: SortOption[] = ['default', 'createdAtDesc', 'createdAtAsc', 'nameAsc', 'nameDesc'];

const getSortLabel = (option: SortOption): string => {
  switch (option) {
    case 'default':
      return 'デフォルト';
    case 'createdAtDesc':
      return '新しい順';
    case 'createdAtAsc':
      return '古い順';
    case 'nameAsc':
      return '名前昇順';
    case 'nameDesc':
      return '名前降順';
  }
};

const getSortIcon = (option: SortOption) => {
  if (option === 'default') {
    return <MdSort className="h-5 w-5" />;
  } else if (option === 'createdAtAsc' || option === 'nameAsc') {
    return <MdArrowUpward className="h-5 w-5" />;
  } else {
    return <MdArrowDownward className="h-5 w-5" />;
  }
};

const FILTER_OPTIONS: { value: FilterOption; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: '全て', icon: <HiCollection className="h-4 w-4" /> },
  { value: 'shouldRemove', label: '省く', icon: <HiXCircle className="h-4 w-4" /> },
  { value: 'shouldNotRemove', label: '省かない', icon: <HiCheckCircle className="h-4 w-4" /> },
];

export function FilterMenu({
  searchQuery,
  onSearchChange,
  filterOption,
  onFilterChange,
  sortOption,
  onSortChange,
}: FilterMenuProps) {
  const [showModal, setShowModal] = useState(false);

  const isActive = searchQuery.trim() !== '' || filterOption !== 'all' || sortOption !== 'default';

  return (
    <>
      <Button
        variant={isActive ? 'primary' : 'surface'}
        size="sm"
        onClick={() => setShowModal(true)}
        title="フィルター"
        className="!px-3 !py-2 gap-1.5"
      >
        <MdFilterList className="h-5 w-5" />
        <span className="text-xs sm:text-sm">フィルター</span>
      </Button>

      <FilterModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="フィルター"
        footer={
          <Button variant="surface" size="sm" onClick={() => setShowModal(false)} className="w-full justify-center">
            閉じる
          </Button>
        }
      >
        {/* 検索セクション */}
        <FilterSection label="検索">
          <FilterSearchInput value={searchQuery} onChange={onSearchChange} placeholder="名称や特徴で検索..." />
        </FilterSection>

        {/* 絞り込みセクション */}
        <FilterSection label="絞り込み">
          <div className="flex gap-2">
            {FILTER_OPTIONS.map(({ value, label, icon }) => (
              <FilterOptionButton key={value} selected={filterOption === value} onClick={() => onFilterChange(value)}>
                {icon}
                <span className="text-xs">{label}</span>
              </FilterOptionButton>
            ))}
          </div>
        </FilterSection>

        {/* ソートセクション */}
        <FilterSection label="ソート">
          <div className="flex flex-col gap-1">
            {SORT_OPTIONS.map((option) => (
              <FilterSortOption
                key={option}
                selected={sortOption === option}
                icon={getSortIcon(option)}
                onClick={() => onSortChange(option)}
              >
                {getSortLabel(option)}
              </FilterSortOption>
            ))}
          </div>
        </FilterSection>
      </FilterModal>
    </>
  );
}
