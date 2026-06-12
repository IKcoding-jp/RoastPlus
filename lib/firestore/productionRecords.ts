import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type CollectionReference,
  type DocumentData,
  type Query,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb, removeUndefinedFields } from './common';
import {
  PRODUCTION_RECORD_ERROR_MESSAGES,
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
import {
  HandpickEntryDocSchema,
  PackageEntryDocSchema,
  ProductionRecordMonthDocSchema,
  RoastEntryDocSchema,
} from './schemas/productionRecords';
import type { ZodType } from 'zod';

const RECENT_PRODUCTION_MONTHS_LIMIT = 24;

function assertValidMonth(month: string): void {
  if (!isValidProductionMonth(month)) {
    throw new Error(PRODUCTION_RECORD_ERROR_MESSAGES.month);
  }
}

/**
 * 既存docのcreatedAtを保持しつつ、レガシーデータを修復する（issue #519）。
 * 旧removeUndefinedFieldsのバグで保存されたcreatedAtには2形ある:
 * - {_methodName:'serverTimestamp'}: 時刻情報なし → serverTimestamp()で振り直す
 * - {seconds, nanoseconds}: Timestampが破壊された形。真の作成時刻を持つ → Timestampに復元する
 */
function restoreCreatedAt(value: unknown) {
  if (value instanceof Timestamp) {
    return value;
  }
  if (value && typeof value === 'object') {
    const { seconds, nanoseconds } = value as { seconds?: unknown; nanoseconds?: unknown };
    if (typeof seconds === 'number' && typeof nanoseconds === 'number') {
      return new Timestamp(seconds, nanoseconds);
    }
  }
  return serverTimestamp();
}

/**
 * Zod スキーマで DocumentData を検証する共通ヘルパー。
 * 検証失敗時は構造化されたエラーを警告ログに出力し、false を返す。
 * タイムスタンプ（createdAt / updatedAt）は検証対象外のため data には含めない。
 */
function validateDoc<T>(schema: ZodType<T>, data: DocumentData, context: string): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn(`[zod] ${context} の検証失敗:`, result.error.issues);
    return null;
  }
  return result.data;
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
  const validated = validateDoc(ProductionRecordMonthDocSchema, data, `productionRecords/${id}`);
  if (validated) {
    return { ...validated, createdAt: data.createdAt, updatedAt: data.updatedAt };
  }
  // フォールバック: 不正フィールドをデフォルト値で補完
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
  onError: (error: Error) => void
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
      onError(error);
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
        createdAt: restoreCreatedAt(existingData?.createdAt),
        updatedAt: serverTimestamp(),
      })
    );
  });
}

/**
 * 対象月ドキュメントが既に存在するか確認する（重複月の新規作成を防ぐため）。
 * recentMonths(最新24件)の購読に依存せず、窓外の古い月も判定できる。
 */
export async function productionRecordMonthExists(userId: string, month: string): Promise<boolean> {
  const snapshot = await getDoc(getProductionRecordMonthDocRef(userId, month));
  return snapshot.exists();
}

export function subscribeRecentProductionMonths(
  userId: string,
  callback: (records: ProductionRecordMonth[]) => void,
  onError: (error: Error) => void
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
      onError(error);
      callback([]);
    }
  );
}

function subscribeEntryCollection<TEntry>({
  entriesQuery,
  normalize,
  callback,
  onError,
  errorMessage,
}: {
  entriesQuery: Query<DocumentData>;
  normalize: (id: string, data: DocumentData) => TEntry;
  callback: (entries: TEntry[]) => void;
  onError: (error: Error) => void;
  errorMessage: string;
}): Unsubscribe {
  return onSnapshot(
    entriesQuery,
    (snapshot) => {
      callback(snapshot.docs.map((entryDoc) => normalize(entryDoc.id, entryDoc.data())));
    },
    (error) => {
      console.error(errorMessage, error);
      onError(error);
      callback([]);
    }
  );
}

