import { describe, it, expect } from 'vitest';
import { formatSecondsAsTimer } from '@/lib/dateUtils';

describe('formatSecondsAsTimer', () => {
  it('0秒 → "00:00"', () => {
    expect(formatSecondsAsTimer(0)).toBe('00:00');
  });

  it('5秒 → "00:05"', () => {
    expect(formatSecondsAsTimer(5)).toBe('00:05');
  });

  it('59秒 → "00:59"', () => {
    expect(formatSecondsAsTimer(59)).toBe('00:59');
  });

  it('60秒 → "01:00"', () => {
    expect(formatSecondsAsTimer(60)).toBe('01:00');
  });

  it('65秒 → "01:05"', () => {
    expect(formatSecondsAsTimer(65)).toBe('01:05');
  });

  it('120秒 → "02:00"', () => {
    expect(formatSecondsAsTimer(120)).toBe('02:00');
  });

  it('3600秒 → "60:00"', () => {
    expect(formatSecondsAsTimer(3600)).toBe('60:00');
  });
});
