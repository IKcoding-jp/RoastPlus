import { describe, it, expect } from 'vitest';
import { filterDefectBeans, sortDefectBeans, filterAndSortDefectBeans } from './defectBeans';
import type { DefectBean, DefectBeanSettings } from '@/types';

const makeBean = (overrides: Partial<DefectBean> & { id: string; name: string }): DefectBean => ({
  imageUrl: '',
  characteristics: '',
  tasteImpact: '',
  removalReason: '',
  isMaster: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const beanA = makeBean({ id: 'a', name: 'アフリカ豆', characteristics: '果実味', isMaster: true, order: 1, createdAt: '2026-01-01T00:00:00.000Z' });
const beanB = makeBean({ id: 'b', name: 'ブラジル豆', tasteImpact: '苦味強め', isMaster: false, order: 2, createdAt: '2026-02-01T00:00:00.000Z' });
const beanC = makeBean({ id: 'c', name: 'コロンビア豆', removalReason: '発酵臭', isMaster: false, createdAt: '2026-03-01T00:00:00.000Z' });

describe('filterDefectBeans', () => {
  it('検索クエリなし・フィルタall のとき全件返す', () => {
    const result = filterDefectBeans([beanA, beanB, beanC], '', 'all', {});
    expect(result).toHaveLength(3);
  });

  it('名前で絞り込める', () => {
    const result = filterDefectBeans([beanA, beanB, beanC], 'ブラジル', 'all', {});
    expect(result.map((b) => b.id)).toEqual(['b']);
  });

  it('characteristics で絞り込める', () => {
    const result = filterDefectBeans([beanA, beanB, beanC], '果実', 'all', {});
    expect(result.map((b) => b.id)).toEqual(['a']);
  });

  it('tasteImpact で絞り込める', () => {
    const result = filterDefectBeans([beanA, beanB, beanC], '苦味', 'all', {});
    expect(result.map((b) => b.id)).toEqual(['b']);
  });

  it('removalReason で絞り込める', () => {
    const result = filterDefectBeans([beanA, beanB, beanC], '発酵', 'all', {});
    expect(result.map((b) => b.id)).toEqual(['c']);
  });

  it('大文字小文字を無視して絞り込める', () => {
    const bean = makeBean({ id: 'x', name: 'Bean X', characteristics: 'Fruity' });
    const result = filterDefectBeans([bean], 'fruity', 'all', {});
    expect(result).toHaveLength(1);
  });

  it('空白のみのクエリは全件返す', () => {
    const result = filterDefectBeans([beanA, beanB], '   ', 'all', {});
    expect(result).toHaveLength(2);
  });

  it('shouldRemove フィルタが機能する', () => {
    const settings: DefectBeanSettings = { b: { shouldRemove: true } };
    const result = filterDefectBeans([beanA, beanB, beanC], '', 'shouldRemove', settings);
    expect(result.map((b) => b.id)).toEqual(['b']);
  });

  it('shouldNotRemove フィルタが機能する', () => {
    const settings: DefectBeanSettings = { a: { shouldRemove: false }, b: { shouldRemove: true } };
    const result = filterDefectBeans([beanA, beanB, beanC], '', 'shouldNotRemove', settings);
    expect(result.map((b) => b.id)).toEqual(['a']);
  });

  it('元の配列を変更しない（immutable）', () => {
    const original = [beanA, beanB];
    filterDefectBeans(original, 'ブラジル', 'all', {});
    expect(original).toHaveLength(2);
  });
});

describe('sortDefectBeans', () => {
  it('default: マスター豆が先、order 順', () => {
    const result = sortDefectBeans([beanC, beanB, beanA], 'default');
    expect(result[0].id).toBe('a');
  });

  it('createdAtDesc: 新しい順', () => {
    const result = sortDefectBeans([beanA, beanB, beanC], 'createdAtDesc');
    expect(result.map((b) => b.id)).toEqual(['c', 'b', 'a']);
  });

  it('createdAtAsc: 古い順', () => {
    const result = sortDefectBeans([beanC, beanB, beanA], 'createdAtAsc');
    expect(result.map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('nameAsc: 名前昇順（日本語）', () => {
    const result = sortDefectBeans([beanC, beanA, beanB], 'nameAsc');
    expect(result[0].name).toBe('アフリカ豆');
  });

  it('nameDesc: 名前降順（日本語）', () => {
    const result = sortDefectBeans([beanA, beanB, beanC], 'nameDesc');
    expect(result[0].name).toBe('ブラジル豆');
  });

  it('元の配列を変更しない（immutable）', () => {
    const original = [beanC, beanA, beanB];
    sortDefectBeans(original, 'nameAsc');
    expect(original[0].id).toBe('c');
  });
});

describe('filterAndSortDefectBeans', () => {
  it('フィルタとソートを組み合わせて適用する', () => {
    const settings: DefectBeanSettings = {};
    const result = filterAndSortDefectBeans([beanC, beanB, beanA], '', 'all', settings, 'createdAtDesc');
    expect(result.map((b) => b.id)).toEqual(['c', 'b', 'a']);
  });
});
