import { describe, it, expect } from 'vitest';
import {
  filterTastingSessions,
  sortTastingSessions,
  filterAndSortTastingSessions,
  countActiveTastingFilters,
} from './tastingFilters';
import type { TastingSession } from '@/types';

const makeSession = (overrides: Partial<TastingSession> & { id: string; beanName: string }): TastingSession => ({
  roastLevel: '中煎り',
  memo: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  userId: 'user1',
  ...overrides,
});

const sessionA = makeSession({
  id: 'a',
  beanName: 'エチオピア',
  roastLevel: '浅煎り',
  createdAt: '2026-01-01T00:00:00.000Z',
});
const sessionB = makeSession({
  id: 'b',
  beanName: 'ブラジル',
  roastLevel: '中煎り',
  createdAt: '2026-02-01T00:00:00.000Z',
});
const sessionC = makeSession({
  id: 'c',
  beanName: 'グアテマラ',
  roastLevel: '深煎り',
  createdAt: '2026-03-01T00:00:00.000Z',
});

describe('filterTastingSessions', () => {
  it('クエリなし・dateFrom/To なし・roastLevels なしで全件返す', () => {
    const result = filterTastingSessions([sessionA, sessionB, sessionC], '', '', '', []);
    expect(result).toHaveLength(3);
  });

  it('豆名で絞り込める', () => {
    const result = filterTastingSessions([sessionA, sessionB, sessionC], 'ブラジル', '', '', []);
    expect(result.map((s) => s.id)).toEqual(['b']);
  });

  it('大文字小文字を無視して絞り込める', () => {
    const s = makeSession({ id: 'x', beanName: 'Ethiopia' });
    const result = filterTastingSessions([s], 'ethiopia', '', '', []);
    expect(result).toHaveLength(1);
  });

  it('空白のみのクエリは全件返す', () => {
    const result = filterTastingSessions([sessionA, sessionB], '   ', '', '', []);
    expect(result).toHaveLength(2);
  });

  it('dateFrom で絞り込める', () => {
    const result = filterTastingSessions([sessionA, sessionB, sessionC], '', '2026-02-01', '', []);
    expect(result.map((s) => s.id)).toEqual(['b', 'c']);
  });

  it('dateTo で絞り込める', () => {
    const result = filterTastingSessions([sessionA, sessionB, sessionC], '', '', '2026-02-01', []);
    expect(result.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('焙煎度合いで絞り込める', () => {
    const result = filterTastingSessions([sessionA, sessionB, sessionC], '', '', '', ['浅煎り', '深煎り']);
    expect(result.map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('元の配列を変更しない（immutable）', () => {
    const original = [sessionB, sessionA];
    filterTastingSessions(original, 'エチオピア', '', '', []);
    expect(original[0].id).toBe('b');
  });
});

describe('sortTastingSessions', () => {
  it('newest: 新しい順', () => {
    const result = sortTastingSessions([sessionA, sessionB, sessionC], 'newest');
    expect(result.map((s) => s.id)).toEqual(['c', 'b', 'a']);
  });

  it('oldest: 古い順', () => {
    const result = sortTastingSessions([sessionC, sessionB, sessionA], 'oldest');
    expect(result.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('beanName: 豆名の五十音順', () => {
    const result = sortTastingSessions([sessionC, sessionA, sessionB], 'beanName');
    expect(result[0].beanName).toBe('エチオピア');
  });

  it('元の配列を変更しない（immutable）', () => {
    const original = [sessionC, sessionA];
    sortTastingSessions(original, 'newest');
    expect(original[0].id).toBe('c');
  });
});

describe('filterAndSortTastingSessions', () => {
  it('フィルタとソートを組み合わせて適用する', () => {
    const result = filterAndSortTastingSessions([sessionA, sessionB, sessionC], {
      searchQuery: '',
      sortOption: 'newest',
      dateFrom: '',
      dateTo: '',
      selectedRoastLevels: [],
    });
    expect(result.map((s) => s.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('countActiveTastingFilters', () => {
  it('なにも設定されていないと 0', () => {
    expect(countActiveTastingFilters({ searchQuery: '', dateFrom: '', dateTo: '', selectedRoastLevels: [] })).toBe(0);
  });

  it('searchQuery のみ設定で 1', () => {
    expect(countActiveTastingFilters({ searchQuery: 'test', dateFrom: '', dateTo: '', selectedRoastLevels: [] })).toBe(
      1
    );
  });

  it('全部設定で 4', () => {
    expect(
      countActiveTastingFilters({
        searchQuery: 'test',
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
        selectedRoastLevels: ['浅煎り'],
      })
    ).toBe(4);
  });

  it('空白のみのクエリはカウントしない', () => {
    expect(countActiveTastingFilters({ searchQuery: '   ', dateFrom: '', dateTo: '', selectedRoastLevels: [] })).toBe(
      0
    );
  });
});
