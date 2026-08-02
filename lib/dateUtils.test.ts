import { describe, it, expect } from 'vitest';
import {
  formatDateToYMD,
  getTodayDateString,
  getTomorrowDateString,
  getCurrentMonth,
  getPreviousWeekday,
  getNextWeekday,
  formatDateToJapanese,
  formatDateStringToJapanese,
  formatTimeHMS,
  formatTimeHM,
  formatMinutesToHHMM,
  formatSecondsAsTimer,
  formatSecondsAsShortRemaining,
} from './dateUtils';

describe('formatDateToYMD', () => {
  it('DateオブジェクトをYYYY-MM-DD形式に変換する（JST基準）', () => {
    expect(formatDateToYMD(new Date(2024, 0, 15))).toBe('2024-01-15');
    expect(formatDateToYMD(new Date(2024, 11, 31))).toBe('2024-12-31');
  });

  it('1桁の月・日をゼロ埋めする', () => {
    expect(formatDateToYMD(new Date(2024, 0, 5))).toBe('2024-01-05');
    expect(formatDateToYMD(new Date(2024, 8, 1))).toBe('2024-09-01');
  });

  it('閏年を正しく処理する', () => {
    expect(formatDateToYMD(new Date(2024, 1, 29))).toBe('2024-02-29');
  });
});

describe('getTodayDateString', () => {
  it('指定日付をYYYY-MM-DD形式で返す', () => {
    expect(getTodayDateString(new Date(2026, 5, 13))).toBe('2026-06-13');
  });
});

describe('getTomorrowDateString', () => {
  it('翌日をYYYY-MM-DD形式で返す', () => {
    expect(getTomorrowDateString(new Date(2026, 5, 13))).toBe('2026-06-14');
  });

  it('月をまたぐ場合も正しく返す', () => {
    expect(getTomorrowDateString(new Date(2026, 5, 30))).toBe('2026-07-01');
  });

  it('年をまたぐ場合も正しく返す', () => {
    expect(getTomorrowDateString(new Date(2026, 11, 31))).toBe('2027-01-01');
  });
});

describe('getCurrentMonth', () => {
  it('当月をYYYY-MM形式で返す', () => {
    expect(getCurrentMonth(new Date(2026, 0, 15))).toBe('2026-01');
    expect(getCurrentMonth(new Date(2026, 8, 1))).toBe('2026-09');
    expect(getCurrentMonth(new Date(2026, 11, 31))).toBe('2026-12');
  });
});

describe('getPreviousWeekday', () => {
  it('前日が平日なら前日を返す', () => {
    expect(getPreviousWeekday('2026-06-10')).toBe('2026-06-09'); // 水→火
  });

  it('月曜日からは前の金曜日を返す', () => {
    expect(getPreviousWeekday('2026-06-08')).toBe('2026-06-05'); // 月→金
  });

  it('日曜日からは前の金曜日を返す', () => {
    expect(getPreviousWeekday('2026-06-07')).toBe('2026-06-05'); // 日→金
  });
});

describe('getNextWeekday', () => {
  it('翌日が平日なら翌日を返す', () => {
    expect(getNextWeekday('2026-06-09')).toBe('2026-06-10'); // 火→水
  });

  it('金曜日からは翌月曜日を返す', () => {
    expect(getNextWeekday('2026-06-05')).toBe('2026-06-08'); // 金→月
  });

  it('土曜日からは翌月曜日を返す', () => {
    expect(getNextWeekday('2026-06-06')).toBe('2026-06-08'); // 土→月
  });
});

describe('formatDateToJapanese', () => {
  it('Y年M月D日（曜）形式に変換する', () => {
    expect(formatDateToJapanese(new Date(2026, 5, 13))).toBe('2026年6月13日（土）');
    expect(formatDateToJapanese(new Date(2026, 5, 8))).toBe('2026年6月8日（月）');
  });

  it('1桁の月・日はゼロ埋めしない', () => {
    expect(formatDateToJapanese(new Date(2026, 0, 5))).toBe('2026年1月5日（月）');
  });
});

describe('formatDateStringToJapanese', () => {
  it('YYYY-MM-DD文字列をY年M月D日（曜）形式に変換する', () => {
    expect(formatDateStringToJapanese('2026-06-13')).toBe('2026年6月13日（土）');
    expect(formatDateStringToJapanese('2026-01-05')).toBe('2026年1月5日（月）');
  });
});

describe('formatTimeHMS', () => {
  it('HH:MM:SS形式に変換する', () => {
    const date = new Date(2026, 5, 13, 9, 5, 3);
    expect(formatTimeHMS(date)).toBe('09:05:03');
  });

  it('午後の時刻も正しく変換する', () => {
    const date = new Date(2026, 5, 13, 14, 30, 45);
    expect(formatTimeHMS(date)).toBe('14:30:45');
  });
});

describe('formatTimeHM', () => {
  it('HH:MM形式に変換する', () => {
    const date = new Date(2026, 5, 13, 9, 5);
    expect(formatTimeHM(date)).toBe('09:05');
  });

  it('1桁の時・分をゼロ埋めする', () => {
    const date = new Date(2026, 5, 13, 0, 0);
    expect(formatTimeHM(date)).toBe('00:00');
  });
});

describe('formatMinutesToHHMM', () => {
  it('総分数をHH:MM形式に変換する', () => {
    expect(formatMinutesToHHMM(570)).toBe('09:30');
    expect(formatMinutesToHHMM(0)).toBe('00:00');
    expect(formatMinutesToHHMM(60)).toBe('01:00');
    expect(formatMinutesToHHMM(1439)).toBe('23:59');
  });
});

describe('formatSecondsAsTimer', () => {
  it('秒数をMM:SS形式に変換する', () => {
    expect(formatSecondsAsTimer(90)).toBe('01:30');
    expect(formatSecondsAsTimer(0)).toBe('00:00');
    expect(formatSecondsAsTimer(60)).toBe('01:00');
    expect(formatSecondsAsTimer(3661)).toBe('61:01');
  });
});

describe('formatSecondsAsShortRemaining', () => {
  it('60秒未満は秒だけで表す', () => {
    expect(formatSecondsAsShortRemaining(45)).toBe('45秒');
    expect(formatSecondsAsShortRemaining(3)).toBe('3秒');
    expect(formatSecondsAsShortRemaining(0)).toBe('0秒');
    expect(formatSecondsAsShortRemaining(59)).toBe('59秒');
  });

  it('60秒以上はM:SS形式（分の先頭ゼロなし）で表す', () => {
    expect(formatSecondsAsShortRemaining(60)).toBe('1:00');
    expect(formatSecondsAsShortRemaining(80)).toBe('1:20');
    expect(formatSecondsAsShortRemaining(605)).toBe('10:05');
  });

  it('負値と小数を0秒側に丸める', () => {
    expect(formatSecondsAsShortRemaining(-5)).toBe('0秒');
    expect(formatSecondsAsShortRemaining(12.7)).toBe('12秒');
  });
});
