import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHiddenHomeFeatureKeys, isHomeFeatureVisible, setHomeFeatureHidden } from './homeFeatureVisibility';

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

describe('homeFeatureVisibility', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  it('未設定の場合はホーム機能をすべて表示する', () => {
    expect(isHomeFeatureVisible('assignment')).toBe(true);
    expect(isHomeFeatureVisible('dev-stories')).toBe(true);
  });

  it('非表示にした機能だけをlocalStorageに保存する', () => {
    setHomeFeatureHidden('dev-stories', true);

    expect(getHiddenHomeFeatureKeys()).toEqual(['dev-stories']);
    expect(isHomeFeatureVisible('dev-stories')).toBe(false);
    expect(isHomeFeatureVisible('assignment')).toBe(true);
  });

  it('その他は再表示の入口なので非表示にできない', () => {
    setHomeFeatureHidden('settings', true);

    expect(getHiddenHomeFeatureKeys()).toEqual([]);
    expect(isHomeFeatureVisible('settings')).toBe(true);
  });
});
