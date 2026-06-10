import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StartHintDialog } from './StartHintDialog';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLProps<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onStart: vi.fn(),
};

describe('StartHintDialog', () => {
  it('isOpen: true のとき表示される', () => {
    render(<StartHintDialog {...defaultProps} />);
    expect(screen.getByText('ドリップ前のヒント')).toBeInTheDocument();
  });

  it('recipeName を渡すとタイトルに表示される', () => {
    render(<StartHintDialog {...defaultProps} recipeName="BYSN Standard Drip" />);
    expect(screen.getByText('BYSN Standard Drip')).toBeInTheDocument();
  });

  it('recipeName 未指定のときフォールバックタイトルが表示される', () => {
    render(<StartHintDialog {...defaultProps} />);
    expect(screen.getByText('一杯をおいしく淹れるために')).toBeInTheDocument();
  });

  it('totalWaterGram を渡すとビッグナンバーとメタ行が表示される', () => {
    render(<StartHintDialog {...defaultProps} totalWaterGram={160} servings={1} />);
    expect(screen.getByText('160')).toBeInTheDocument();
    expect(screen.getByText(/総湯量/)).toBeInTheDocument();
    expect(screen.getByText(/1人前/)).toBeInTheDocument();
  });

  it('totalWaterGram 未指定のときビッグナンバーが表示されない', () => {
    render(<StartHintDialog {...defaultProps} />);
    expect(screen.queryByText(/総湯量/)).not.toBeInTheDocument();
  });

  it('isManualMode: true のとき「手順は「次へ」タップで進む」が表示される', () => {
    render(<StartHintDialog {...defaultProps} isManualMode={true} />);
    expect(screen.getByText('手順は「次へ」タップで進む')).toBeInTheDocument();
  });

  it('isManualMode: false のとき「手順は「次へ」タップで進む」が表示されない', () => {
    render(<StartHintDialog {...defaultProps} isManualMode={false} />);
    expect(screen.queryByText('手順は「次へ」タップで進む')).not.toBeInTheDocument();
  });

  it('isManualMode 未指定のとき「手順は「次へ」タップで進む」が表示されない', () => {
    render(<StartHintDialog {...defaultProps} />);
    expect(screen.queryByText('手順は「次へ」タップで進む')).not.toBeInTheDocument();
  });

  it('extraHintsを渡すと各項目を表示する', () => {
    render(
      <StartHintDialog
        {...defaultProps}
        extraHints={[
          { title: '氷を準備', body: '1人前あたり60〜80g' },
          { title: '挽き目', body: 'ホットより少し細かめ' },
        ]}
      />
    );
    expect(screen.getByText('氷を準備')).toBeInTheDocument();
    expect(screen.getByText('1人前あたり60〜80g')).toBeInTheDocument();
    expect(screen.getByText('挽き目')).toBeInTheDocument();
  });

  it('extraHintsを渡さなくても基本ヒントは表示される', () => {
    render(<StartHintDialog {...defaultProps} />);
    expect(screen.getByText('スケールは0に戻さない')).toBeInTheDocument();
    expect(screen.getByText('蒸らし後にタイマー開始')).toBeInTheDocument();
    expect(screen.queryByText('氷を準備')).not.toBeInTheDocument();
  });
});
