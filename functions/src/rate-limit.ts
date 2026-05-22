import { getApp, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getDefaultAdminApp, getUsageDocId, getUsageWindowId } from './rate-limit-helpers';

interface DailyUsageLimitOptions {
  uid: string;
  functionName: string;
  limit: number;
  timeZone?: string;
}

const USAGE_COLLECTION = '_functionUsage';
const DEFAULT_TIME_ZONE = 'Asia/Tokyo';

export class DailyUsageLimitExceededError extends Error {
  constructor() {
    super('本日のAI利用回数が上限に達しました。必要な場合は管理者に相談してください。');
    this.name = 'DailyUsageLimitExceededError';
  }
}

function getAdminDb() {
  return getFirestore(getDefaultAdminApp({ getApp, initializeApp }));
}

export async function assertDailyUsageLimit({
  uid,
  functionName,
  limit,
  timeZone = DEFAULT_TIME_ZONE,
}: DailyUsageLimitOptions): Promise<void> {
  const db = getAdminDb();
  const now = new Date();
  const windowId = getUsageWindowId(now, timeZone);
  const docRef = db.collection(USAGE_COLLECTION).doc(getUsageDocId(uid, functionName, now, timeZone));

  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(docRef);
    const currentCount = snapshot.exists ? Number(snapshot.get('count') ?? 0) : 0;
    const existingCreatedAt = snapshot.exists ? snapshot.get('createdAt') : undefined;

    if (currentCount >= limit) {
      throw new DailyUsageLimitExceededError();
    }

    tx.set(
      docRef,
      {
        uid,
        functionName,
        windowId,
        count: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: existingCreatedAt ?? FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}
