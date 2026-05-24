import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ClockSettingsModal } from './ClockSettingsModal';
import { DEFAULT_CLOCK_SETTINGS } from '@/lib/clockSettings';
import { DEFAULT_WORK_CHIME_SETTINGS, type WorkChimeKind } from '@/lib/workChime';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('ClockSettingsModal', () => {
  const defaultProps = {
    show: true,
    settings: DEFAULT_CLOCK_SETTINGS,
    workChimeSettings: DEFAULT_WORK_CHIME_SETTINGS,
    isWorkChimeAudioEnabled: true,
    onUpdate: vi.fn(),
    onWorkChimeUpdate: vi.fn(),
    onEnableWorkChimeAudio: vi.fn(),
    onTestWorkChime: vi.fn<(kind: WorkChimeKind) => void>(),
    onReset: vi.fn(),
    onClose: vi.fn(),
  };

  it('作業チャイムのテストボタンを表示する', () => {
    render(<ClockSettingsModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: '休憩開始をテスト' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '作業開始をテスト' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '掃除開始をテスト' })).toBeInTheDocument();
    expect(screen.getByText('音声アナウンス（未実装）')).toBeInTheDocument();
  });

  it('テストボタンから該当するチャイム種別を通知する', () => {
    const onTestWorkChime = vi.fn<(kind: WorkChimeKind) => void>();

    render(<ClockSettingsModal {...defaultProps} onTestWorkChime={onTestWorkChime} />);

    fireEvent.click(screen.getByRole('button', { name: '休憩開始をテスト' }));
    fireEvent.click(screen.getByRole('button', { name: '作業開始をテスト' }));
    fireEvent.click(screen.getByRole('button', { name: '掃除開始をテスト' }));

    expect(onTestWorkChime).toHaveBeenNthCalledWith(1, 'break');
    expect(onTestWorkChime).toHaveBeenNthCalledWith(2, 'work-start');
    expect(onTestWorkChime).toHaveBeenNthCalledWith(3, 'cleanup-start');
  });
});
