import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useHomeFeatureVisibility } from './useHomeFeatureVisibility';
import type { AppData } from '@/types';

const mockUpdateData = vi.fn();
let mockData: AppData;

vi.mock('./useAppData', () => ({
  useAppData: () => ({
    data: mockData,
    updateData: mockUpdateData,
    isLoading: false,
  }),
}));

const baseData: AppData = {
  todaySchedules: [],
  roastSchedules: [],
  tastingSessions: [],
  tastingRecords: [],
  notifications: [],
  encouragementCount: 0,
  roastTimerRecords: [],
  workProgresses: [],
  dripRecipes: [],
};

describe('useHomeFeatureVisibility', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUpdateData.mockReset();
    mockData = { ...baseData };
  });

  it('Firestoreのアカウント設定から非表示機能を読み込む', async () => {
    mockData = {
      ...baseData,
      userSettings: {
        homeHiddenFeatureKeys: ['dev-stories'],
      },
    };

    const { result } = renderHook(() => useHomeFeatureVisibility());

    await waitFor(() => {
      expect(result.current.hiddenKeys).toEqual(['dev-stories']);
    });

    expect(result.current.isVisible('dev-stories')).toBe(false);
    expect(result.current.isVisible('assignment')).toBe(true);
  });

  it('非表示設定の変更をアカウント設定へ保存する', async () => {
    mockData = {
      ...baseData,
      userSettings: {
        selectedMemberId: 'member-1',
      },
    };

    const { result } = renderHook(() => useHomeFeatureVisibility());

    await act(async () => {
      result.current.updateFeatureHidden('dev-stories', true);
    });

    expect(mockUpdateData).toHaveBeenCalledWith(expect.any(Function));

    const updater = mockUpdateData.mock.calls[0][0] as (currentData: AppData) => AppData;
    expect(updater(mockData).userSettings).toEqual({
      selectedMemberId: 'member-1',
      homeHiddenFeatureKeys: ['dev-stories'],
    });
  });

  it('Firestore側に未設定なら既存localStorage値をアカウント設定へ移行する', async () => {
    localStorage.setItem('roastplus_home_hidden_features', JSON.stringify(['dev-stories', 'settings']));

    renderHook(() => useHomeFeatureVisibility());

    await waitFor(() => {
      expect(mockUpdateData).toHaveBeenCalledWith(expect.any(Function));
    });

    const updater = mockUpdateData.mock.calls[0][0] as (currentData: AppData) => AppData;
    expect(updater(mockData).userSettings?.homeHiddenFeatureKeys).toEqual(['dev-stories']);
  });
});
