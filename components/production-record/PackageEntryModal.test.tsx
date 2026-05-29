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

    // 合計タイルは値のみ表示（ラベルで意味を示す）
    expect(screen.getByText('185')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
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

  it('initial を渡すと編集用に各班の個数を反映する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const initial = {
      id: 'p1',
      workDate: '2026-08-05',
      teamA: { goodCount: 100, defectiveCount: 5 },
      teamB: { goodCount: 90, defectiveCount: 10 },
    };
    render(<PackageEntryModal {...baseProps} onSave={onSave} initial={initial} />);

    // 良品合計 190 / 不良品合計 15 / 生産個数 205 が初期値から計算される
    expect(screen.getByText('190')).toBeInTheDocument();
    expect(screen.getByText('205')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        workDate: '2026-08-05',
        teamA: { goodCount: 100, defectiveCount: 5 },
        teamB: { goodCount: 90, defectiveCount: 10 },
      });
    });
  });

  it('作業日が空だと保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<PackageEntryModal {...baseProps} defaultWorkDate="" onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('個数に負の値が入ると保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<PackageEntryModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getAllByLabelText('良品数')[0], { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('保存処理が失敗するとエラーを表示する', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('保存失敗'));
    render(<PackageEntryModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getAllByLabelText('良品数')[0], { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
