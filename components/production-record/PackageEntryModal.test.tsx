import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PackageEntryModal } from './PackageEntryModal';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('PackageEntryModal', () => {
  const baseProps = {
    initial: null,
    defaultWorkDate: '2026-08-01',
    onSave: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };

  it('合計・生産個数・不良率をリアルタイム表示する', () => {
    render(<PackageEntryModal {...baseProps} />);
    const goods = screen.getAllByLabelText('良品数');
    const defectives = screen.getAllByLabelText('不良品数');
    // A班 良90/不5, B班 良95/不10 → 良185 / 不15 / 生産200 / 不良率7.5%
    fireEvent.change(goods[0], { target: { value: '90' } });
    fireEvent.change(defectives[0], { target: { value: '5' } });
    fireEvent.change(goods[1], { target: { value: '95' } });
    fireEvent.change(defectives[1], { target: { value: '10' } });

    expect(screen.getByText('185 個')).toBeInTheDocument();
    expect(screen.getByText('15 個')).toBeInTheDocument();
    expect(screen.getByText('200 個')).toBeInTheDocument();
    expect(screen.getByText('7.5%')).toBeInTheDocument();
  });

  it('有効入力で onSave に TeamCounts 構造で渡す', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<PackageEntryModal {...baseProps} onSave={onSave} />);
    const goods = screen.getAllByLabelText('良品数');
    const defectives = screen.getAllByLabelText('不良品数');
    fireEvent.change(goods[0], { target: { value: '90' } });
    fireEvent.change(defectives[0], { target: { value: '5' } });
    fireEvent.change(goods[1], { target: { value: '95' } });
    fireEvent.change(defectives[1], { target: { value: '10' } });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        workDate: '2026-08-01',
        teamA: { goodCount: 90, defectiveCount: 5 },
        teamB: { goodCount: 95, defectiveCount: 10 },
      });
    });
  });
});
