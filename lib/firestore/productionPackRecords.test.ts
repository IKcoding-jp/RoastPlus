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
      const path = basePath ? [basePath, ...segments].join('/') : segments.join('/');
      return { id: segments.at(-1), path };
    }),
    getDocs: vi.fn(),
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
  getFirestore: firestoreMocks.getFirestore,
  limit: firestoreMocks.limit,
  onSnapshot: firestoreMocks.onSnapshot,
  orderBy: firestoreMocks.orderBy,
  query: firestoreMocks.query,
  runTransaction: firestoreMocks.runTransaction,
  serverTimestamp: firestoreMocks.serverTimestamp,
  where: firestoreMocks.where,
}));

function productionPackSnapshot(
  records: Array<{
    id: string;
    data: Record<string, unknown>;
  }>
) {
  return {
    docs: records.map((record) => ({
      id: record.id,
      data: () => record.data,
    })),
  };
}

describe('getProductionPackRecordDocRef', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses /users/{uid}/productionPackRecords/{YYYY-MM-DD} as the document path', async () => {
    const { getProductionPackRecordDocRef } = await import('./productionPackRecords');

    expect(getProductionPackRecordDocRef('user-1', '2026-05-24')).toEqual({
      id: '2026-05-24',
      path: 'users/user-1/productionPackRecords/2026-05-24',
    });
  });

  it('rejects invalid work dates before building a Firestore document path', async () => {
    const { getProductionPackRecordDocRef } = await import('./productionPackRecords');

    expect(() => getProductionPackRecordDocRef('user-1', '2026-02-29')).toThrow('作業日が正しくありません');
  });
});

describe('saveProductionPackRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.transaction.get.mockResolvedValue({ exists: () => false, data: () => undefined });
  });

  it('saves the calculated record to the date-based production pack document', async () => {
    const { saveProductionPackRecord } = await import('./productionPackRecords');

    await saveProductionPackRecord('user-1', {
      workDate: '2026-05-24',
      teamA: { successCount: 10, failureCount: 1 },
      teamB: { successCount: 20, failureCount: 2 },
    });

    expect(firestoreMocks.transaction.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionPackRecords/2026-05-24' }),
      {
        workDate: '2026-05-24',
        teamA: { successCount: 10, failureCount: 1 },
        teamB: { successCount: 20, failureCount: 2 },
        successTotal: 30,
        failureTotal: 3,
        total: 33,
        createdAt: 'server-timestamp',
        updatedAt: 'server-timestamp',
      }
    );
  });

  it('preserves createdAt when updating an existing record', async () => {
    firestoreMocks.transaction.get.mockResolvedValue({
      exists: () => true,
      data: () => ({ createdAt: 'existing-created-at' }),
    });
    const { saveProductionPackRecord } = await import('./productionPackRecords');

    await saveProductionPackRecord('user-1', {
      workDate: '2026-05-24',
      teamA: { successCount: 1, failureCount: 0 },
      teamB: { successCount: 2, failureCount: 0 },
      note: '再確認済み',
    });

    expect(firestoreMocks.transaction.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionPackRecords/2026-05-24' }),
      expect.objectContaining({
        note: '再確認済み',
        createdAt: 'existing-created-at',
        updatedAt: 'server-timestamp',
      })
    );
  });
});

describe('deleteProductionPackRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.transaction.get.mockResolvedValue({ exists: () => true });
  });

  it('physically deletes the date-based production pack document', async () => {
    const { deleteProductionPackRecord } = await import('./productionPackRecords');

    await deleteProductionPackRecord('user-1', '2026-05-24');

    expect(firestoreMocks.transaction.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionPackRecords/2026-05-24' })
    );
    expect(firestoreMocks.transaction.update).not.toHaveBeenCalled();
  });

  it('throws when the record to delete does not exist', async () => {
    firestoreMocks.transaction.get.mockResolvedValue({ exists: () => false });
    const { deleteProductionPackRecord } = await import('./productionPackRecords');

    await expect(deleteProductionPackRecord('user-1', '2026-05-24')).rejects.toThrow('削除する記録が見つかりません');
    expect(firestoreMocks.transaction.delete).not.toHaveBeenCalled();
  });
});

describe('getProductionPackRecordsByMonth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.getDocs.mockResolvedValue(
      productionPackSnapshot([
        {
          id: '2026-05-01',
          data: {
            workDate: '2026-05-01',
            teamA: { successCount: 70, failureCount: 3 },
            teamB: { successCount: 50, failureCount: 2 },
          },
        },
        {
          id: '2026-05-02',
          data: {
            workDate: '2026-05-02',
            teamA: { successCount: 80, failureCount: 2 },
            teamB: { successCount: 50, failureCount: 1 },
            status: 'cancelled',
          },
        },
      ])
    );
  });

  it('queries records in the selected month range and excludes cancelled records', async () => {
    const { getProductionPackRecordsByMonth } = await import('./productionPackRecords');

    const records = await getProductionPackRecordsByMonth('user-1', '2026-05');

    expect(firestoreMocks.where).toHaveBeenCalledWith('workDate', '>=', '2026-05-01');
    expect(firestoreMocks.where).toHaveBeenCalledWith('workDate', '<', '2026-06-01');
    expect(firestoreMocks.orderBy).toHaveBeenCalledWith('workDate', 'asc');
    expect(records).toEqual([
      expect.objectContaining({
        workDate: '2026-05-01',
        successTotal: 120,
        failureTotal: 5,
        total: 125,
      }),
    ]);
  });
});
