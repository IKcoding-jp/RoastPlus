import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSaveError, clearSaveError } from '@/lib/syncStatus';
import type { AppData } from '@/types';

const firestoreMocks = vi.hoisted(() => {
  const batch = {
    set: vi.fn(),
    commit: vi.fn(),
  };

  return {
    batch,
    getFirestore: vi.fn(() => ({ app: 'mock-firestore' })),
    doc: vi.fn((first: { path?: string } | unknown, ...segments: string[]) => {
      const basePath =
        first && typeof first === 'object' && 'path' in first && typeof first.path === 'string' ? first.path : '';
      const path = basePath ? [basePath, ...segments].join('/') : segments.join('/');
      return { id: segments.at(-1), path };
    }),
    setDoc: vi.fn(),
    writeBatch: vi.fn(() => batch),
    deleteField: vi.fn(),
  };
});

vi.mock('../firebase', () => ({
  default: {},
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: firestoreMocks.getFirestore,
  doc: firestoreMocks.doc,
  setDoc: firestoreMocks.setDoc,
  writeBatch: firestoreMocks.writeBatch,
  deleteField: firestoreMocks.deleteField,
}));

function appData(overrides: Partial<AppData> = {}): AppData {
  return {
    todaySchedules: [],
    roastSchedules: [],
    tastingSessions: [],
    tastingRecords: [],
    notifications: [],
    encouragementCount: 0,
    dripRecipes: [],
    ...overrides,
  };
}

function rootWritePayloads() {
  const directWrites = firestoreMocks.setDoc.mock.calls
    .filter(([ref]) => ref.path === 'users/user-1')
    .map(([, data]) => data as Record<string, unknown>);
  const batchWrites = firestoreMocks.batch.set.mock.calls
    .filter(([ref]) => ref.path === 'users/user-1')
    .map(([, data]) => data as Record<string, unknown>);

  return [...directWrites, ...batchWrites];
}

async function flushSaveTimers(debounceMs: number) {
  await vi.advanceTimersByTimeAsync(debounceMs + 10_000);
}

describe('saveUserData root write behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-24T00:00:00.000Z'));
    vi.clearAllMocks();
    firestoreMocks.setDoc.mockResolvedValue(undefined);
    firestoreMocks.batch.commit.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    const { clearWriteQueueStateForTests } = await import('./userData/write-queue');
    clearWriteQueueStateForTests();
    vi.useRealTimers();
  });

  it('関係ないAppDataフィールドのroot保存挙動を維持する', async () => {
    const { saveUserData, SAVE_USER_DATA_DEBOUNCE_MS } = await import('./userData');

    const savePromise = saveUserData(
      'user-1',
      appData({
        todaySchedules: [{ id: 'today-1', date: '2026-05-24', timeLabels: [] }],
      })
    );

    await flushSaveTimers(SAVE_USER_DATA_DEBOUNCE_MS);
    await savePromise;

    expect(rootWritePayloads()[0]).toMatchObject({
      todaySchedules: [{ id: 'today-1', date: '2026-05-24', timeLabels: [] }],
    });
  });

  it('更新対象外のtastingSessionsとtastingRecordsを空配列で上書きしない', async () => {
    const { saveUserData, SAVE_USER_DATA_DEBOUNCE_MS } = await import('./userData');

    const savePromise = saveUserData(
      'user-1',
      appData({
        encouragementCount: 9,
        tastingSessions: [],
        tastingRecords: [],
      }),
      { updatedFields: ['encouragementCount'] }
    );

    await flushSaveTimers(SAVE_USER_DATA_DEBOUNCE_MS);
    await savePromise;

    expect(rootWritePayloads()).toHaveLength(1);
    expect(rootWritePayloads()[0]).toEqual({ encouragementCount: 9 });
  });
});

describe('保存失敗時のユーザー通知（issue #497）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T00:00:00.000Z'));
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    clearSaveError();
    firestoreMocks.setDoc.mockResolvedValue(undefined);
    firestoreMocks.batch.commit.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    const { clearWriteQueueStateForTests } = await import('./userData/write-queue');
    clearWriteQueueStateForTests();
    clearSaveError();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function firestoreError(code: string): Error {
    return Object.assign(new Error(`mock firestore error: ${code}`), { code });
  }

  it('保存が最終的に失敗したら saveError を報告し promise を reject する', async () => {
    const { saveUserData, SAVE_USER_DATA_DEBOUNCE_MS } = await import('./userData');

    firestoreMocks.batch.commit.mockRejectedValue(firestoreError('permission-denied'));

    const savePromise = saveUserData('user-1', appData());
    const rejection = expect(savePromise).rejects.toMatchObject({ code: 'permission-denied' });

    await flushSaveTimers(SAVE_USER_DATA_DEBOUNCE_MS);
    await rejection;

    expect(getSaveError()).toBe('permission-denied');
  });

  it('呼び出し側が await も catch もしない経路でも saveError が報告される', async () => {
    const { saveUserData, SAVE_USER_DATA_DEBOUNCE_MS } = await import('./userData');

    firestoreMocks.batch.commit.mockRejectedValue(firestoreError('unavailable'));

    // 戻り値を完全に無視する（catch 漏れの再現）。
    // テストランナーの未処理 rejection 検出を避けるため catch だけ握る
    void saveUserData('user-1', appData()).catch(() => {});

    await flushSaveTimers(SAVE_USER_DATA_DEBOUNCE_MS);

    expect(getSaveError()).toBe('unavailable');
  });

  it('リトライ対象エラー（resource-exhausted）も全リトライ失敗後に saveError を報告する', async () => {
    const { saveUserData, SAVE_USER_DATA_DEBOUNCE_MS } = await import('./userData');

    firestoreMocks.batch.commit.mockRejectedValue(firestoreError('resource-exhausted'));

    const savePromise = saveUserData('user-1', appData());
    const rejection = expect(savePromise).rejects.toMatchObject({ code: 'resource-exhausted' });

    // デバウンス + 指数バックオフ（1s+2s+4s）を全て消化する
    await flushSaveTimers(SAVE_USER_DATA_DEBOUNCE_MS);
    await rejection;

    expect(getSaveError()).toBe('unknown');
  });

  it('次の保存が成功したら saveError をクリアする', async () => {
    const { saveUserData, SAVE_USER_DATA_DEBOUNCE_MS } = await import('./userData');

    // 1回目: 失敗
    firestoreMocks.batch.commit.mockRejectedValue(firestoreError('permission-denied'));
    const failedSave = saveUserData('user-1', appData());
    const rejection = expect(failedSave).rejects.toMatchObject({ code: 'permission-denied' });
    await flushSaveTimers(SAVE_USER_DATA_DEBOUNCE_MS);
    await rejection;
    expect(getSaveError()).toBe('permission-denied');

    // 2回目: 成功 → 「保存できていない」状態は解除される
    firestoreMocks.batch.commit.mockResolvedValue(undefined);
    const successSave = saveUserData('user-1', appData());
    await flushSaveTimers(SAVE_USER_DATA_DEBOUNCE_MS);
    await successSave;

    expect(getSaveError()).toBeNull();
  });
});
