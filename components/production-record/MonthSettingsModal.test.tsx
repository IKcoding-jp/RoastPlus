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
    fireEvent.change(screen.getByLabelText('豆名'), { target: { value: 'ブラジル' } });
    fireEvent.change(screen.getByLabelText('比率'), { target: { value: '80' } });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('合計100の有効な入力で onSave に gram 換算した値を渡す', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<MonthSettingsModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('生豆総量'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('豆名'), { target: { value: 'ブラジル' } });
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
});
