import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb, removeUndefinedFields } from './common';
import { buildHandpickEntry, buildProductionRecordMonth, isValidProductionMonth } from '@/lib/productionRecords';
import type {
  HandpickEntry,
  HandpickEntryInput,
  HandpickSegment,
  ProductionRecordMonth,
  ProductionRecordMonthInput,
} from '@/types';

export const RECENT_PRODUCTION_MONTHS_LIMIT = 24;

function assertValidMonth(month: string): void {
  if (!isValidProductionMonth(month)) {
    throw new Error('対象月が正しくありません');
  }
}

export function getProductionRecordsCollectionRef(userId: string) {
  return collection(getDb(), 'users', userId, 'productionRecords');
}

export function getProductionRecordMonthDocRef(userId: string, month: string) {
  assertValidMonth(month);
  return doc(getProductionRecordsCollectionRef(userId), month);
}

export function getHandpickEntriesCollectionRef(userId: string, month: string) {
  return collection(getProductionRecordMonthDocRef(userId, month), 'handpickEntries');
}

export function getRoastEntriesCollectionRef(userId: string, month: string) {
  return collection(getProductionRecordMonthDocRef(userId, month), 'roastEntries');
}

export function getPackageEntriesCollectionRef(userId: string, month: string) {
  return collection(getProductionRecordMonthDocRef(userId, month), 'packageEntries');
}

function normalizeBlendItems(value: unknown): ProductionRecordMonth['blendItems'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }
    const record = item as Record<string, unknown>;
    return [
      {
        beanName: typeof record.beanName === 'string' ? record.beanName : '',
        ratioPercent: typeof record.ratioPercent === 'number' ? record.ratioPercent : 0,
      },
    ];
  });
}

function normalizeProductionRecordMonth(id: string, data: DocumentData): ProductionRecordMonth {
  return {
    month: typeof data.month === 'string' ? data.month : id,
    greenBeanTotalGram: typeof data.greenBeanTotalGram === 'number' ? data.greenBeanTotalGram : 0,
    powderPerPackGram: typeof data.powderPerPackGram === 'number' ? data.powderPerPackGram : 0,
    blendItems: normalizeBlendItems(data.blendItems),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribeProductionRecordMonth(
  userId: string,
  month: string,
  callback: (record: ProductionRecordMonth | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const docRef = getProductionRecordMonthDocRef(userId, month);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback(normalizeProductionRecordMonth(snapshot.id, snapshot.data()));
    },
    (error) => {
      console.error('Failed to subscribe production record month:', error);
      onError?.(error);
      callback(null);
    }
  );
}

export async function saveProductionRecordMonth(userId: string, input: ProductionRecordMonthInput): Promise<void> {
  const record = buildProductionRecordMonth(input);
  const docRef = getProductionRecordMonthDocRef(userId, record.month);

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

export function subscribeRecentProductionMonths(
  userId: string,
  callback: (records: ProductionRecordMonth[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const monthsQuery = query(
    getProductionRecordsCollectionRef(userId),
    orderBy('month', 'desc'),
    limit(RECENT_PRODUCTION_MONTHS_LIMIT)
  );

  return onSnapshot(
    monthsQuery,
    (snapshot) => {
      callback(snapshot.docs.map((monthDoc) => normalizeProductionRecordMonth(monthDoc.id, monthDoc.data())));
    },
    (error) => {
      console.error('Failed to subscribe recent production months:', error);
      onError?.(error);
      callback([]);
    }
  );
}

function normalizeHandpickSegment(value: unknown): HandpickSegment {
  return value === 'second' ? 'second' : 'first';
}

function normalizeHandpickEntry(id: string, data: DocumentData): HandpickEntry {
  const entry = buildHandpickEntry({
    workDate: typeof data.workDate === 'string' ? data.workDate : '',
    beanName: typeof data.beanName === 'string' ? data.beanName : '',
    segment: normalizeHandpickSegment(data.segment),
    greenBeanWeightGram: typeof data.greenBeanWeightGram === 'number' ? data.greenBeanWeightGram : 0,
    defectBeanWeightGram: typeof data.defectBeanWeightGram === 'number' ? data.defectBeanWeightGram : 0,
  });

  return {
    ...entry,
    id,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribeHandpickEntries(
  userId: string,
  month: string,
  callback: (entries: HandpickEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const entriesQuery = query(getHandpickEntriesCollectionRef(userId, month), orderBy('createdAt', 'desc'));

  return onSnapshot(
    entriesQuery,
    (snapshot) => {
      callback(snapshot.docs.map((entryDoc) => normalizeHandpickEntry(entryDoc.id, entryDoc.data())));
    },
    (error) => {
      console.error('Failed to subscribe handpick entries:', error);
      onError?.(error);
      callback([]);
    }
  );
}

export async function addHandpickEntry(userId: string, month: string, input: HandpickEntryInput): Promise<string> {
  const entry = buildHandpickEntry(input);
  const docRef = doc(getHandpickEntriesCollectionRef(userId, month));

  await setDoc(
    docRef,
    removeUndefinedFields({
      ...entry,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  return docRef.id;
}

export async function updateHandpickEntry(
  userId: string,
  month: string,
  entryId: string,
  input: HandpickEntryInput
): Promise<void> {
  const entry = buildHandpickEntry(input);
  const docRef = doc(getHandpickEntriesCollectionRef(userId, month), entryId);

  await setDoc(
    docRef,
    {
      ...entry,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
