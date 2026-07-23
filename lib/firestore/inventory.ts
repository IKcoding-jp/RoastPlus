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
import { getUserDocRef } from './common';
import { buildInventoryItemInput, normalizeInventoryStatus } from '@/lib/inventory';
import type { InventoryItem, InventoryItemInput } from '@/types';

function getInventoryCollectionRef(userId: string) {
  return collection(getUserDocRef(userId), 'inventory');
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
  userId: string,
  callback: (items: InventoryItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const itemsQuery = query(getInventoryCollectionRef(userId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    itemsQuery,
    (snapshot) => {
      // serverTimestamps: 'estimate' … 書き込み確定前の serverTimestamp を null にせず
      // ローカル推定時刻で埋める。これで状態変更直後に「最終更新」の日付が一瞬消えて
      // 再表示される（チラつく）のを防ぐ。推定と確定の差は表示の分単位では変わらない。
      callback(
        snapshot.docs.map((itemDoc) =>
          normalizeInventoryItem(itemDoc.id, itemDoc.data({ serverTimestamps: 'estimate' }))
        )
      );
    },
    (error) => {
      console.error('Failed to subscribe inventory items:', error);
      onError?.(error);
      callback([]);
    }
  );
}

/** 新規品目を追加（自動ID）。 */
export async function addInventoryItem(userId: string, input: InventoryItemInput): Promise<void> {
  const normalized = buildInventoryItemInput(input);
  await addDoc(getInventoryCollectionRef(userId), {
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** 既存品目の内容を更新（merge）。createdAt は触らない。 */
export async function updateInventoryItem(
  userId: string,
  id: string,
  input: InventoryItemInput
): Promise<void> {
  const normalized = buildInventoryItemInput(input);
  await setDoc(
    doc(getInventoryCollectionRef(userId), id),
    { ...normalized, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/** ステータスだけを1タップ変更（merge）。 */
export async function setInventoryItemStatus(
  userId: string,
  id: string,
  status: InventoryItem['status']
): Promise<void> {
  await setDoc(
    doc(getInventoryCollectionRef(userId), id),
    { status: normalizeInventoryStatus(status), updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function deleteInventoryItem(userId: string, id: string): Promise<void> {
  await deleteDoc(doc(getInventoryCollectionRef(userId), id));
}
