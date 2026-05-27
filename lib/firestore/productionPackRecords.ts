import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { getDb, removeUndefinedFields } from './common';
import {
  buildProductionPackRecord,
  getProductionPackMonthRange,
  isValidProductionPackWorkDate,
  normalizePackCountInput,
} from '@/lib/productionPackRecords';
import type { ProductionPackRecord, ProductionPackRecordInput, ProductionPackTeamCounts } from '@/types';

export const RECENT_PRODUCTION_PACK_RECORDS_LIMIT = 30;

export function getProductionPackRecordsCollectionRef(userId: string) {
  return collection(getDb(), 'users', userId, 'productionPackRecords');
}

export function getProductionPackRecordDocRef(userId: string, workDate: string) {
  if (!isValidProductionPackWorkDate(workDate)) {
    throw new Error('作業日が正しくありません');
  }

  return doc(getProductionPackRecordsCollectionRef(userId), workDate);
}

function normalizeTeamCounts(value: unknown): ProductionPackTeamCounts {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

  return {
    successCount: normalizePackCountInput(typeof data.successCount === 'number' ? data.successCount : 0),
    failureCount: normalizePackCountInput(typeof data.failureCount === 'number' ? data.failureCount : 0),
  };
}

function normalizeProductionPackRecord(id: string, data: DocumentData): ProductionPackRecord {
  const record = buildProductionPackRecord({
    workDate: typeof data.workDate === 'string' ? data.workDate : id,
    teamA: normalizeTeamCounts(data.teamA),
    teamB: normalizeTeamCounts(data.teamB),
    note: typeof data.note === 'string' ? data.note : undefined,
  });

  return {
    ...record,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function isLegacyCancelledProductionPackRecord(data: DocumentData): boolean {
  return data.status === 'cancelled';
}

export function subscribeProductionPackRecord(
  userId: string,
  workDate: string,
  callback: (record: ProductionPackRecord | null) => void,
  onError?: (error: Error) => void
) {
  const docRef = getProductionPackRecordDocRef(userId, workDate);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      const data = snapshot.data();
      callback(isLegacyCancelledProductionPackRecord(data) ? null : normalizeProductionPackRecord(snapshot.id, data));
    },
    (error) => {
      console.error('Failed to subscribe production pack record:', error);
      onError?.(error);
      callback(null);
    }
  );
}

export function subscribeRecentProductionPackRecords(
  userId: string,
  callback: (records: ProductionPackRecord[]) => void,
  onError?: (error: Error) => void
) {
  const recordsQuery = query(
    getProductionPackRecordsCollectionRef(userId),
    orderBy('workDate', 'desc'),
    limit(RECENT_PRODUCTION_PACK_RECORDS_LIMIT)
  );

  return onSnapshot(
    recordsQuery,
    (snapshot) => {
      callback(
        snapshot.docs.flatMap((recordDoc) => {
          const data = recordDoc.data();
          return isLegacyCancelledProductionPackRecord(data) ? [] : [normalizeProductionPackRecord(recordDoc.id, data)];
        })
      );
    },
    (error) => {
      console.error('Failed to subscribe production pack records:', error);
      onError?.(error);
      callback([]);
    }
  );
}

export async function getProductionPackRecordsByMonth(userId: string, month: string): Promise<ProductionPackRecord[]> {
  const { startDate, endDate } = getProductionPackMonthRange(month);
  const recordsQuery = query(
    getProductionPackRecordsCollectionRef(userId),
    where('workDate', '>=', startDate),
    where('workDate', '<', endDate),
    orderBy('workDate', 'asc')
  );
  const snapshot = await getDocs(recordsQuery);

  return snapshot.docs.flatMap((recordDoc) => {
    const data = recordDoc.data();
    return isLegacyCancelledProductionPackRecord(data) ? [] : [normalizeProductionPackRecord(recordDoc.id, data)];
  });
}

export async function saveProductionPackRecord(userId: string, input: ProductionPackRecordInput): Promise<void> {
  const record = buildProductionPackRecord(input);
  const docRef = getProductionPackRecordDocRef(userId, record.workDate);

  await runTransaction(getDb(), async (transaction) => {
    const snapshot = await transaction.get(docRef);
    const existingData = snapshot.exists() ? snapshot.data() : undefined;

    transaction.set(
      docRef,
      removeUndefinedFields({
        ...record,
        createdAt: existingData?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });
}

export async function deleteProductionPackRecord(userId: string, workDate: string): Promise<void> {
  const docRef = getProductionPackRecordDocRef(userId, workDate);

  await runTransaction(getDb(), async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists()) {
      throw new Error('削除する記録が見つかりません');
    }

    transaction.delete(docRef);
  });
}
