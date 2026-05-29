import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FirestoreTransactionMock {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

const firestoreMocks = vi.hoisted(() => {
  const transaction: FirestoreTransactionMock = {
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  return {
    transaction,
    getFirestore: vi.fn(() => ({ app: 'mock-firestore' })),
    collection: vi.fn((first: { path?: string } | unknown, ...segments: string[]) => {
      const basePath =
        first && typeof first === 'object' && 'path' in first && typeof first.path === 'string' ? first.path : '';
      const path = basePath ? [basePath, ...segments].join('/') : segments.join('/');
      return { path };
    }),
    doc: vi.fn((first: { path?: string } | unknown, ...segments: string[]) => {
      const basePath =
        first && typeof first === 'object' && 'path' in first && typeof first.path === 'string' ? first.path : '';
      // segmentsが空(doc(colRef)自動ID)の場合は固定のauto-idを返す
      if (segments.length === 0) {
        return { id: 'auto-generated-id', path: basePath ? `${basePath}/auto-generated-id` : 'auto-generated-id' };
      }
      const path = basePath ? [basePath, ...segments].join('/') : segments.join('/');
      return { id: segments.at(-1), path };
    }),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    addDoc: vi.fn(),
    setDoc: vi.fn(),
    limit: vi.fn((value: number) => ({ type: 'limit', value })),
    onSnapshot: vi.fn(),
    orderBy: vi.fn((field: string, direction: string) => ({ type: 'orderBy', field, direction })),
    query: vi.fn((...args: unknown[]) => ({ args })),
    runTransaction: vi.fn(async (_db: unknown, callback: (transaction: FirestoreTransactionMock) => Promise<void>) =>
      callback(transaction)
    ),
    serverTimestamp: vi.fn(() => 'server-timestamp'),
    where: vi.fn((field: string, operator: string, value: string) => ({ type: 'where', field, operator, value })),
  };
});

vi.mock('../firebase', () => ({
  default: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: firestoreMocks.collection,
  doc: firestoreMocks.doc,
  getDocs: firestoreMocks.getDocs,
  getDoc: firestoreMocks.getDoc,
  addDoc: firestoreMocks.addDoc,
  setDoc: firestoreMocks.setDoc,
  getFirestore: firestoreMocks.getFirestore,
  limit: firestoreMocks.limit,
  onSnapshot: firestoreMocks.onSnapshot,
  orderBy: firestoreMocks.orderBy,
  query: firestoreMocks.query,
  runTransaction: firestoreMocks.runTransaction,
  serverTimestamp: firestoreMocks.serverTimestamp,
  where: firestoreMocks.where,
}));

/** 単一docスナップショットを生成する。 */
function docSnapshot(id: string, data: Record<string, unknown> | null) {
  return {
    exists: () => data !== null,
    id,
    data: () => data ?? undefined,
  };
}

/** コレクションスナップショット(docs配列)を生成する。 */
function collectionSnapshot(records: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    docs: records.map((record) => ({
      id: record.id,
      data: () => record.data,
    })),
  };
}

describe('getProductionRecordsCollectionRef', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses /users/{uid}/productionRecords as the collection path', async () => {
    const { getProductionRecordsCollectionRef } = await import('./productionRecords');

    expect(getProductionRecordsCollectionRef('user-1')).toEqual({
      path: 'users/user-1/productionRecords',
    });
  });
});

describe('getProductionRecordMonthDocRef', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses /users/{uid}/productionRecords/{YYYY-MM} as the document path', async () => {
    const { getProductionRecordMonthDocRef } = await import('./productionRecords');

    expect(getProductionRecordMonthDocRef('user-1', '2026-08')).toEqual({
      id: '2026-08',
      path: 'users/user-1/productionRecords/2026-08',
    });
  });

  it('rejects invalid months before building a Firestore document path', async () => {
    const { getProductionRecordMonthDocRef } = await import('./productionRecords');

    expect(() => getProductionRecordMonthDocRef('user-1', '2026-13')).toThrow('対象月が正しくありません');
  });
});

