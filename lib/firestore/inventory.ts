import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type FieldValue,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb, removeUndefinedFields } from './common';
import { buildInventoryItemInput, normalizeInventoryCategory, normalizeInventoryStatus } from '@/lib/inventory';
import type { InventoryItem, InventoryItemInput } from '@/types';

export function getInventoryCollectionRef() {
  return collection(getDb(), 'inventory');
}

function normalizeInventoryItem(id: string, data: DocumentData): InventoryItem {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    category: normalizeInventoryCategory(data.category),
    status: normalizeInventoryStatus(data.status),
    note: typeof data.note === 'string' && data.note.trim().length > 0 ? data.note : undefined,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : '',
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
export async function addInventoryItem(input: InventoryItemInput, updatedBy: string): Promise<void> {
  const normalized = buildInventoryItemInput(input);
  await addDoc(
    getInventoryCollectionRef(),
    removeUndefinedFields({
      ...normalized,
      updatedBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
}

/** 既存品目の内容を更新（merge）。createdAt は触らない。 */
export async function updateInventoryItem(id: string, input: InventoryItemInput, updatedBy: string): Promise<void> {
  const normalized = buildInventoryItemInput(input);
  // merge:true のため、note を空にしても通常は既存値が残ってしまう。
  // buildInventoryItemInput は空メモ時に note を省略するので、その場合は
  // deleteField() を明示セットして Firestore 側の note を削除する。
  // ※ deleteField() の FieldValue は removeUndefinedFields の再帰で
  //   ただのオブジェクトに変換されセンチネルが壊れるため、クリーニング後に付与する。
  const payload: { updatedBy: string; updatedAt: FieldValue; note?: string | FieldValue } & Partial<
    Omit<InventoryItemInput, 'note'>
  > = removeUndefinedFields({ ...normalized, updatedBy, updatedAt: serverTimestamp() });
  if (normalized.note === undefined) {
    payload.note = deleteField();
  }
  await setDoc(doc(getInventoryCollectionRef(), id), payload, { merge: true });
}

/** ステータスだけを1タップ変更（merge）。 */
export async function setInventoryItemStatus(
  id: string,
  status: InventoryItem['status'],
  updatedBy: string
): Promise<void> {
  await setDoc(
    doc(getInventoryCollectionRef(), id),
    { status: normalizeInventoryStatus(status), updatedBy, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await deleteDoc(doc(getInventoryCollectionRef(), id));
}
