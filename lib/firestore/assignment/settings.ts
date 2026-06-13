// assignment 設定管理（issue #544）
// 旧 app/assignment/lib/firebase/settings.ts から移設。
// 購読は createSyncedSubscription 経由で失敗時に reportSyncError、
// 書き込みは runWriteWithSync 経由で失敗時に reportSaveError につなぐ。
import { doc, getDocs, onSnapshot, query, setDoc, deleteDoc, serverTimestamp, where } from 'firebase/firestore';
import type { DocumentSnapshot, QuerySnapshot } from 'firebase/firestore';
import type { TableSettings, ShuffleSettings, Manager, PairExclusion } from '@/types';
import { normalizePairIds } from '@/types';
import { getAssignmentSettingsCollection, getManagersCollection, getPairExclusionsCollection } from './references';
import { toMillisSafe, DEFAULT_TABLE_SETTINGS, DEFAULT_SHUFFLE_SETTINGS } from './helpers';
import { createSyncedSubscription, runWriteWithSync } from './sync';

const MANAGER_DOC_ID = 'default';

export const subscribeTableSettings = (
  userId: string,
  callback: (settings: TableSettings | null) => void
): (() => void) => {
  const settingsCol = getAssignmentSettingsCollection(userId);
  const docRef = doc(settingsCol, 'table');
  return createSyncedSubscription<DocumentSnapshot>(
    (onNext, onError) => onSnapshot(docRef, onNext, onError),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<TableSettings>;
        callback({
          colWidths: {
            ...DEFAULT_TABLE_SETTINGS.colWidths,
            ...data.colWidths,
            teams: {
              ...DEFAULT_TABLE_SETTINGS.colWidths.teams,
              ...(data.colWidths?.teams ?? {}),
            },
          },
          rowHeights: data.rowHeights ?? DEFAULT_TABLE_SETTINGS.rowHeights,
          headerLabels: data.headerLabels ?? DEFAULT_TABLE_SETTINGS.headerLabels,
        });
      } else {
        callback(DEFAULT_TABLE_SETTINGS);
      }
    }
  );
};

export const updateTableSettings = async (userId: string, settings: TableSettings): Promise<void> => {
  const settingsCol = getAssignmentSettingsCollection(userId);
  const docRef = doc(settingsCol, 'table');
  await runWriteWithSync(() => setDoc(docRef, settings, { merge: true }));
};

export const subscribeShuffleSettings = (
  userId: string,
  callback: (settings: ShuffleSettings) => void
): (() => void) => {
  const settingsCol = getAssignmentSettingsCollection(userId);
  const docRef = doc(settingsCol, 'shuffle');
  return createSyncedSubscription<DocumentSnapshot>(
    (onNext, onError) => onSnapshot(docRef, onNext, onError),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<ShuffleSettings>;
        callback({ ...DEFAULT_SHUFFLE_SETTINGS, ...data });
      } else {
        callback(DEFAULT_SHUFFLE_SETTINGS);
      }
    }
  );
};

export const updateShuffleSettings = async (userId: string, settings: Partial<ShuffleSettings>): Promise<void> => {
  const settingsCol = getAssignmentSettingsCollection(userId);
  const docRef = doc(settingsCol, 'shuffle');
  await runWriteWithSync(() => setDoc(docRef, settings, { merge: true }));
};

export const subscribeManager = (userId: string, callback: (manager: Manager | null) => void): (() => void) => {
  const managersCol = getManagersCollection(userId);
  const docRef = doc(managersCol, MANAGER_DOC_ID);
  return createSyncedSubscription<DocumentSnapshot>(
    (onNext, onError) => onSnapshot(docRef, onNext, onError),
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as Manager);
      } else {
        callback(null);
      }
    }
  );
};

export const setManager = async (userId: string, name: string): Promise<void> => {
  const managersCol = getManagersCollection(userId);
  const docRef = doc(managersCol, MANAGER_DOC_ID);
  await runWriteWithSync(() =>
    setDoc(docRef, {
      id: MANAGER_DOC_ID,
      name,
      updatedAt: serverTimestamp(),
    })
  );
};

export const deleteManager = async (userId: string): Promise<void> => {
  const managersCol = getManagersCollection(userId);
  const docRef = doc(managersCol, MANAGER_DOC_ID);
  await runWriteWithSync(() => deleteDoc(docRef));
};

export const subscribePairExclusions = (
  userId: string,
  callback: (exclusions: PairExclusion[]) => void
): (() => void) => {
  const pairExclusionsCol = getPairExclusionsCollection(userId);
  return createSyncedSubscription<QuerySnapshot>(
    (onNext, onError) => onSnapshot(pairExclusionsCol, onNext, onError),
    (snapshot) => {
      const exclusions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as PairExclusion);
      exclusions.sort((a, b) => toMillisSafe(b.createdAt) - toMillisSafe(a.createdAt));
      callback(exclusions);
    }
  );
};

/**
 * ペア除外設定を追加（重複チェック付き）
 * 「既に登録済み」エラーはバリデーションエラーのため reportSaveError は発火させない。
 * Firestore エラーのみ runWriteWithSync 経由で通知する。
 */
export const addPairExclusion = async (userId: string, memberId1: string, memberId2: string): Promise<void> => {
  const [normalizedId1, normalizedId2] = normalizePairIds(memberId1, memberId2);
  const pairExclusionsCol = getPairExclusionsCollection(userId);
  const existingSnapshot = await runWriteWithSync(() =>
    getDocs(query(pairExclusionsCol, where('memberId1', '==', normalizedId1), where('memberId2', '==', normalizedId2)))
  );
  if (!existingSnapshot.empty) {
    throw new Error('この組み合わせは既に登録されています');
  }
  const id = crypto.randomUUID();
  const docRef = doc(pairExclusionsCol, id);
  await runWriteWithSync(() =>
    setDoc(docRef, {
      id,
      memberId1: normalizedId1,
      memberId2: normalizedId2,
      createdAt: serverTimestamp(),
    })
  );
};

export const deletePairExclusion = async (userId: string, exclusionId: string): Promise<void> => {
  const pairExclusionsCol = getPairExclusionsCollection(userId);
  const docRef = doc(pairExclusionsCol, exclusionId);
  await runWriteWithSync(() => deleteDoc(docRef));
};
