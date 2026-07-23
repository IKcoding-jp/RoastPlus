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
  getUserDocRef: vi.fn((userId: string) => ({ __type: 'userDoc', userId })),
}));

import { collection } from 'firebase/firestore';
import { getUserDocRef } from './common';
import { addInventoryItem, updateInventoryItem, setInventoryItemStatus, deleteInventoryItem } from './inventory';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('addInventoryItem', () => {
  it('userId の inventory サブコレクションに正規化した入力を addDoc する', async () => {
    await addInventoryItem('user-1', { name: ' ドリップ袋 ', status: 'low' });

    expect(getUserDocRef).toHaveBeenCalledWith('user-1');
    expect(collection).toHaveBeenCalledWith({ __type: 'userDoc', userId: 'user-1' }, 'inventory');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const saved = mockAddDoc.mock.calls[0][1];
    expect(saved).toMatchObject({
      name: 'ドリップ袋',
      status: 'low',
      createdAt: 'SERVER_TS',
      updatedAt: 'SERVER_TS',
    });
  });
});

describe('updateInventoryItem', () => {
  it('正規化した入力に updatedAt を付けて merge で setDoc する', async () => {
    await updateInventoryItem('user-1', 'item-1', { name: ' ドリップ袋 ', status: 'low' });
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, payload, options] = mockSetDoc.mock.calls[0];
    expect(payload).toMatchObject({ name: 'ドリップ袋', status: 'low', updatedAt: 'SERVER_TS' });
    expect(options).toEqual({ merge: true });
  });
});

describe('setInventoryItemStatus', () => {
  it('status と updatedAt を merge で更新する', async () => {
    await setInventoryItemStatus('user-1', 'item-1', 'out');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, payload, options] = mockSetDoc.mock.calls[0];
    expect(payload).toMatchObject({ status: 'out', updatedAt: 'SERVER_TS' });
    expect(options).toEqual({ merge: true });
  });
});

describe('deleteInventoryItem', () => {
  it('deleteDoc を呼ぶ', async () => {
    await deleteInventoryItem('user-1', 'item-1');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});