async function upsertEntry<TEntry extends object>({
  collectionRef,
  id,
  entry,
  previousId,
  collisionMessage,
}: {
  collectionRef: CollectionReference<DocumentData>;
  id: string;
  entry: TEntry;
  previousId?: string;
  collisionMessage: string;
}): Promise<void> {
  const docRef = doc(collectionRef, id);

  await runTransaction(getDb(), async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (previousId && previousId !== id && snapshot.exists()) {
      throw new Error(collisionMessage);
    }
    const createdAt = restoreCreatedAt(snapshot.data()?.createdAt);
    if (previousId && previousId !== id) {
      transaction.delete(doc(collectionRef, previousId));
    }
    transaction.set(
      docRef,
      removeUndefinedFields({
        ...entry,
        createdAt,
        updatedAt: serverTimestamp(),
      })
    );
  });
}

function normalizeHandpickSegment(value: unknown): HandpickSegment {
  return value === 'second' ? 'second' : 'first';
}

function normalizeHandpickEntry(id: string, data: DocumentData): HandpickEntry {
  const validated = validateDoc(HandpickEntryDocSchema, data, `handpickEntries/${id}`);
  if (validated) {
    return { ...buildHandpickEntry(validated), id, createdAt: data.createdAt, updatedAt: data.updatedAt };
  }
  // フォールバック: Zod検証失敗時は build 関数のバリデーションを経由せず直接構築
  return {
    workDate: typeof data.workDate === 'string' ? data.workDate : '',
    beanName: typeof data.beanName === 'string' ? data.beanName : '',
    segment: normalizeHandpickSegment(data.segment),
    greenBeanWeightGram: typeof data.greenBeanWeightGram === 'number' ? data.greenBeanWeightGram : 0,
    defectBeanWeightGram: typeof data.defectBeanWeightGram === 'number' ? data.defectBeanWeightGram : 0,
    id,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribeHandpickEntries(
  userId: string,
  month: string,
  callback: (entries: HandpickEntry[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const entriesQuery = query(getHandpickEntriesCollectionRef(userId, month), orderBy('createdAt', 'desc'));

  return subscribeEntryCollection({
    entriesQuery,
    normalize: normalizeHandpickEntry,
    callback,
    onError,
    errorMessage: 'Failed to subscribe handpick entries:',
  });
}

/**
 * ハンドピックの一意キー = 日付 + 区分 + 豆名。
 * 同じキーの記録は重複させず上書き更新する（削除機能が無いため重複を作らない方針）。
 * 豆名は任意文字を含み得るため encodeURIComponent で doc ID 安全にする。
 */
function buildHandpickEntryId(workDate: string, segment: HandpickSegment, beanName: string): string {
  return `${workDate}__${segment}__${encodeURIComponent(beanName.trim())}`;
}

/**
 * ハンドピック記録を保存する（upsert）。
 * previousId に編集中レコードのIDを渡すと、キー変更でIDが変わった場合に旧docを削除して付け替える。
 */
export async function saveHandpickEntry(
  userId: string,
  month: string,
  input: HandpickEntryInput,
  previousId?: string
): Promise<string> {
  const entry = buildHandpickEntry(input);
  const id = buildHandpickEntryId(entry.workDate, entry.segment, entry.beanName);
  const colRef = getHandpickEntriesCollectionRef(userId, month);

  await upsertEntry({
    collectionRef: colRef,
    id,
    entry,
    previousId,
    collisionMessage: PRODUCTION_RECORD_ERROR_MESSAGES.handpickEntryCollision,
  });

  return id;
}

function normalizeRoastEntry(id: string, data: DocumentData): RoastEntry {
  const validated = validateDoc(RoastEntryDocSchema, data, `roastEntries/${id}`);
  if (validated) {
    return { ...buildRoastEntry(validated), id, createdAt: data.createdAt, updatedAt: data.updatedAt };
  }
  // フォールバック: Zod検証失敗時は build 関数のバリデーションを経由せず直接構築
  // （buildRoastEntry は重量0を拒否するため、欠損フィールドを直接デフォルト補完する）
  return {
    workDate: typeof data.workDate === 'string' ? data.workDate : '',
    beforeRoastWeightGram: typeof data.beforeRoastWeightGram === 'number' ? data.beforeRoastWeightGram : 0,
    afterRoastWeightGram: typeof data.afterRoastWeightGram === 'number' ? data.afterRoastWeightGram : 0,
    id,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribeRoastEntries(
  userId: string,
  month: string,
  callback: (entries: RoastEntry[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const entriesQuery = query(getRoastEntriesCollectionRef(userId, month), orderBy('createdAt', 'desc'));

  return subscribeEntryCollection({
    entriesQuery,
    normalize: normalizeRoastEntry,
    callback,
    onError,
    errorMessage: 'Failed to subscribe roast entries:',
  });
}

/**
 * 焙煎記録を保存する（upsert）。一意キー = 日付（1日1件）。
 * previousId に編集中レコードのIDを渡すと、日付変更でIDが変わった場合に旧docを削除する。
 */
export async function saveRoastEntry(
  userId: string,
  month: string,
  input: RoastEntryInput,
  previousId?: string
): Promise<string> {
  const entry = buildRoastEntry(input);
  const id = entry.workDate;
  const colRef = getRoastEntriesCollectionRef(userId, month);

  await upsertEntry({
    collectionRef: colRef,
    id,
    entry,
    previousId,
    collisionMessage: PRODUCTION_RECORD_ERROR_MESSAGES.roastEntryCollision,
  });

  return id;
}

function normalizeTeamCounts(value: unknown): TeamCounts {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

  return {
    goodCount: normalizeCountInput(typeof data.goodCount === 'number' ? data.goodCount : 0),
    defectiveCount: normalizeCountInput(typeof data.defectiveCount === 'number' ? data.defectiveCount : 0),
  };
}

function normalizePackageEntry(id: string, data: DocumentData): PackageEntry {
  const validated = validateDoc(PackageEntryDocSchema, data, `packageEntries/${id}`);
  if (validated) {
    return { ...buildPackageEntry(validated), id, createdAt: data.createdAt, updatedAt: data.updatedAt };
  }
  // フォールバック: Zod検証失敗時は build 関数のバリデーションを経由せず直接構築
  return {
    workDate: typeof data.workDate === 'string' ? data.workDate : '',
    teamA: normalizeTeamCounts(data.teamA),
    teamB: normalizeTeamCounts(data.teamB),
    id,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribePackageEntries(
  userId: string,
  month: string,
  callback: (entries: PackageEntry[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const entriesQuery = query(getPackageEntriesCollectionRef(userId, month), orderBy('createdAt', 'desc'));

  return subscribeEntryCollection({
    entriesQuery,
    normalize: normalizePackageEntry,
    callback,
    onError,
    errorMessage: 'Failed to subscribe package entries:',
  });
}

/**
 * パッケージ記録を保存する（upsert）。一意キー = 日付（1日1件、A班/B班をまとめて1レコード）。
 * previousId に編集中レコードのIDを渡すと、日付変更でIDが変わった場合に旧docを削除する。
 */
export async function savePackageEntry(
  userId: string,
  month: string,
  input: PackageEntryInput,
  previousId?: string
): Promise<string> {
  const entry = buildPackageEntry(input);
  const id = entry.workDate;
  const colRef = getPackageEntriesCollectionRef(userId, month);

  await upsertEntry({
    collectionRef: colRef,
    id,
    entry,
    previousId,
    collisionMessage: PRODUCTION_RECORD_ERROR_MESSAGES.packageEntryCollision,
  });

  return id;
}