describe('subcollection refs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds handpickEntries / roastEntries / packageEntries subcollection paths under the month doc', async () => {
    const { getHandpickEntriesCollectionRef, getRoastEntriesCollectionRef, getPackageEntriesCollectionRef } =
      await import('./productionRecords');

    expect(getHandpickEntriesCollectionRef('user-1', '2026-08')).toEqual({
      path: 'users/user-1/productionRecords/2026-08/handpickEntries',
    });
    expect(getRoastEntriesCollectionRef('user-1', '2026-08')).toEqual({
      path: 'users/user-1/productionRecords/2026-08/roastEntries',
    });
    expect(getPackageEntriesCollectionRef('user-1', '2026-08')).toEqual({
      path: 'users/user-1/productionRecords/2026-08/packageEntries',
    });
  });

  it('rejects invalid months when building subcollection refs', async () => {
    const { getHandpickEntriesCollectionRef } = await import('./productionRecords');

    expect(() => getHandpickEntriesCollectionRef('user-1', '2026-13')).toThrow('対象月が正しくありません');
  });
});

describe('subscribeProductionRecordMonth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes the month document and passes it to the callback', async () => {
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, onNext: (snap: unknown) => void) => {
      onNext(
        docSnapshot('2026-08', {
          month: '2026-08',
          greenBeanTotalGram: 30000,
          powderPerPackGram: 8.5,
          blendItems: [
            { beanName: 'ブラジル', ratioPercent: 80 },
            { beanName: 'グアテマラ', ratioPercent: 20 },
          ],
          createdAt: 'created-at',
          updatedAt: 'updated-at',
        })
      );
      return () => undefined;
    });

    const { subscribeProductionRecordMonth } = await import('./productionRecords');
    const callback = vi.fn();

    subscribeProductionRecordMonth('user-1', '2026-08', callback);

    expect(callback).toHaveBeenCalledWith({
      month: '2026-08',
      greenBeanTotalGram: 30000,
      powderPerPackGram: 8.5,
      blendItems: [
        { beanName: 'ブラジル', ratioPercent: 80 },
        { beanName: 'グアテマラ', ratioPercent: 20 },
      ],
      createdAt: 'created-at',
      updatedAt: 'updated-at',
    });
  });

  it('passes null to the callback when the month document does not exist', async () => {
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, onNext: (snap: unknown) => void) => {
      onNext(docSnapshot('2026-08', null));
      return () => undefined;
    });

    const { subscribeProductionRecordMonth } = await import('./productionRecords');
    const callback = vi.fn();

    subscribeProductionRecordMonth('user-1', '2026-08', callback);

    expect(callback).toHaveBeenCalledWith(null);
  });

  it('forwards errors to onError and passes null to the callback', async () => {
    const error = new Error('permission-denied');
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, _onNext: unknown, onErrorCb: (e: Error) => void) => {
      onErrorCb(error);
      return () => undefined;
    });

    const { subscribeProductionRecordMonth } = await import('./productionRecords');
    const callback = vi.fn();
    const onError = vi.fn();

    subscribeProductionRecordMonth('user-1', '2026-08', callback, onError);

    expect(onError).toHaveBeenCalledWith(error);
    expect(callback).toHaveBeenCalledWith(null);
  });
});

describe('saveProductionRecordMonth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.transaction.get.mockResolvedValue({ exists: () => false, data: () => undefined });
  });

  it('saves the built month document to the month-based path', async () => {
    const { saveProductionRecordMonth } = await import('./productionRecords');

    await saveProductionRecordMonth('user-1', {
      month: '2026-08',
      greenBeanTotalGram: 30000,
      powderPerPackGram: 8.5,
      blendItems: [
        { beanName: 'ブラジル', ratioPercent: 80 },
        { beanName: 'グアテマラ', ratioPercent: 20 },
      ],
    });

    expect(firestoreMocks.transaction.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionRecords/2026-08' }),
      {
        month: '2026-08',
        greenBeanTotalGram: 30000,
        powderPerPackGram: 8.5,
        blendItems: [
          { beanName: 'ブラジル', ratioPercent: 80 },
          { beanName: 'グアテマラ', ratioPercent: 20 },
        ],
        createdAt: 'server-timestamp',
        updatedAt: 'server-timestamp',
      }
    );
  });

  it('preserves createdAt when updating an existing month document', async () => {
    firestoreMocks.transaction.get.mockResolvedValue({
      exists: () => true,
      data: () => ({ createdAt: 'existing-created-at' }),
    });
    const { saveProductionRecordMonth } = await import('./productionRecords');

    await saveProductionRecordMonth('user-1', {
      month: '2026-08',
      greenBeanTotalGram: 30000,
      powderPerPackGram: 8.5,
      blendItems: [{ beanName: 'ブラジル', ratioPercent: 100 }],
    });

    expect(firestoreMocks.transaction.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionRecords/2026-08' }),
      expect.objectContaining({
        createdAt: 'existing-created-at',
        updatedAt: 'server-timestamp',
      })
    );
  });
});

