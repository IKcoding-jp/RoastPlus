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
    it('フィルタータイトルを表示する', () => {
      render(<TastingSessionFilterModal {...baseProps} />);
      expect(screen.getByText('フィルター')).toBeInTheDocument();
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

    it('選択肢は豆図鑑フィルターと同じ角丸で表示する', () => {
      render(<TastingSessionFilterModal {...baseProps} />);

      [
        screen.getByRole('button', { name: '浅煎り' }),
        screen.getByRole('button', { name: '中煎り' }),
        screen.getByRole('button', { name: '中深煎り' }),
        screen.getByRole('button', { name: '深煎り' }),
      ].forEach((chip) => {
        expect(chip).toHaveClass('!min-h-[40px]');
        expect(chip).toHaveClass('!rounded-lg');
        expect(chip).toHaveClass('!py-2');
      });

      [
        screen.getByRole('button', { name: '新しい順' }),
        screen.getByRole('button', { name: '古い順' }),
        screen.getByRole('button', { name: '名前順' }),
      ].forEach((row) => {
        expect(row).toHaveClass('!rounded-lg');
        expect(row).toHaveClass('!justify-start');
      });
    });

    it('ソート行と焙煎度合いは共通フィルターの選択表示になる', () => {
      render(
        <TastingSessionFilterModal
          {...baseProps}
          sortOption="oldest"
          selectedRoastLevels={['中深煎り']}
        />
      );

      expect(screen.getByRole('button', { name: '古い順' })).toHaveClass('!text-spot');
      expect(screen.getByRole('button', { name: '中深煎り' })).toHaveClass('!bg-spot', '!text-white', '!border-spot');
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

  describe('入力欄レイアウト', () => {
    it('検索入力と日付入力は統一された高さと角丸で表示する', () => {
      render(<TastingSessionFilterModal {...baseProps} />);

      const inputs = [
        screen.getByPlaceholderText('豆の名前で検索...'),
        ...document.querySelectorAll('input[type="date"]'),
      ];

      inputs.forEach((input) => {
        expect(input).toHaveClass('!min-h-[40px]');
        expect(input).toHaveClass('!rounded-lg');
        expect(input).toHaveClass('!text-sm');
      });
    });
  });
});
