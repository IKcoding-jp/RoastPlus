import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import SchedulePage from './page';
import type { AppData } from '@/types';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useAppData: vi.fn(),
  useScheduleDateNavigation: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => mocks.useAppData(),
}));

vi.mock('@/hooks/useScheduleDateNavigation', () => ({
  useScheduleDateNavigation: () => mocks.useScheduleDateNavigation(),
}));

vi.mock('@/hooks/useScheduleOCR', () => ({
  useScheduleOCR: () => ({ handleOCRSuccess: vi.fn() }),
}));

vi.mock('@/components/TodaySchedule', () => ({
  TodaySchedule: () => <div>本日スケジュール</div>,
}));

vi.mock('@/components/RoastSchedulerTab', () => ({
  RoastSchedulerTab: () => <div>ローストスケジュール</div>,
}));

vi.mock('@/components/Loading', () => ({
  Loading: ({ message }: { message?: string }) => <div>{message ?? '読み込み中...'}</div>,
}));

vi.mock('@/app/login/page', () => ({
  default: () => <div>ログイン画面</div>,
}));

vi.mock('@/components/DatePickerModal', () => ({
  DatePickerModal: () => null,
}));

vi.mock('@/components/ScheduleOCRModal', () => ({
  ScheduleOCRModal: () => null,
}));

const baseNavigation = {
  selectedDate: '2026-06-12',
  setSelectedDate: vi.fn(),
  currentTime: new Date('2026-06-12T10:00:00'),
  isToday: true,
  isMaxDate: false,
  isWeekend: () => false,
  getTodayString: () => '2026-06-12',
  formatDateString: (d: string) => d,
  formatTime: () => '10:00',
  moveToPreviousDay: vi.fn(),
  moveToNextDay: vi.fn(),
};

const baseData: AppData = {
  todaySchedules: [],
  roastSchedules: [],
  tastingSessions: [],
  tastingRecords: [],
  notifications: [],
  encouragementCount: 0,
  dripRecipes: [],
};

describe('SchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: { uid: 'user-1' }, loading: false });
    mocks.useAppData.mockReturnValue({ data: baseData, updateData: vi.fn(), isLoading: false });
    mocks.useScheduleDateNavigation.mockReturnValue(baseNavigation);
  });

  it('認証ローディング中はLoading表示する', () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: true });
    render(<SchedulePage />);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('未ログイン時はログイン画面を表示する', () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: false });
    render(<SchedulePage />);
    expect(screen.getByText('ログイン画面')).toBeInTheDocument();
  });

  it('データロード中はLoading表示する', () => {
    mocks.useAppData.mockReturnValue({ data: baseData, updateData: vi.fn(), isLoading: true });
    render(<SchedulePage />);
    expect(screen.getByText('データを読み込み中...')).toBeInTheDocument();
  });

  it('ログイン済み・データ読み込み完了後はスケジュールコンテンツを表示する', () => {
    render(<SchedulePage />);
    // モバイル+デスクトップの両レイアウトに同じコンポーネントが表示される
    expect(screen.getAllByText('本日スケジュール').length).toBeGreaterThan(0);
  });
});
