import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FilterModal, FilterOptionButton, FilterSearchInput, FilterSection, FilterSortOption } from './FilterModal';

describe('FilterModal', () => {
  it('共通のフィルターモーダル構造を表示する', () => {
    render(
      <FilterModal show={true} onClose={() => {}} title="フィルター">
        <FilterSection label="検索">
          <FilterSearchInput value="" onChange={() => {}} placeholder="名前で検索..." />
        </FilterSection>
      </FilterModal>
    );

    expect(screen.getByText('フィルター')).toBeInTheDocument();
    expect(screen.getByText('検索')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('名前で検索...')).toBeInTheDocument();
  });

  it('下部アクションを表示してクリックできる', () => {
    const onCancel = vi.fn();
    const onApply = vi.fn();

    render(
      <FilterModal
        show={true}
        onClose={onCancel}
        title="フィルター"
        footer={
          <>
            <FilterOptionButton onClick={onCancel}>キャンセル</FilterOptionButton>
            <FilterOptionButton selected onClick={onApply}>
              適用
            </FilterOptionButton>
          </>
        }
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    fireEvent.click(screen.getByRole('button', { name: '適用' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('選択中の選択肢とソート行を同じアクセント色で表示する', () => {
    render(
      <FilterModal show={true} onClose={() => {}} title="フィルター">
        <FilterOptionButton selected>全て</FilterOptionButton>
        <FilterSortOption selected icon={<span aria-hidden>↓</span>}>
          新しい順
        </FilterSortOption>
      </FilterModal>
    );

    expect(screen.getByRole('button', { name: '全て' })).toHaveClass('!bg-spot');
    expect(screen.getByRole('button', { name: '新しい順' })).toHaveClass('!text-spot');
  });
});
