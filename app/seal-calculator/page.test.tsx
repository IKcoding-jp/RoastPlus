import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SealCalculatorPage from './page';

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { uid: 'user-1', email: 'test@example.com' },
    loading: false,
  }),
}));

vi.mock('@/app/login/page', () => ({
  default: () => <div>ログイン画面</div>,
}));

describe('SealCalculatorPage', () => {
  it('プレミックス袋数と製造月から必要シート数と賞味期限年月を表示する', () => {
    render(<SealCalculatorPage />);

    fireEvent.change(screen.getByLabelText('プレミックス袋数'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('製造月'), { target: { value: '2026-05' } });

    expect(screen.getByText('29シート')).toBeInTheDocument();
    expect(screen.getByText('2027年3月')).toBeInTheDocument();
    expect(screen.getByText(/ceil\(プレミックス袋数 × 500g × 80% ÷ 8.5g ÷ 18枚\) \+ 2シート/)).toBeInTheDocument();
  });

  it('0以下の袋数は入力エラーとして表示する', () => {
    render(<SealCalculatorPage />);

    fireEvent.change(screen.getByLabelText('プレミックス袋数'), { target: { value: '0' } });

    expect(screen.getByText('1より大きい袋数を入力してください')).toBeInTheDocument();
  });
});
