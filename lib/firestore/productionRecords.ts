import {
  collection,
  doc,
  onSnapshot,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb } from './common';
import { isValidProductionMonth } from '@/lib/productionRecords';
import type { ProductionRecordMonth } from '@/types';

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
