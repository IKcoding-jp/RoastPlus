import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { useAssignmentData } from './useAssignmentData';
import type { ShuffleSettings, TableSettings } from '@/types';

const mocks = vi.hoisted(() => ({
  fetchTeams: vi.fn(),
  fetchMembers: vi.fn(),
  fetchTaskLabels: vi.fn(),
  subscribeLatestAssignmentDay: vi.fn(),
  subscribeShuffleEvent: vi.fn(),
  subscribeTableSettings: vi.fn(),
  fetchRecentAssignments: vi.fn(),
  mutateAssignmentDay: vi.fn(),
  getServerTodayDate: vi.fn(),
  subscribeManager: vi.fn(),
  subscribePairExclusions: vi.fn(),
  subscribeShuffleSettings: vi.fn(),
}));

vi.mock('@/lib/firestore/assignment', () => ({
  fetchTeams: mocks.fetchTeams,
  fetchMembers: mocks.fetchMembers,
  fetchTaskLabels: mocks.fetchTaskLabels,
  subscribeLatestAssignmentDay: mocks.subscribeLatestAssignmentDay,
  subscribeShuffleEvent: mocks.subscribeShuffleEvent,
  subscribeTableSettings: mocks.subscribeTableSettings,
  fetchRecentAssignments: mocks.fetchRecentAssignments,
  mutateAssignmentDay: mocks.mutateAssignmentDay,
  getServerTodayDate: mocks.getServerTodayDate,
  subscribeManager: mocks.subscribeManager,
  subscribePairExclusions: mocks.subscribePairExclusions,
  subscribeShuffleSettings: mocks.subscribeShuffleSettings,
  DEFAULT_SHUFFLE_SETTINGS: { crossTeamShuffle: false, priority: {} },
}));

describe('useAssignmentData', () => {
  const unsubscribe = vi.fn();

  beforeEach(() => {
    mocks.fetchTeams.mockResolvedValue([]);
    mocks.fetchMembers.mockResolvedValue([]);
    mocks.fetchTaskLabels.mockResolvedValue([]);
    mocks.fetchRecentAssignments.mockResolvedValue([]);
    mocks.mutateAssignmentDay.mockResolvedValue({ assignments: [], changed: false });
    mocks.getServerTodayDate.mockResolvedValue('2026-05-23');
    mocks.subscribeLatestAssignmentDay.mockImplementation((_userId, callback) => {
      callback(null);
      return unsubscribe;
    });
    mocks.subscribeTableSettings.mockImplementation((_userId, callback) => {
      callback({
        colWidths: { taskLabel: 160, note: 160, teams: {} },
        rowHeights: {},
        headerLabels: {},
      } as TableSettings);
      return unsubscribe;
    });
    mocks.subscribeManager.mockImplementation((_userId, callback) => {
      callback(null);
      return unsubscribe;
    });
    mocks.subscribePairExclusions.mockImplementation((_userId, callback) => {
      callback([]);
      return unsubscribe;
    });
    mocks.subscribeShuffleSettings.mockImplementation((_userId, callback) => {
      callback({ crossTeamShuffle: false, priority: {} } as ShuffleSettings);
      return unsubscribe;
    });
    mocks.subscribeShuffleEvent.mockImplementation(() => unsubscribe);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('マスターデータ取得が失敗しても読み込み中のままにしない', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('permission denied');
    mocks.fetchTeams.mockRejectedValue(error);

    const { result } = renderHook(() => useAssignmentData('user-1', false));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load assignment master data:', error);
    consoleErrorSpy.mockRestore();
  });
});
