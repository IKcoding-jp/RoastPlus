import { collection, doc, getDoc, getDocs, type DocumentData, type QuerySnapshot } from 'firebase/firestore';
import { getDb, normalizeAppData } from '../common';
import type { WorkProgress } from '@/types';

interface WorkProgressSplitState {
  workProgresses: WorkProgress[];
  isMigrated: boolean;
}

export function getWorkProgressesCollectionRef(userId: string) {
  return collection(getDb(), 'users', userId, 'workProgresses');
}

export function getDataSplitsDocRef(userId: string) {
  return doc(getDb(), 'users', userId, '_meta', 'dataSplits');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isWorkProgressesMigrated(data: unknown): boolean {
  if (!isRecord(data)) {
    return false;
  }

  if (data.workProgressesMigrated === true) {
    return true;
  }

  const nested = data.workProgresses;
  return isRecord(nested) && nested.migrated === true;
}

function normalizeWorkProgressDocuments(docs: Array<{ id: string; data: () => DocumentData }>): WorkProgress[] {
  const rawWorkProgresses = docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      ...data,
      id: typeof data.id === 'string' ? data.id : docSnapshot.id,
    };
  });

  return normalizeAppData({ workProgresses: rawWorkProgresses as WorkProgress[] }).workProgresses;
}

export function normalizeWorkProgressQuerySnapshot(snapshot: QuerySnapshot<DocumentData>): WorkProgress[] {
  return normalizeWorkProgressDocuments(snapshot.docs);
}

export function resolveWorkProgresses(
  rootWorkProgresses: WorkProgress[],
  splitWorkProgresses: WorkProgress[],
  isMigrated: boolean
): WorkProgress[] {
  if (isMigrated || splitWorkProgresses.length > 0) {
    return splitWorkProgresses;
  }

  return rootWorkProgresses;
}

export async function loadWorkProgressSplitState(userId: string): Promise<WorkProgressSplitState> {
  const [dataSplitsDoc, workProgressesSnapshot] = await Promise.all([
    getDoc(getDataSplitsDocRef(userId)),
    getDocs(getWorkProgressesCollectionRef(userId)),
  ]);

  return {
    workProgresses: normalizeWorkProgressQuerySnapshot(workProgressesSnapshot),
    isMigrated: dataSplitsDoc.exists() && isWorkProgressesMigrated(dataSplitsDoc.data()),
  };
}
