// assignment 担当データ本体（issue #546）
// 旧 app/assignment/lib/firebase/assignment.ts から移設。
// 購読は createSyncedSubscription 経由で失敗時に reportSyncError、
// 書き込み・読み取りは runWriteWithSync 経由で失敗時に reportSaveError につなぐ。
import {
  doc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  where,
  limit,
  runTransaction,
} from 'firebase/firestore';
import type { QuerySnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AssignmentDay, Assignment } from '@/types';
import { getAssignmentDaysCollection } from './references';
import { normalizeAssignmentsForDate, sortAssignmentsStable, areAssignmentsEqual } from './helpers';
import { createSyncedSubscription, runWriteWithSync } from './sync';

export const getServerTodayDate = async (timeZone: string = 'Asia/Tokyo'): Promise<string> => {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
};

export const mutateAssignmentDay = async (
  userId: string,
  date: string,
  updater: (current: Assignment[]) => Assignment[]
): Promise<{ assignments: Assignment[]; changed: boolean }> => {
  const assignmentDaysCol = getAssignmentDaysCollection(userId);
  const docRef = doc(assignmentDaysCol, date);

  return runWriteWithSync(() =>
    runTransaction(db, async (tx) => {
      const snap = await tx.get(docRef);
      const existingData = snap.exists() ? (snap.data() as AssignmentDay) : undefined;
      const currentRaw = existingData?.assignments ?? [];
      const normalizedCurrent = sortAssignmentsStable(normalizeAssignmentsForDate(currentRaw, date));

      const proposed = sortAssignmentsStable(normalizeAssignmentsForDate(updater(currentRaw), date));

      const shouldCreateDoc = !snap.exists();
      const hasDifference = shouldCreateDoc || !areAssignmentsEqual(normalizedCurrent, proposed);

      if (!hasDifference) {
        return { assignments: normalizedCurrent, changed: false };
      }

      tx.set(docRef, {
        date,
        assignments: proposed,
        updatedAt: serverTimestamp(),
        createdAt: existingData?.createdAt ?? serverTimestamp(),
      });

      return { assignments: proposed, changed: true };
    })
  );
};

export const updateAssignmentDay = async (userId: string, date: string, assignments: Assignment[]) => {
  // 失敗時の通知・再 throw は mutateAssignmentDay 内の runWriteWithSync が担う
  await mutateAssignmentDay(userId, date, () => assignments);
};

export const subscribeLatestAssignmentDay = (
  userId: string,
  callback: (data: AssignmentDay | null) => void,
  options?: { onEmpty?: () => Promise<void>; onError?: () => void }
) => {
  const assignmentDaysCol = getAssignmentDaysCollection(userId);
  const latestQuery = query(assignmentDaysCol, orderBy('updatedAt', 'desc'), limit(1));
  let initializing = false;

  return createSyncedSubscription<QuerySnapshot>(
    (onNext, onError) => onSnapshot(latestQuery, onNext, onError),
    async (snap) => {
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        callback({ ...docSnap.data(), date: docSnap.id } as AssignmentDay);
        return;
      }

      callback(null);

      if (options?.onEmpty && !initializing) {
        initializing = true;
        try {
          await options.onEmpty();
        } catch (error) {
          // onEmpty 内の実書き込みは updateAssignmentDay 側で通知済み。ここは購読コールバックを
          // 例外で止めないための保険なので console.error に留める
          console.error('Failed to initialize first assignment day:', error);
        } finally {
          initializing = false;
        }
      }
    },
    // 初回購読がエラーで成功しない場合でも、呼び出し側がローディングを解除できるよう通知する
    () => options?.onError?.()
  );
};

export const fetchRecentAssignments = async (
  userId: string,
  endDate: string,
  days: number
): Promise<AssignmentDay[]> => {
  return runWriteWithSync(async () => {
    const assignmentDaysCol = getAssignmentDaysCollection(userId);
    const promises = [];
    const targetDate = new Date(endDate);

    for (let i = 1; i <= days; i++) {
      const d = new Date(targetDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      promises.push(getDocs(query(assignmentDaysCol, where('__name__', '==', dateStr))));
    }

    const snapshots = await Promise.all(promises);
    const results: AssignmentDay[] = [];

    snapshots.forEach((snap) => {
      if (!snap.empty) {
        snap.forEach((d) => results.push({ ...d.data(), date: d.id } as AssignmentDay));
      }
    });

    return results;
  });
};
