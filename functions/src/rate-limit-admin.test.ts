import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetApps, mockGetApp, mockInitializeApp, mockGetFirestore, mockRunTransaction } = vi.hoisted(() => ({
  mockGetApps: vi.fn(),
  mockGetApp: vi.fn(),
  mockInitializeApp: vi.fn(),
  mockGetFirestore: vi.fn(),
  mockRunTransaction: vi.fn(),
}));

vi.mock('firebase-admin/app', () => ({
  getApps: mockGetApps,
  getApp: mockGetApp,
  initializeApp: mockInitializeApp,
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    increment: (value: number) => ({ type: 'increment', value }),
    serverTimestamp: () => ({ type: 'serverTimestamp' }),
  },
  getFirestore: mockGetFirestore,
}));

describe('assertDailyUsageLimit admin app initialization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    const doc = {};
    const collection = vi.fn(() => ({
      doc: vi.fn(() => doc),
    }));
    const tx = {
      get: vi.fn(async () => ({
        exists: false,
        get: vi.fn(),
      })),
      set: vi.fn(),
    };

    mockRunTransaction.mockImplementation(async (callback: (transaction: typeof tx) => Promise<void>) => {
      await callback(tx);
    });
    mockGetFirestore.mockImplementation((app?: unknown) => {
      if (!app) {
        throw new Error('The default Firebase app does not exist.');
      }
      return {
        collection,
        runTransaction: mockRunTransaction,
      };
    });
  });

  it('デフォルト以外のAdmin appだけが存在してもデフォルトappを初期化してFirestoreを使う', async () => {
    const namedApp = { name: 'named' };
    const defaultApp = { name: '[DEFAULT]' };
    mockGetApps.mockReturnValue([namedApp]);
    mockGetApp.mockImplementation(() => {
      const error = new Error('The default Firebase app does not exist.') as Error & { code?: string };
      error.code = 'app/no-app';
      throw error;
    });
    mockInitializeApp.mockReturnValue(defaultApp);

    const { assertDailyUsageLimit } = await import('./rate-limit');

    await expect(
      assertDailyUsageLimit({
        uid: 'user-id',
        functionName: 'ocrScheduleFromImage',
        limit: 30,
      })
    ).resolves.toBeUndefined();

    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
    expect(mockGetFirestore).toHaveBeenCalledWith(defaultApp);
  });
});
