import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RoastEntryModal } from './RoastEntryModal';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('RoastEntryModal', () => {
  const baseProps = {
    powderPerPackGram: 8.5,
    initial: null,
    defaultWorkDate: '2026-08-01',
    onSave: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };

  it('焙煎歩留まりと当日理論袋数をリアルタイム表示する', () => {
    render(<RoastEntryModal {...baseProps} />);
    // 前10kg→後8.5kg: 歩留まり85.0% / 理論袋数 floor(8500/8.5)=1000袋
    fireEvent.change(screen.getByLabelText('焙煎前重量'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('焙煎後重量'), { target: { value: '8.5' } });
    expect(screen.getByText('85.0%')).toBeInTheDocument();
    expect(screen.getByText('1000 袋')).toBeInTheDocument();
  });

  it('焙煎後重量が焙煎前重量を超えると保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RoastEntryModal {...baseProps} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('焙煎前重量'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('焙煎後重量'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('有効入力で onSave に gram 換算した値を渡す', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RoastEntryModal {...baseProps} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('焙煎前重量'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('焙煎後重量'), { target: { value: '8.5' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        workDate: '2026-08-01',
        beforeRoastWeightGram: 10000,
        afterRoastWeightGram: 8500,
      });
    });
  });
});
