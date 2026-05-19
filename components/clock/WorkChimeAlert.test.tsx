import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WorkChimeAlert } from './WorkChimeAlert';
import type { ThemeColors } from '@/lib/clockSettings';
import type { DueWorkChime } from '@/lib/workChime';

const colors: ThemeColors = {
  bg: '#ffffff',
  text: '#211714',
  accent: '#d97706',
  accentSub: 'rgba(217, 119, 6, 0.7)',
  dateText: 'rgba(33, 23, 20, 0.6)',
  uiText: '#6b7280',
  uiBg: 'rgba(0, 0, 0, 0.05)',
};

const breakChime: DueWorkChime = {
  period: {
    id: 'test-break',
    start: '02:41',
    end: '02:41',
    kind: 'break',
  },
  time: '02:41',
  kind: 'break',
  label: '休憩開始',
  playKey: 'test-break',
  message: '休憩時間です',
};

describe('WorkChimeAlert', () => {
  it('チャイムの時刻、種別、メッセージを表示する', () => {
    render(<WorkChimeAlert chime={breakChime} colors={colors} onClose={vi.fn()} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('02:41 休憩開始')).toBeInTheDocument();
    expect(screen.getByText('休憩時間です')).toBeInTheDocument();
  });

  it('閉じるボタンで通知を閉じる', () => {
    const onClose = vi.fn();
    render(<WorkChimeAlert chime={breakChime} colors={colors} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: '作業チャイム表示を閉じる' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('チャイムがないときは表示しない', () => {
    render(<WorkChimeAlert chime={null} colors={colors} onClose={vi.fn()} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
