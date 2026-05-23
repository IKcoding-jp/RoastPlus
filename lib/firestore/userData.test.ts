import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppData, WorkProgress } from '@/types';

const firestoreMocks = vi.hoisted(() => {
  const unsubscribe = vi.fn();

  return {
    unsubscribe,
    getFirestore: vi.fn(() => ({ app: 'mock-firestore' })),
    doc: vi.fn((first: { path?: string } | unknown, ...segments: string[]) => {
      const basePath =
        first && typeof first === 'object' && 'path' in first && typeof first.path === 'string'
          ? first.path
          : '';
      const path = basePath ? [basePath, ...segments].join('/') : segments.join('/');
      return { id: segments.at(-1), path };
    }),
    collection: vi.fn((first: { path?: string } | unknown, ...segments: string[]) => {
      const basePath =
        first && typeof first === 'object' && 'path' in first && typeof first.path === 'string'
          ? first.path
          : '';
      const path = basePath ? [basePath, ...segments].join('/') : segments.join('/');
      return { path };
    }),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    onSnapshot: vi.fn(),
    setDoc: vi.fn(),
  };
});

vi.mock('../firebase', () => ({
  default: {},
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: firestoreMocks.getFirestore,
  doc: firestoreMocks.doc,
  collection: firestoreMocks.collection,
  getDoc: firestoreMocks.getDoc,
  getDocs: firestoreMocks.getDocs,
  onSnapshot: firestoreMocks.onSnapshot,
  setDoc: firestoreMocks.setDoc,
}));

const rootWorkProgress: WorkProgress = {
  id: 'wp-root',
  taskName: '旧root進捗',
  status: 'pending',
  createdAt: '2026-05-20T00:00:00.000Z',
  updatedAt: '2026-05-20T00:00:00.000Z',
};

const splitWorkProgress: WorkProgress = {
  id: 'wp-split',
  taskName: '新形式進捗',
  status: 'in_progress',
  createdAt: '2026-05-21T00:00:00.000Z',
  updatedAt: '2026-05-21T00:00:00.000Z',
};

function baseAppData(overrides: Partial<AppData> = {}): AppData {
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
    ...overrides,
  };
}

function docSnapshot(data: Record<string, unknown> | undefined) {
  return {
    exists: () => data !== undefined,
    data: () => data,
  };
}

function querySnapshot(progresses: WorkProgress[]) {
  return {
    docs: progresses.map((progress) => ({
      id: progress.id,
      ref: { path: `users/user-1/workProgresses/${progress.id}` },
      data: () => progress,
    })),
  };
}

describe('getUserData workProgresses split compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.setDoc.mockResolvedValue(undefined);
  });

  it('新形式がない場合は旧root workProgressesから読み込む', async () => {
    firestoreMocks.getDoc
      .mockResolvedValueOnce(docSnapshot(baseAppData({ workProgresses: [rootWorkProgress] }) as unknown as Record<string, unknown>))
      .mockResolvedValueOnce(docSnapshot(undefined));
    firestoreMocks.getDocs.mockResolvedValueOnce(querySnapshot([]));

    const { getUserData } = await import('./userData/crud');

    const result = await getUserData('user-1');

    expect(result.workProgresses).toEqual([rootWorkProgress]);
  });

  it('新形式がある場合は旧rootより users/{uid}/workProgresses を優先する', async () => {
    firestoreMocks.getDoc
      .mockResolvedValueOnce(docSnapshot(baseAppData({ workProgresses: [rootWorkProgress] }) as unknown as Record<string, unknown>))
      .mockResolvedValueOnce(docSnapshot(undefined));
    firestoreMocks.getDocs.mockResolvedValueOnce(querySnapshot([splitWorkProgress]));

    const { getUserData } = await import('./userData/crud');

    const result = await getUserData('user-1');

    expect(result.workProgresses).toEqual([splitWorkProgress]);
  });

  it('移行済み判定がある場合は空サブコレクションでも旧rootへfallbackしない', async () => {
    firestoreMocks.getDoc
      .mockResolvedValueOnce(docSnapshot(baseAppData({ workProgresses: [rootWorkProgress] }) as unknown as Record<string, unknown>))
      .mockResolvedValueOnce(docSnapshot({ workProgressesMigrated: true }));
    firestoreMocks.getDocs.mockResolvedValueOnce(querySnapshot([]));

    const { getUserData } = await import('./userData/crud');

    const result = await getUserData('user-1');

    expect(result.workProgresses).toEqual([]);
  });
});

describe('subscribeUserData workProgresses split merge', () => {
  const snapshotHandlers = new Map<string, (snapshot: unknown) => void>();

  beforeEach(() => {
    vi.clearAllMocks();
    snapshotHandlers.clear();
    firestoreMocks.onSnapshot.mockImplementation((ref, next) => {
      snapshotHandlers.set(ref.path, next);
      return firestoreMocks.unsubscribe;
    });
  });

  it('root doc更新とworkProgressesサブコレクション更新をAppData.workProgressesへ安全にマージする', async () => {
    const received: AppData[] = [];
    const { subscribeUserData } = await import('./userData/crud');

    const unsubscribe = subscribeUserData('user-1', (data) => received.push(data));

    snapshotHandlers.get('users/user-1')?.(
      docSnapshot(baseAppData({
        encouragementCount: 1,
        workProgresses: [rootWorkProgress],
      }) as unknown as Record<string, unknown>)
    );
    snapshotHandlers.get('users/user-1/_meta/dataSplits')?.(docSnapshot(undefined));
    snapshotHandlers.get('users/user-1/workProgresses')?.(querySnapshot([splitWorkProgress]));

    expect(received.at(-1)?.encouragementCount).toBe(1);
    expect(received.at(-1)?.workProgresses).toEqual([splitWorkProgress]);

    snapshotHandlers.get('users/user-1')?.(
      docSnapshot(baseAppData({
        encouragementCount: 2,
        workProgresses: [rootWorkProgress],
      }) as unknown as Record<string, unknown>)
    );

    expect(received.at(-1)?.encouragementCount).toBe(2);
    expect(received.at(-1)?.workProgresses).toEqual([splitWorkProgress]);

    unsubscribe();
    expect(firestoreMocks.unsubscribe).toHaveBeenCalled();
  });

  it('移行済み判定がある場合は購読でも空サブコレクションを正として扱う', async () => {
    const received: AppData[] = [];
    const { subscribeUserData } = await import('./userData/crud');

    subscribeUserData('user-1', (data) => received.push(data));

    snapshotHandlers.get('users/user-1')?.(
      docSnapshot(baseAppData({ workProgresses: [rootWorkProgress] }) as unknown as Record<string, unknown>)
    );
    snapshotHandlers.get('users/user-1/_meta/dataSplits')?.(
      docSnapshot({ workProgressesMigrated: true })
    );
    snapshotHandlers.get('users/user-1/workProgresses')?.(querySnapshot([]));

    expect(received.at(-1)?.workProgresses).toEqual([]);
  });
});
