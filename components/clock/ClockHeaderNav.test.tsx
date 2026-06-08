import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ClockHeaderNav } from './ClockHeaderNav';
import type { ThemeColors } from '@/lib/clockSettings';

// next/link のモック（FloatingNav.test.tsx と同じ手法）
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const colors: ThemeColors = {
  bg: '#FFFFFF',
  text: '#211714',
  accent: '#D97706',
  accentSub: 'rgba(217, 119, 6, 0.7)',
  dateText: 'rgba(33, 23, 20, 0.6)',
  uiText: '#6B7280',
  uiBg: 'rgba(0, 0, 0, 0.05)',
};

describe('ClockHeaderNav', () => {
  it('「チャイム」「表示」ラベルと戻るリンクを表示する', () => {
    render(<ClockHeaderNav colors={colors} onOpenChimeSchedule={vi.fn()} onOpenSettings={vi.fn()} />);
    expect(screen.getByText('チャイム')).toBeInTheDocument();
    expect(screen.getByText('表示')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '戻る' })).toHaveAttribute('href', '/');
  });

  it('「チャイム」クリックで onOpenChimeSchedule が呼ばれる', () => {
    const onOpenChimeSchedule = vi.fn();
    render(<ClockHeaderNav colors={colors} onOpenChimeSchedule={onOpenChimeSchedule} onOpenSettings={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'チャイム時刻設定' }));
    expect(onOpenChimeSchedule).toHaveBeenCalledTimes(1);
  });

  it('「表示」クリックで onOpenSettings が呼ばれる', () => {
    const onOpenSettings = vi.fn();
    render(<ClockHeaderNav colors={colors} onOpenChimeSchedule={vi.fn()} onOpenSettings={onOpenSettings} />);
    fireEvent.click(screen.getByRole('button', { name: '時計の設定' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
