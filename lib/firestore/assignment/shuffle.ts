// シャッフルイベント・履歴の保存／購読（issue #546）
// 旧 app/assignment/lib/firebase/shuffle.ts から移設。
// 購読は createSyncedSubscription 経由で失敗時に reportSyncError、
// 書き込み・読み取りは runWriteWithSync 経由で失敗時に reportSaveError につなぐ。
// ⚠️ B&B 大域最適化（PR #494）の仕様には触れない。ここはデータ層の移送のみ。
import {
  doc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  updateDoc,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import type { DocumentSnapshot } from 'firebase/firestore';
import { ShuffleEvent, ShuffleHistory } from '@/types';
import { getShuffleEventsCollection, getShuffleHistoryCollection } from './references';
import { toMillisSafe } from './helpers';
import { createSyncedSubscription, runWriteWithSync } from './sync';

export const subscribeShuffleEvent = (userId: string, date: string, callback: (data: ShuffleEvent | null) => void) => {
  const shuffleEventsCol = getShuffleEventsCollection(userId);
  const docRef = doc(shuffleEventsCol, date);
  return createSyncedSubscription<DocumentSnapshot>(
    (onNext, onError) => onSnapshot(docRef, onNext, onError),
    (snap) => {
      if (snap.exists()) {
        callback({ ...snap.data(), date: snap.id } as ShuffleEvent);
      } else {
        callback(null);
      }
    }
  );
};

export const createShuffleEvent = async (userId: string, event: ShuffleEvent) => {
  const shuffleEventsCol = getShuffleEventsCollection(userId);
  const docRef = doc(shuffleEventsCol, event.date);
  await runWriteWithSync(() => setDoc(docRef, event));
};

export const updateShuffleEventState = async (userId: string, date: string, state: 'running' | 'done') => {
  const shuffleEventsCol = getShuffleEventsCollection(userId);
  const docRef = doc(shuffleEventsCol, date);
  await runWriteWithSync(() => updateDoc(docRef, { state }));
};

export const createShuffleHistory = async (userId: string, history: Omit<ShuffleHistory, 'createdAt'>) => {
  const shuffleHistoryCol = getShuffleHistoryCollection(userId);
  const docRef = doc(shuffleHistoryCol, history.id);
  await runWriteWithSync(() =>
    setDoc(docRef, {
      ...history,
      createdAt: serverTimestamp(),
    })
  );
};

export const fetchRecentShuffleHistory = async (userId: string, limitCount: number = 2): Promise<ShuffleHistory[]> => {
  const shuffleHistoryCol = getShuffleHistoryCollection(userId);
  // orderBy 成功時もフォールバック成功時も成功とみなし、両方失敗した場合だけ通知するため
  // try/catch 全体を runWriteWithSync で包む。
  return runWriteWithSync(async () => {
    try {
      const q = query(shuffleHistoryCol, orderBy('createdAt', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ShuffleHistory);
    } catch (error) {
      // インデックスが作成されていない場合や、createdAtフィールドが存在しない場合のフォールバック
      // 全件取得してソート（データ量が少ない場合のみ有効）
      console.warn('Failed to fetch shuffle history with orderBy, falling back to full fetch:', error);
      const snapshot = await getDocs(shuffleHistoryCol);
      const allHistory = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ShuffleHistory);
      // createdAtでソート（存在しない場合は最後に）
      allHistory.sort((a, b) => toMillisSafe(b.createdAt) - toMillisSafe(a.createdAt)); // 降順
      return allHistory.slice(0, limitCount);
    }
  });
};
