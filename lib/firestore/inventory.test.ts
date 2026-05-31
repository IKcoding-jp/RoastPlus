import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAddDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockServerTimestamp = vi.fn(() => 'SERVER_TS');

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ __type: 'collection' })),
  doc: vi.fn(() => ({ __type: 'doc' })),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(() => ({ __type: 'orderBy' })),
  query: vi.fn(() => ({ __type: 'query' })),
}));

vi.mock('./common', () => ({
  getDb: vi.fn(() => ({ __type: 'db' })),
  removeUndefinedFields: <T>(obj: T) => obj,
}));

import { addInventoryItem, setInventoryItemStatus, deleteInventoryItem } from './inventory';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('addInventoryItem', () => {
  it('正規化した入力に updatedBy と createdAt/updatedAt を付けて addDoc する', async () => {
    await addInventoryItem({ name: ' ドリップ袋 ', category: 'material', status: 'low' }, 'tester');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const saved = mockAddDoc.mock.calls[0][1];
    expect(saved).toMatchObject({
      name: 'ドリップ袋',
      category: 'material',
      status: 'low',
      updatedBy: 'tester',
      createdAt: 'SERVER_TS',
      updatedAt: 'SERVER_TS',
    });
  });
});

describe('setInventoryItemStatus', () => {
  it('status と updatedBy と updatedAt を merge で更新する', async () => {
    await setInventoryItemStatus('item-1', 'out', 'tester');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, payload, options] = mockSetDoc.mock.calls[0];
    expect(payload).toMatchObject({ status: 'out', updatedBy: 'tester', updatedAt: 'SERVER_TS' });
    expect(options).toEqual({ merge: true });
  });
});

describe('deleteInventoryItem', () => {
  it('deleteDoc を呼ぶ', async () => {
    await deleteInventoryItem('item-1');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});
