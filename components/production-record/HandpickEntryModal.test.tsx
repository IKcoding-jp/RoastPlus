import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HandpickEntryModal } from './HandpickEntryModal';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('HandpickEntryModal', () => {
  const baseProps = {
    beanNames: ['ブラジル', 'グアテマラ'],
    initial: null,
    defaultWorkDate: '2026-08-01',
    onSave: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };

  it('月設定の豆名を選択肢として表示する', () => {
    render(<HandpickEntryModal {...baseProps} />);
    const select = screen.getByLabelText('豆の種類');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'ブラジル' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'グアテマラ' })).toBeInTheDocument();
  });

  it('欠点率をリアルタイム表示する（500g中50g→10.0%）', () => {
    render(<HandpickEntryModal {...baseProps} />);
    fireEvent.change(screen.getByLabelText('今回生豆重量'), { target: { value: '0.5' } });
    fireEvent.change(screen.getByLabelText('欠点豆重量'), { target: { value: '50' } });
    expect(screen.getByText('10.0%')).toBeInTheDocument();
  });

  it('有効入力で onSave に gram 換算した値を渡す', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<HandpickEntryModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('豆の種類'), { target: { value: 'ブラジル' } });
    fireEvent.change(screen.getByLabelText('今回生豆重量'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('欠点豆重量'), { target: { value: '120' } });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        workDate: '2026-08-01',
        beanName: 'ブラジル',
        segment: 'first',
        greenBeanWeightGram: 10000,
        defectBeanWeightGram: 120,
      });
    });
  });

  it('initial を渡すと編集用に各フィールドへ初期値を反映する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const initial = {
      id: 'hp1',
      workDate: '2026-08-05',
      beanName: 'グアテマラ',
      segment: 'second' as const,
      greenBeanWeightGram: 8000,
      defectBeanWeightGram: 160,
    };
    render(<HandpickEntryModal {...baseProps} onSave={onSave} initial={initial} />);

    // 欠点率 160/8000 = 2.0% が初期値から計算される
    expect(screen.getByText('2.0%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        workDate: '2026-08-05',
        beanName: 'グアテマラ',
        segment: 'second',
        greenBeanWeightGram: 8000,
        defectBeanWeightGram: 160,
      });
    });
  });

  it('今回生豆重量が未入力だと保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<HandpickEntryModal {...baseProps} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('月設定に豆が無いと豆名未選択で保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<HandpickEntryModal {...baseProps} beanNames={[]} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('今回生豆重量'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('作業日が空だと保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<HandpickEntryModal {...baseProps} defaultWorkDate="" onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('今回生豆重量'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('保存処理が失敗するとエラーを表示する', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('保存失敗'));
    render(<HandpickEntryModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('今回生豆重量'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
