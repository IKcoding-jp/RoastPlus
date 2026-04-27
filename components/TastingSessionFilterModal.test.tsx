import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TastingSessionFilterModal } from './TastingSessionFilterModal';

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  searchQuery: '',
  sortOption: 'newest' as const,
  dateFrom: '',
  dateTo: '',
  selectedRoastLevels: [] as Array<'浅煎り' | '中煎り' | '中深煎り' | '深煎り'>,
  onApply: vi.fn(),
};

describe('TastingSessionFilterModal', () => {
  describe('ヘッダー', () => {
    it('フィルター設定タイトルを表示する', () => {
      render(<TastingSessionFilterModal {...baseProps} />);
      expect(screen.getByText('フィルター設定')).toBeInTheDocument();
    });

    it('フィルター未適用時はリセットボタンを表示しない', () => {
      render(<TastingSessionFilterModal {...baseProps} />);
      expect(screen.queryByText('リセット')).not.toBeInTheDocument();
    });

    it('フィルター適用中はリセットボタンをヘッダーに表示する', () => {
      render(
        <TastingSessionFilterModal
          {...baseProps}
          searchQuery="ブラジル"
        />
      );
      expect(screen.getByText('リセット')).toBeInTheDocument();
    });

    it('リセットボタンを押すと全フィルターがリセットされ適用される', () => {
      const onApply = vi.fn();
      render(
        <TastingSessionFilterModal
          {...baseProps}
          searchQuery="ブラジル"
          onApply={onApply}
        />
      );
      fireEvent.click(screen.getByText('リセット'));
      fireEvent.click(screen.getByText('適用'));
      expect(onApply).toHaveBeenCalledWith({
        searchQuery: '',
        sortOption: 'newest',
        dateFrom: '',
        dateTo: '',
        selectedRoastLevels: [],
      });
    });
  });

  describe('並び替えチップ', () => {
    it('新しい順・古い順・名前順の3つを表示する', () => {
      render(<TastingSessionFilterModal {...baseProps} />);
      expect(screen.getByRole('button', { name: '新しい順' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '古い順' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '名前順' })).toBeInTheDocument();
    });

    it('現在の sortOption に対応するチップが aria-pressed="true" になる', () => {
      render(
        <TastingSessionFilterModal {...baseProps} sortOption="oldest" />
      );
      expect(screen.getByRole('button', { name: '古い順' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('チップをクリックすると sortOption が変わる', () => {
      const onApply = vi.fn();
      render(<TastingSessionFilterModal {...baseProps} onApply={onApply} />);
      fireEvent.click(screen.getByRole('button', { name: '古い順' }));
      fireEvent.click(screen.getByText('適用'));
      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ sortOption: 'oldest' })
      );
    });
  });

  describe('焙煎度合いチップ', () => {
    it('4つの焙煎度を表示する', () => {
      render(<TastingSessionFilterModal {...baseProps} />);
      expect(screen.getByRole('button', { name: '浅煎り' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '中煎り' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '中深煎り' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '深煎り' })).toBeInTheDocument();
    });

    it('選択中の焙煎度が aria-pressed="true" になる', () => {
      render(
        <TastingSessionFilterModal
          {...baseProps}
          selectedRoastLevels={['中深煎り']}
        />
      );
      expect(
        screen.getByRole('button', { name: '中深煎り' })
      ).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('フッター', () => {
    it('キャンセルと適用ボタンを表示する', () => {
      render(<TastingSessionFilterModal {...baseProps} />);
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
      expect(screen.getByText('適用')).toBeInTheDocument();
    });

    it('キャンセルを押すと onClose が呼ばれる', () => {
      const onClose = vi.fn();
      render(<TastingSessionFilterModal {...baseProps} onClose={onClose} />);
      fireEvent.click(screen.getByText('キャンセル'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('適用を押すと onApply が呼ばれてモーダルが閉じる', () => {
      const onApply = vi.fn();
      const onClose = vi.fn();
      render(
        <TastingSessionFilterModal
          {...baseProps}
          onApply={onApply}
          onClose={onClose}
        />
      );
      fireEvent.click(screen.getByText('適用'));
      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
