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
    // 前10kg→後8500g: 歩留まり85.0% / 理論袋数 floor(8500/8.5)=1000袋（焙煎後はg入力）
    fireEvent.change(screen.getByLabelText('焙煎前重量'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('焙煎後重量'), { target: { value: '8500' } });
    expect(screen.getByText('85.0%')).toBeInTheDocument();
    // 数値と単位は別要素（値: 1000 / 単位: 袋）で表示する
    expect(screen.getByText('1000')).toBeInTheDocument();
    expect(screen.getByText('袋')).toBeInTheDocument();
  });

  it('焙煎後重量が焙煎前重量を超えると保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RoastEntryModal {...baseProps} onSave={onSave} />);
    // 焙煎前 8kg(=8000g) より焙煎後 9000g が大きいのでエラー（焙煎後はg入力）
    fireEvent.change(screen.getByLabelText('焙煎前重量'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('焙煎後重量'), { target: { value: '9000' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('有効入力で onSave に gram 換算した値を渡す', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RoastEntryModal {...baseProps} onSave={onSave} />);
    // 焙煎前 10kg(=10000g) / 焙煎後 8500g（g入力）
    fireEvent.change(screen.getByLabelText('焙煎前重量'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('焙煎後重量'), { target: { value: '8500' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        workDate: '2026-08-01',
        beforeRoastWeightGram: 10000,
        afterRoastWeightGram: 8500,
      });
    });
  });

  it('initial を渡すと編集用に各フィールドへ初期値を反映する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const initial = {
      id: 'r1',
      workDate: '2026-08-05',
      beforeRoastWeightGram: 14000,
      afterRoastWeightGram: 11000,
    };
    render(<RoastEntryModal {...baseProps} onSave={onSave} initial={initial} />);

    // 焙煎歩留まり 11000/14000 = 78.6% が初期値から計算される
    expect(screen.getByText('78.6%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        workDate: '2026-08-05',
        beforeRoastWeightGram: 14000,
        afterRoastWeightGram: 11000,
      });
    });
  });

  it('焙煎前重量が未入力だと保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RoastEntryModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('焙煎後重量'), { target: { value: '8000' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('焙煎後重量が未入力だと保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RoastEntryModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('焙煎前重量'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('作業日が空だと保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RoastEntryModal {...baseProps} defaultWorkDate="" onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('焙煎前重量'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('焙煎後重量'), { target: { value: '8000' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('保存処理が失敗するとエラーを表示する', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('保存失敗'));
    render(<RoastEntryModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('焙煎前重量'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('焙煎後重量'), { target: { value: '8000' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
