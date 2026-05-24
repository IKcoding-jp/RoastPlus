import { describe, it, expect } from 'vitest';
import { formatTime, formatTimeAsMinutes, formatTimeAsMinutesAndSeconds } from './roastTimerUtils';

describe('formatTime', () => {
  it('0秒 → "00:00"', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('65秒 → "01:05"', () => {
    expect(formatTime(65)).toBe('01:05');
  });

  it('3600秒 → "60:00"', () => {
    expect(formatTime(3600)).toBe('60:00');
  });

  it('59秒 → "00:59"', () => {
    expect(formatTime(59)).toBe('00:59');
  });

  it('小数点は切り捨て', () => {
    expect(formatTime(65.9)).toBe('01:05');
  });
});

describe('formatTimeAsMinutes', () => {
  it('60秒 → "1分"', () => {
    expect(formatTimeAsMinutes(60)).toBe('1分');
  });

  it('90秒 → "2分"（四捨五入）', () => {
    expect(formatTimeAsMinutes(90)).toBe('2分');
  });

  it('0秒 → "0分"', () => {
    expect(formatTimeAsMinutes(0)).toBe('0分');
  });

  it('30秒 → "1分"（四捨五入）', () => {
    expect(formatTimeAsMinutes(30)).toBe('1分');
  });

  it('300秒 → "5分"', () => {
    expect(formatTimeAsMinutes(300)).toBe('5分');
  });
});

describe('formatTimeAsMinutesAndSeconds', () => {
  it('0秒 → "0秒"', () => {
    expect(formatTimeAsMinutesAndSeconds(0)).toBe('0秒');
  });

  it('30秒 → "30秒"', () => {
    expect(formatTimeAsMinutesAndSeconds(30)).toBe('30秒');
  });

  it('60秒 → "1分"', () => {
    expect(formatTimeAsMinutesAndSeconds(60)).toBe('1分');
  });

  it('90秒 → "1分30秒"', () => {
    expect(formatTimeAsMinutesAndSeconds(90)).toBe('1分30秒');
  });

  it('125秒 → "2分5秒"', () => {
    expect(formatTimeAsMinutesAndSeconds(125)).toBe('2分5秒');
  });

  it('小数点は切り捨て', () => {
    expect(formatTimeAsMinutesAndSeconds(90.9)).toBe('1分30秒');
  });
});
