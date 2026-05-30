import { describe, it, expect, vi } from 'vitest';
import { formatDateString } from './dateUtils';

describe('formatDateString', () => {
  it('Dateオブジェクトを YYYY-MM-DD 形式に変換する', () => {
    // ローカル時刻でDateを生成し、ローカル暦日が返ることを確認（タイムゾーン非依存）
    const date = new Date(2024, 11, 25, 15, 30, 0);
    expect(formatDateString(date)).toBe('2024-12-25');
  });

  it('日付の時刻部分は無視される', () => {
    const morning = new Date(2024, 0, 15, 9, 0, 0);
    const evening = new Date(2024, 0, 15, 21, 0, 0);

    expect(formatDateString(morning)).toBe('2024-01-15');
    expect(formatDateString(evening)).toBe('2024-01-15');
  });

  it('JST早朝(0〜8時台)でも前日にならずローカル暦日を返す', () => {
    // toISOString()(UTC基準)実装では JST 06:00 が前日(UTC 前日21:00)に化ける。
    // 早朝稼働の焙煎現場でデフォルト日付が前日になる回帰を防ぐ。
    const earlyMorning = new Date(2026, 4, 30, 6, 0, 0); // ローカル 2026-05-30 06:00
    expect(formatDateString(earlyMorning)).toBe('2026-05-30');

    const justAfterMidnight = new Date(2026, 4, 30, 0, 30, 0); // ローカル 2026-05-30 00:30
    expect(formatDateString(justAfterMidnight)).toBe('2026-05-30');
  });

  it('引数なしの場合は現在日時(ローカル暦日)を使用する', () => {
    // 現在日時をモック（ローカル早朝でも当日になることを確認）
    const mockDate = new Date(2024, 5, 15, 6, 0, 0);
    vi.setSystemTime(mockDate);

    expect(formatDateString()).toBe('2024-06-15');

    // モックをクリア
    vi.useRealTimers();
  });

  it('閏年の日付を正しく処理する', () => {
    const leapDay = new Date(2024, 1, 29, 0, 0, 0);
    expect(formatDateString(leapDay)).toBe('2024-02-29');
  });

  it('年末年始の日付を正しく処理する', () => {
    const newYear = new Date(2024, 0, 1, 0, 0, 0);
    const newYearEve = new Date(2024, 11, 31, 23, 59, 59);

    expect(formatDateString(newYear)).toBe('2024-01-01');
    expect(formatDateString(newYearEve)).toBe('2024-12-31');
  });
});