describe('subscribeRecentProductionMonths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries recent months ordered by month desc with a limit of 24', async () => {
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, onNext: (snap: unknown) => void) => {
      onNext(
        collectionSnapshot([
          {
            id: '2026-08',
            data: {
              month: '2026-08',
              greenBeanTotalGram: 30000,
              powderPerPackGram: 8.5,
              blendItems: [{ beanName: 'ブラジル', ratioPercent: 100 }],
            },
          },
        ])
      );
      return () => undefined;
    });

    const { subscribeRecentProductionMonths } = await import('./productionRecords');
    const callback = vi.fn();

    subscribeRecentProductionMonths('user-1', callback);

    expect(firestoreMocks.orderBy).toHaveBeenCalledWith('month', 'desc');
    expect(firestoreMocks.limit).toHaveBeenCalledWith(24);
    expect(callback).toHaveBeenCalledWith([
      {
        month: '2026-08',
        greenBeanTotalGram: 30000,
        powderPerPackGram: 8.5,
        blendItems: [{ beanName: 'ブラジル', ratioPercent: 100 }],
        createdAt: undefined,
        updatedAt: undefined,
      },
    ]);
  });

  it('forwards errors to onError and passes an empty array to the callback', async () => {
    const error = new Error('permission-denied');
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, _onNext: unknown, onErrorCb: (e: Error) => void) => {
      onErrorCb(error);
      return () => undefined;
    });

    const { subscribeRecentProductionMonths } = await import('./productionRecords');
    const callback = vi.fn();
    const onError = vi.fn();

    subscribeRecentProductionMonths('user-1', callback, onError);

    expect(onError).toHaveBeenCalledWith(error);
    expect(callback).toHaveBeenCalledWith([]);
  });
});

describe('subscribeHandpickEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries handpick entries ordered by createdAt desc and normalizes them with doc id', async () => {
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, onNext: (snap: unknown) => void) => {
      onNext(
        collectionSnapshot([
          {
            id: 'entry-1',
            data: {
              workDate: '2026-08-10',
              beanName: 'ブラジル',
              segment: 'first',
              greenBeanWeightGram: 10000,
              defectBeanWeightGram: 300,
              createdAt: 'created-at',
              updatedAt: 'updated-at',
            },
          },
        ])
      );
      return () => undefined;
    });

    const { subscribeHandpickEntries } = await import('./productionRecords');
    const callback = vi.fn();

    subscribeHandpickEntries('user-1', '2026-08', callback);

    expect(firestoreMocks.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(callback).toHaveBeenCalledWith([
      {
        id: 'entry-1',
        workDate: '2026-08-10',
        beanName: 'ブラジル',
        segment: 'first',
        greenBeanWeightGram: 10000,
        defectBeanWeightGram: 300,
        createdAt: 'created-at',
        updatedAt: 'updated-at',
      },
    ]);
  });

  it('forwards errors to onError and passes an empty array to the callback', async () => {
    const error = new Error('permission-denied');
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, _onNext: unknown, onErrorCb: (e: Error) => void) => {
      onErrorCb(error);
      return () => undefined;
    });

    const { subscribeHandpickEntries } = await import('./productionRecords');
    const callback = vi.fn();
    const onError = vi.fn();

    subscribeHandpickEntries('user-1', '2026-08', callback, onError);

    expect(onError).toHaveBeenCalledWith(error);
    expect(callback).toHaveBeenCalledWith([]);
  });
});

