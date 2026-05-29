import { collection, doc } from 'firebase/firestore';
import { getDb } from './common';
import { isValidProductionMonth } from '@/lib/productionRecords';

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
