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
import {
  buildHandpickEntry,
  buildPackageEntry,
  buildProductionRecordMonth,
  buildRoastEntry,
  isValidProductionMonth,
  normalizeCountInput,
} from '@/lib/productionRecords';
import type {
  HandpickEntry,
  HandpickEntryInput,
  HandpickSegment,
  PackageEntry,
  PackageEntryInput,
  ProductionRecordMonth,
  ProductionRecordMonthInput,
  RoastEntry,
  RoastEntryInput,
  TeamCounts,
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

function normalizeRoastEntry(id: string, data: DocumentData): RoastEntry {
  const entry = buildRoastEntry({
    workDate: typeof data.workDate === 'string' ? data.workDate : '',
    beforeRoastWeightGram: typeof data.beforeRoastWeightGram === 'number' ? data.beforeRoastWeightGram : 0,
    afterRoastWeightGram: typeof data.afterRoastWeightGram === 'number' ? data.afterRoastWeightGram : 0,
  });

  return {
    ...entry,
    id,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribeRoastEntries(
  userId: string,
  month: string,
  callback: (entries: RoastEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const entriesQuery = query(getRoastEntriesCollectionRef(userId, month), orderBy('createdAt', 'desc'));

  return onSnapshot(
    entriesQuery,
    (snapshot) => {
      callback(snapshot.docs.map((entryDoc) => normalizeRoastEntry(entryDoc.id, entryDoc.data())));
    },
    (error) => {
      console.error('Failed to subscribe roast entries:', error);
      onError?.(error);
      callback([]);
    }
  );
}

export async function addRoastEntry(userId: string, month: string, input: RoastEntryInput): Promise<string> {
  const entry = buildRoastEntry(input);
  const docRef = doc(getRoastEntriesCollectionRef(userId, month));

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

export async function updateRoastEntry(
  userId: string,
  month: string,
  entryId: string,
  input: RoastEntryInput
): Promise<void> {
  const entry = buildRoastEntry(input);
  const docRef = doc(getRoastEntriesCollectionRef(userId, month), entryId);

  await setDoc(
    docRef,
    {
      ...entry,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function normalizeTeamCounts(value: unknown): TeamCounts {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

  return {
    goodCount: normalizeCountInput(typeof data.goodCount === 'number' ? data.goodCount : 0),
    defectiveCount: normalizeCountInput(typeof data.defectiveCount === 'number' ? data.defectiveCount : 0),
  };
}

function normalizePackageEntry(id: string, data: DocumentData): PackageEntry {
  const entry = buildPackageEntry({
    workDate: typeof data.workDate === 'string' ? data.workDate : '',
    teamA: normalizeTeamCounts(data.teamA),
    teamB: normalizeTeamCounts(data.teamB),
  });

  return {
    ...entry,
    id,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribePackageEntries(
  userId: string,
  month: string,
  callback: (entries: PackageEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const entriesQuery = query(getPackageEntriesCollectionRef(userId, month), orderBy('createdAt', 'desc'));

  return onSnapshot(
    entriesQuery,
    (snapshot) => {
      callback(snapshot.docs.map((entryDoc) => normalizePackageEntry(entryDoc.id, entryDoc.data())));
    },
    (error) => {
      console.error('Failed to subscribe package entries:', error);
      onError?.(error);
      callback([]);
    }
  );
}

export async function addPackageEntry(userId: string, month: string, input: PackageEntryInput): Promise<string> {
  const entry = buildPackageEntry(input);
  const docRef = doc(getPackageEntriesCollectionRef(userId, month));

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

export async function updatePackageEntry(
  userId: string,
  month: string,
  entryId: string,
  input: PackageEntryInput
): Promise<void> {
  const entry = buildPackageEntry(input);
  const docRef = doc(getPackageEntriesCollectionRef(userId, month), entryId);

  await setDoc(
    docRef,
    {
      ...entry,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
