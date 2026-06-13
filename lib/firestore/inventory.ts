import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb } from './common';
import { buildInventoryItemInput, normalizeInventoryStatus } from '@/lib/inventory';
import type { InventoryItem, InventoryItemInput } from '@/types';

export function getInventoryCollectionRef() {
  return collection(getDb(), 'inventory');
}

function normalizeInventoryItem(id: string, data: DocumentData): InventoryItem {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    status: normalizeInventoryStatus(data.status),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribeInventoryItems(
  callback: (items: InventoryItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const itemsQuery = query(getInventoryCollectionRef(), orderBy('createdAt', 'desc'));
  return onSnapshot(
    itemsQuery,
    (snapshot) => {
      callback(snapshot.docs.map((itemDoc) => normalizeInventoryItem(itemDoc.id, itemDoc.data())));
    },
    (error) => {
      console.error('Failed to subscribe inventory items:', error);
      onError?.(error);
      callback([]);
    }
  );
}

/** 新規品目を追加（自動ID）。 */
export async function addInventoryItem(input: InventoryItemInput): Promise<void> {
  const normalized = buildInventoryItemInput(input);
  await addDoc(getInventoryCollectionRef(), {
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** 既存品目の内容を更新（merge）。createdAt は触らない。 */
export async function updateInventoryItem(id: string, input: InventoryItemInput): Promise<void> {
  const normalized = buildInventoryItemInput(input);
  await setDoc(doc(getInventoryCollectionRef(), id), { ...normalized, updatedAt: serverTimestamp() }, { merge: true });
}

/** ステータスだけを1タップ変更（merge）。 */
export async function setInventoryItemStatus(id: string, status: InventoryItem['status']): Promise<void> {
  await setDoc(
    doc(getInventoryCollectionRef(), id),
    { status: normalizeInventoryStatus(status), updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await deleteDoc(doc(getInventoryCollectionRef(), id));
}
