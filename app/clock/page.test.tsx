import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import ClockPage from './page';

const mocks = vi.hoisted(() => ({
  useClockSettings: vi.fn(),
  useWorkChime: vi.fn(),
}));

vi.mock('@/hooks/useClockSettings', () => ({
  useClockSettings: () => mocks.useClockSettings(),
}));

vi.mock('@/hooks/useWorkChime', () => ({
  useWorkChime: () => mocks.useWorkChime(),
}));

vi.mock('@/lib/clockSettings', () => ({
  getThemeColors: () => ({
    bg: '#fff',
    text: '#000',
    accent: '#666',
    accentSub: '#999',
    uiText: '#333',
    dateText: '#444',
  }),
  getFontFamily: () => 'sans-serif',
  getFontWidthFactor: () => 1,
  getScaledClamp: (min: number) => `${min}rem`,
}));

vi.mock('@/components/clock/ClockHeaderNav', () => ({
  ClockHeaderNav: () => <div>時計ヘッダーナビ</div>,
}));

vi.mock('@/components/clock/ClockSettingsModal', () => ({
  ClockSettingsModal: () => null,
}));

vi.mock('@/components/clock/NextChimeStrip', () => ({
  NextChimeStrip: () => null,
}));

vi.mock('@/components/clock/WorkChimeAlert', () => ({
  WorkChimeAlert: () => null,
}));

vi.mock('@/components/clock/WorkChimeScheduleModal', () => ({
  WorkChimeScheduleModal: () => null,
}));

const baseWorkChime = {
  settings: { enabled: false, soundEnabled: false, periods: [] },
  currentPeriod: null,
  nextChime: null,
  activeChime: null,
  isAudioEnabled: true,
  enableAudio: vi.fn(),
  testWorkChime: vi.fn(),
  updateSettings: vi.fn(),
  dismissActiveChime: vi.fn(),
};

const baseClockSettings = {
  settings: {
    use24Hour: true,
    showSeconds: true,
    showDate: true,
    theme: 'dark' as const,
    fontKey: 'mono',
    fontScale: 1,
  },
  isLoaded: true,
  updateSettings: vi.fn(),
  resetSettings: vi.fn(),
};

describe('ClockPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useClockSettings.mockReturnValue(baseClockSettings);
    mocks.useWorkChime.mockReturnValue(baseWorkChime);
  });

  it('設定読み込み前はローディングを表示する', () => {
    mocks.useClockSettings.mockReturnValue({ ...baseClockSettings, isLoaded: false });
    render(<ClockPage />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('設定読み込み完了後は時計ヘッダーを表示する', () => {
    render(<ClockPage />);
    expect(screen.getByText('時計ヘッダーナビ')).toBeInTheDocument();
  });

  it('24時間モード時にAM/PM表示をしない', () => {
    render(<ClockPage />);
    expect(screen.queryByText('AM')).not.toBeInTheDocument();
    expect(screen.queryByText('PM')).not.toBeInTheDocument();
  });

  it('12時間モード時にAMまたはPMを表示する', () => {
    mocks.useClockSettings.mockReturnValue({
      ...baseClockSettings,
      settings: { ...baseClockSettings.settings, use24Hour: false },
    });
    render(<ClockPage />);
    const amPm = screen.queryByText('AM') ?? screen.queryByText('PM');
    expect(amPm).toBeInTheDocument();
  });
});