describe('addHandpickEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a handpick entry with an auto-generated id and returns it', async () => {
    const { addHandpickEntry } = await import('./productionRecords');

    const id = await addHandpickEntry('user-1', '2026-08', {
      workDate: '2026-08-10',
      beanName: 'ブラジル',
      segment: 'first',
      greenBeanWeightGram: 10000,
      defectBeanWeightGram: 300,
    });

    expect(id).toBe('auto-generated-id');
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionRecords/2026-08/handpickEntries/auto-generated-id' }),
      {
        workDate: '2026-08-10',
        beanName: 'ブラジル',
        segment: 'first',
        greenBeanWeightGram: 10000,
        defectBeanWeightGram: 300,
        createdAt: 'server-timestamp',
        updatedAt: 'server-timestamp',
      }
    );
  });
});

describe('updateHandpickEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges the rebuilt handpick entry with a refreshed updatedAt', async () => {
    const { updateHandpickEntry } = await import('./productionRecords');

    await updateHandpickEntry('user-1', '2026-08', 'entry-1', {
      workDate: '2026-08-10',
      beanName: 'グアテマラ',
      segment: 'second',
      greenBeanWeightGram: 12000,
      defectBeanWeightGram: 0,
    });

    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionRecords/2026-08/handpickEntries/entry-1' }),
      {
        workDate: '2026-08-10',
        beanName: 'グアテマラ',
        segment: 'second',
        greenBeanWeightGram: 12000,
        defectBeanWeightGram: 0,
        updatedAt: 'server-timestamp',
      },
      { merge: true }
    );
  });
});

describe('subscribeRoastEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries roast entries ordered by createdAt desc and normalizes them with doc id', async () => {
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, onNext: (snap: unknown) => void) => {
      onNext(
        collectionSnapshot([
          {
            id: 'roast-1',
            data: {
              workDate: '2026-08-10',
              beforeRoastWeightGram: 10000,
              afterRoastWeightGram: 8200,
              createdAt: 'created-at',
              updatedAt: 'updated-at',
            },
          },
        ])
      );
      return () => undefined;
    });

    const { subscribeRoastEntries } = await import('./productionRecords');
    const callback = vi.fn();

    subscribeRoastEntries('user-1', '2026-08', callback);

    expect(firestoreMocks.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(callback).toHaveBeenCalledWith([
      {
        id: 'roast-1',
        workDate: '2026-08-10',
        beforeRoastWeightGram: 10000,
        afterRoastWeightGram: 8200,
        createdAt: 'created-at',
        updatedAt: 'updated-at',
      },
    ]);
  });
});

describe('addRoastEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a roast entry with an auto-generated id and returns it', async () => {
    const { addRoastEntry } = await import('./productionRecords');

    const id = await addRoastEntry('user-1', '2026-08', {
      workDate: '2026-08-10',
      beforeRoastWeightGram: 10000,
      afterRoastWeightGram: 8200,
    });

    expect(id).toBe('auto-generated-id');
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionRecords/2026-08/roastEntries/auto-generated-id' }),
      {
        workDate: '2026-08-10',
        beforeRoastWeightGram: 10000,
        afterRoastWeightGram: 8200,
        createdAt: 'server-timestamp',
        updatedAt: 'server-timestamp',
      }
    );
  });
});

describe('updateRoastEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges the rebuilt roast entry with a refreshed updatedAt', async () => {
    const { updateRoastEntry } = await import('./productionRecords');

    await updateRoastEntry('user-1', '2026-08', 'roast-1', {
      workDate: '2026-08-11',
      beforeRoastWeightGram: 12000,
      afterRoastWeightGram: 9800,
    });

    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionRecords/2026-08/roastEntries/roast-1' }),
      {
        workDate: '2026-08-11',
        beforeRoastWeightGram: 12000,
        afterRoastWeightGram: 9800,
        updatedAt: 'server-timestamp',
      },
      { merge: true }
    );
  });
});
