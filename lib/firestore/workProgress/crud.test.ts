import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppData } from '@/types';
import { addWorkProgress } from './crud';

const mocks = vi.hoisted(() => ({
  saveUserData: vi.fn(),
}));

vi.mock('../userData', () => ({
  saveUserData: mocks.saveUserData,
}));

function appData(): AppData {
  return {
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
}

describe('workProgress crud save options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('wp-new');
    vi.setSystemTime(new Date('2026-05-28T00:00:00.000Z'));
  });

  it('作業進捗追加ではworkProgressesだけを保存対象にする', async () => {
    await addWorkProgress(
      'user-1',
      {
        taskName: '封入',
        status: 'pending',
      },
      appData()
    );

    expect(mocks.saveUserData).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        workProgresses: [expect.objectContaining({ id: 'wp-new', taskName: '封入' })],
        tastingSessions: [],
        tastingRecords: [],
      }),
      { syncWorkProgresses: true, updatedFields: ['workProgresses'] }
    );
  });
});
