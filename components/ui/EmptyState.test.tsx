import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  describe('基本機能', () => {
    it('正しくレンダリングされる', () => {
      render(<EmptyState title="データがありません" />);
      expect(screen.getByText('データがありません')).toBeInTheDocument();
    });

    it('タイトルが表示される', () => {
      render(<EmptyState title="記録がありません" />);
      expect(screen.getByRole('heading', { name: '記録がありません' })).toBeInTheDocument();
    });

    it('descriptionが表示される', () => {
      render(<EmptyState title="データがありません" description="新しいアイテムを追加してください。" />);
      expect(screen.getByText('新しいアイテムを追加してください。')).toBeInTheDocument();
    });

    it('descriptionがない場合は表示されない', () => {
      render(<EmptyState title="データがありません" />);
      expect(screen.queryByText('新しいアイテムを追加してください。')).not.toBeInTheDocument();
    });
  });

  describe('アイコン', () => {
    it('iconが表示される', () => {
      render(<EmptyState title="データがありません" icon={<span data-testid="test-icon">📁</span>} />);
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('iconがない場合はアイコン領域が表示されない', () => {
      const { container } = render(<EmptyState title="データがありません" />);
      // アイコンコンテナが存在しないことを確認
      const iconContainer = container.querySelector('[class*="text-gray-300"]');
      expect(iconContainer).not.toBeInTheDocument();
    });
  });

  describe('アクション', () => {
    it('actionが表示される', () => {
      render(<EmptyState title="データがありません" action={<button type="button">追加する</button>} />);
      expect(screen.getByRole('button', { name: '追加する' })).toBeInTheDocument();
    });

    it('actionのクリックが動作する', () => {
      const handleClick = vi.fn();
      render(
        <EmptyState
          title="データがありません"
          action={
            <button type="button" onClick={handleClick}>
              追加する
            </button>
          }
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '追加する' }));
      expect(handleClick).toHaveBeenCalled();
    });

    it('actionがない場合はアクション領域が表示されない', () => {
      render(<EmptyState title="データがありません" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('サイズ', () => {
    it('smサイズのスタイルが適用される', () => {
      const { container } = render(<EmptyState title="テスト" size="sm" />);
      expect(container.firstChild).toHaveClass('py-6');
    });

    it('mdサイズのスタイルが適用される（デフォルト）', () => {
      const { container } = render(<EmptyState title="テスト" size="md" />);
      expect(container.firstChild).toHaveClass('py-10');
    });

    it('lgサイズのスタイルが適用される', () => {
      const { container } = render(<EmptyState title="テスト" size="lg" />);
      expect(container.firstChild).toHaveClass('py-16');
    });

    it('smサイズのタイトルスタイルが適用される', () => {
      render(<EmptyState title="テスト" size="sm" />);
      expect(screen.getByRole('heading').className).toContain('text-base');
    });

    it('lgサイズのタイトルスタイルが適用される', () => {
      render(<EmptyState title="テスト" size="lg" />);
      expect(screen.getByRole('heading').className).toContain('text-xl');
    });
  });

  describe('カスタムクラス', () => {
    it('classNameで追加のスタイルを指定できる', () => {
      const { container } = render(<EmptyState title="テスト" className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('ref転送', () => {
    it('refが正しく転送される', () => {
      const ref = vi.fn();
      render(<EmptyState title="テスト" ref={ref} />);
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('レイアウト', () => {
    it('中央揃えレイアウトが適用される', () => {
      const { container } = render(<EmptyState title="テスト" />);
      expect(container.firstChild).toHaveClass('flex');
      expect(container.firstChild).toHaveClass('flex-col');
      expect(container.firstChild).toHaveClass('items-center');
      expect(container.firstChild).toHaveClass('text-center');
    });
  });
});
