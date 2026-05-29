import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MonthSettingsModal } from './MonthSettingsModal';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('MonthSettingsModal', () => {
  const baseProps = {
    month: '2026-08',
    initial: null,
    onSave: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };

  it('対象月を表示のみで表示する', () => {
    render(<MonthSettingsModal {...baseProps} />);
    expect(screen.getByText('月設定（2026年8月分）')).toBeInTheDocument();
  });

  it('配合合計が100でないとき保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<MonthSettingsModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('生豆総量'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('豆 1'), { target: { value: 'ブラジル' } });
    fireEvent.change(screen.getByLabelText('比率'), { target: { value: '80' } });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('合計100の有効な入力で onSave に gram 換算した値を渡す', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<MonthSettingsModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('生豆総量'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('豆 1'), { target: { value: 'ブラジル' } });
    fireEvent.change(screen.getByLabelText('比率'), { target: { value: '100' } });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        month: '2026-08',
        greenBeanTotalGram: 20000,
        powderPerPackGram: 8.5,
        blendItems: [{ beanName: 'ブラジル', ratioPercent: 100 }],
      });
    });
  });

  it('initial を渡すと生豆総量・1袋粉量・配合を編集用に反映する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const initial = {
      month: '2026-08',
      greenBeanTotalGram: 20000,
      powderPerPackGram: 8.5,
      blendItems: [
        { beanName: 'ブラジル', ratioPercent: 60 },
        { beanName: 'グアテマラ', ratioPercent: 40 },
      ],
    };
    render(<MonthSettingsModal {...baseProps} onSave={onSave} initial={initial} />);

    // 配合は2行に展開される
    expect(screen.getByLabelText('豆 1')).toHaveValue('ブラジル');
    expect(screen.getByLabelText('豆 2')).toHaveValue('グアテマラ');

    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        month: '2026-08',
        greenBeanTotalGram: 20000,
        powderPerPackGram: 8.5,
        blendItems: [
          { beanName: 'ブラジル', ratioPercent: 60 },
          { beanName: 'グアテマラ', ratioPercent: 40 },
        ],
      });
    });
  });

  it('生豆総量が0だと保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<MonthSettingsModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('豆 1'), { target: { value: 'ブラジル' } });
    fireEvent.change(screen.getByLabelText('比率'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('生豆総量がハンドピック済み合計を下回ると保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    // ハンドピック済み 15kg(15000g) に対し、生豆総量を 10kg へ下げようとすると弾く
    render(<MonthSettingsModal {...baseProps} onSave={onSave} handpickedTotalGram={15000} />);

    fireEvent.change(screen.getByLabelText('生豆総量'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('豆 1'), { target: { value: 'ブラジル' } });
    fireEvent.change(screen.getByLabelText('比率'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('生豆総量がハンドピック済み合計以上なら保存できる', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    // ハンドピック済み 15kg に対し、生豆総量 20kg は許可する
    render(<MonthSettingsModal {...baseProps} onSave={onSave} handpickedTotalGram={15000} />);

    fireEvent.change(screen.getByLabelText('生豆総量'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('豆 1'), { target: { value: 'ブラジル' } });
    fireEvent.change(screen.getByLabelText('比率'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        month: '2026-08',
        greenBeanTotalGram: 20000,
        powderPerPackGram: 8.5,
        blendItems: [{ beanName: 'ブラジル', ratioPercent: 100 }],
      });
    });
  });

  it('1袋粉量が0だと保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<MonthSettingsModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('生豆総量'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('1袋粉量'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('豆 1'), { target: { value: 'ブラジル' } });
    fireEvent.change(screen.getByLabelText('比率'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('豆名が空だと保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<MonthSettingsModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('生豆総量'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('比率'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('「豆を追加」で配合行が増え、削除で減る', () => {
    render(<MonthSettingsModal {...baseProps} />);

    expect(screen.getByLabelText('豆 1')).toBeInTheDocument();
    expect(screen.queryByLabelText('豆 2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '豆を追加' }));
    expect(screen.getByLabelText('豆 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '豆 2 を削除' }));
    expect(screen.queryByLabelText('豆 2')).not.toBeInTheDocument();
  });

  it('保存処理が失敗するとエラーを表示する', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('保存失敗'));
    render(<MonthSettingsModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('生豆総量'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('豆 1'), { target: { value: 'ブラジル' } });
    fireEvent.change(screen.getByLabelText('比率'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
