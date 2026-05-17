import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_WORK_CHIME_SETTINGS,
  getCurrentWorkChimePeriod,
  getDueWorkChime,
  getNextWorkChime,
  getWorkChimeSettings,
  setWorkChimeSettings,
  type WorkChimeSettings,
} from './workChime';

const createLocalStorageMock = () => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };
};

const localDate = (hour: number, minute: number, second = 0) => new Date(2026, 4, 17, hour, minute, second);

describe('workChime', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock());
  });

  it('未設定の場合は時間帯ベースのデフォルト設定を返す', () => {
    expect(getWorkChimeSettings()).toEqual(DEFAULT_WORK_CHIME_SETTINGS);
    expect(getWorkChimeSettings().voiceAnnouncementEnabled).toBe(false);
    expect(getWorkChimeSettings().periods[0]).toEqual({
      id: 'work-1',
      start: '10:00',
      end: '10:45',
      kind: 'work',
    });
    expect(getWorkChimeSettings().periods.at(-1)).toEqual({
      id: 'cleanup-1',
      start: '16:35',
      end: '17:00',
      kind: 'cleanup',
    });
  });

  it('部分設定をデフォルト値とマージする', () => {
    localStorage.setItem('roastplus_work_chime_settings', JSON.stringify({
      enabled: false,
      volume: 0.4,
    }));

    expect(getWorkChimeSettings()).toEqual({
      ...DEFAULT_WORK_CHIME_SETTINGS,
      enabled: false,
      volume: 0.4,
    });
  });

  it('時間帯設定を保存する', () => {
    const settings: WorkChimeSettings = {
      ...DEFAULT_WORK_CHIME_SETTINGS,
      periods: [
        { id: 'custom-work', start: '08:30', end: '11:00', kind: 'work' },
        { id: 'custom-break', start: '11:00', end: '11:15', kind: 'break' },
      ],
    };

    setWorkChimeSettings(settings);

    expect(localStorage.getItem('roastplus_work_chime_settings')).toBe(JSON.stringify(settings));
  });

  it('現在の作業時間帯と終了までの分数を返す', () => {
    const now = localDate(10, 40, 4);

    const current = getCurrentWorkChimePeriod(now, DEFAULT_WORK_CHIME_SETTINGS);

    expect(current).toEqual({
      period: {
        id: 'work-1',
        start: '10:00',
        end: '10:45',
        kind: 'work',
      },
      label: '作業中',
      minutesUntilEnd: 5,
    });
  });

  it('次の区切りと残り分数を時間帯から返す', () => {
    const now = localDate(10, 40, 4);

    const next = getNextWorkChime(now, DEFAULT_WORK_CHIME_SETTINGS);

    expect(next).toEqual({
      period: {
        id: 'break-1',
        start: '10:45',
        end: '11:00',
        kind: 'break',
      },
      time: '10:45',
      kind: 'break',
      label: '休憩開始',
      minutesUntil: 5,
    });
  });

  it('当日の最後の区切り後は翌日の最初の区切りを返す', () => {
    const now = localDate(23, 30);

    const next = getNextWorkChime(now, DEFAULT_WORK_CHIME_SETTINGS);

    expect(next?.period.id).toBe('work-1');
    expect(next?.minutesUntil).toBe(630);
  });

  it('発火時刻に該当するチャイムを時間帯から返す', () => {
    const now = localDate(11, 0, 12);

    const due = getDueWorkChime(now, DEFAULT_WORK_CHIME_SETTINGS, []);

    expect(due?.period.id).toBe('work-2');
    expect(due?.time).toBe('11:00');
    expect(due?.kind).toBe('work-resume');
    expect(due?.label).toBe('作業再開');
    expect(due?.playKey).toBe('2026-05-17:work-2');
    expect(due?.message).toBe('作業開始です');
  });

  it('16:35の掃除開始チャイムを返す', () => {
    const now = localDate(16, 35, 12);

    const due = getDueWorkChime(now, DEFAULT_WORK_CHIME_SETTINGS, []);

    expect(due?.period.id).toBe('cleanup-1');
    expect(due?.kind).toBe('cleanup-start');
    expect(due?.label).toBe('掃除開始');
    expect(due?.message).toBe('掃除開始です');
  });

  it('同じ日に同じチャイムは再発火しない', () => {
    const now = localDate(10, 45, 40);

    const due = getDueWorkChime(now, DEFAULT_WORK_CHIME_SETTINGS, ['2026-05-17:break-1']);

    expect(due).toBeNull();
  });

  it('無効化されている場合は現在表示も発火もしない', () => {
    const now = localDate(10, 45, 12);
    const settings = {
      ...DEFAULT_WORK_CHIME_SETTINGS,
      enabled: false,
    };

    expect(getCurrentWorkChimePeriod(now, settings)).toBeNull();
    expect(getDueWorkChime(now, settings, [])).toBeNull();
  });
});
