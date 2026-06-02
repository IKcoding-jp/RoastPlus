import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCachedMasterDefectBeans,
  setCachedMasterDefectBeans,
  clearCachedMasterDefectBeans,
} from './defectBeanCache';
import type { DefectBean } from '@/types';

const BEAN_A: DefectBean = {
  id: 'master-1',
  name: 'カビ豆',
  imageUrl: 'https://example.com/master-1.jpg',
  characteristics: 'カビが生えた豆',
  tasteImpact: '不快な味',
  removalReason: 'カビは品質を著しく低下させる',
  isMaster: true,
  order: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const BEAN_B: DefectBean = {
  ...BEAN_A,
  id: 'master-2',
  name: '虫食い豆',
  order: 2,
};

describe('defectBeanCache', () => {
  beforeEach(() => {
    clearCachedMasterDefectBeans();
    localStorage.clear();
  });

  afterEach(() => {
    clearCachedMasterDefectBeans();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('キャッシュが空の場合は null を返す', () => {
    expect(getCachedMasterDefectBeans()).toBeNull();
  });

  it('保存したデータを取得できる', () => {
    setCachedMasterDefectBeans([BEAN_A, BEAN_B]);
    expect(getCachedMasterDefectBeans()).toEqual([BEAN_A, BEAN_B]);
  });

  it('空配列もキャッシュとして保存・取得できる', () => {
    setCachedMasterDefectBeans([]);
    expect(getCachedMasterDefectBeans()).toEqual([]);
  });

  it('clearでキャッシュが破棄される', () => {
    setCachedMasterDefectBeans([BEAN_A]);
    clearCachedMasterDefectBeans();
    expect(getCachedMasterDefectBeans()).toBeNull();
  });

  it('localStorageから復元できる（メモリキャッシュを使わない経路）', () => {
    setCachedMasterDefectBeans([BEAN_A]);
    // メモリキャッシュをクリアしてlocalStorageのみの状態にする
    clearCachedMasterDefectBeans();
    // localStorageに直接書き戻して復元経路を検証
    localStorage.setItem(
      'roastplus_defect_beans_master_cache',
      JSON.stringify({ version: 1, cachedAt: Date.now(), data: [BEAN_A] })
    );
    expect(getCachedMasterDefectBeans()).toEqual([BEAN_A]);
  });

  it('バージョン不一致のキャッシュは無効として null を返す', () => {
    localStorage.setItem(
      'roastplus_defect_beans_master_cache',
      JSON.stringify({ version: 999, cachedAt: Date.now(), data: [BEAN_A] })
    );
    expect(getCachedMasterDefectBeans()).toBeNull();
  });

  it('壊れたJSONの場合は null を返す', () => {
    localStorage.setItem('roastplus_defect_beans_master_cache', '{ broken json');
    expect(getCachedMasterDefectBeans()).toBeNull();
  });

  it('dataが配列でない場合は null を返す', () => {
    localStorage.setItem(
      'roastplus_defect_beans_master_cache',
      JSON.stringify({ version: 1, cachedAt: Date.now(), data: 'not-an-array' })
    );
    expect(getCachedMasterDefectBeans()).toBeNull();
  });

  it('localStorageが容量超過でも例外を投げない', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => setCachedMasterDefectBeans([BEAN_A])).not.toThrow();
    // メモリキャッシュには反映される
    expect(getCachedMasterDefectBeans()).toEqual([BEAN_A]);
    spy.mockRestore();
  });
});
