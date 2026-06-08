'use client';

import type { ProductionRecordMonth, HandpickEntry, RoastEntry, PackageEntry } from '@/types';

/**
 * 生産記録の「数字のちらつき」防止用ローカルキャッシュ。
 *
 * Firestoreのデータは非同期で届くため、ページを開いた最初の描画では必ず空(0)になる。
 * 前回見た値を localStorage に保存しておき、描画の瞬間に同期的に読み出して
 * 0 ではなく前回値で描画を始めることで、0→実数値のジャンプを消す。
 *
 * - 認証や本番アクセス制御には使わない（あくまで表示の初期値ヒント）。
 * - 鍵に userId を含めるため、別アカウントの値は読み出されない。
 * - データ形が変わったら CACHE_VERSION を上げれば古いキャッシュは無視される。
 */

export interface ProductionRecordCacheData {
  monthDoc: ProductionRecordMonth | null;
  handpickEntries: HandpickEntry[];
  roastEntries: RoastEntry[];
  packageEntries: PackageEntry[];
}

const CACHE_VERSION = 'v1';
const KEY_PREFIX = 'roastplus_prodrec_cache';

function buildKey(userId: string, month: string): string {
  return `${KEY_PREFIX}:${CACHE_VERSION}:${userId}:${month}`;
}

/**
 * キャッシュを同期的に読み出す。条件未達・未保存・壊れたJSONはすべて null を返し、
 * 呼び出し側は「キャッシュ無し（=従来どおり空から開始）」として扱えばよい。
 */
export function readProductionRecordCache(
  userId: string | undefined,
  month: string | undefined
): ProductionRecordCacheData | null {
  if (typeof window === 'undefined' || !userId || !month) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(buildKey(userId, month));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<ProductionRecordCacheData> | null;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    // 配列フィールドは型を最低限ガードしておく（壊れた値で描画が落ちないように）
    return {
      monthDoc: parsed.monthDoc ?? null,
      handpickEntries: Array.isArray(parsed.handpickEntries) ? parsed.handpickEntries : [],
      roastEntries: Array.isArray(parsed.roastEntries) ? parsed.roastEntries : [],
      packageEntries: Array.isArray(parsed.packageEntries) ? parsed.packageEntries : [],
    };
  } catch {
    // JSON破損やストレージ無効時はキャッシュ無し扱い
    return null;
  }
}

/**
 * 最新値をキャッシュに保存する。容量超過などの失敗は握りつぶす
 * （キャッシュは無くても本体は動くため）。
 */
export function writeProductionRecordCache(
  userId: string | undefined,
  month: string | undefined,
  data: ProductionRecordCacheData
): void {
  if (typeof window === 'undefined' || !userId || !month) {
    return;
  }

  try {
    window.localStorage.setItem(buildKey(userId, month), JSON.stringify(data));
  } catch {
    // QuotaExceeded などは無視
  }
}

const MONTH_LIST_KEY_PREFIX = 'roastplus_prodrec_months';

function buildMonthListKey(userId: string): string {
  return `${MONTH_LIST_KEY_PREFIX}:${CACHE_VERSION}:${userId}`;
}

/**
 * 月リスト（対象月の一覧）のキャッシュ。
 * これを描画の瞬間に入れることで、空状態↔グリッドの入替や
 * 対象月セレクトのポップインを防ぐ。
 */
export function readMonthListCache(userId: string | undefined): ProductionRecordMonth[] | null {
  if (typeof window === 'undefined' || !userId) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(buildMonthListKey(userId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ProductionRecordMonth[]) : null;
  } catch {
    return null;
  }
}

export function writeMonthListCache(userId: string | undefined, months: ProductionRecordMonth[]): void {
  if (typeof window === 'undefined' || !userId) {
    return;
  }

  try {
    window.localStorage.setItem(buildMonthListKey(userId), JSON.stringify(months));
  } catch {
    // QuotaExceeded などは無視
  }
}
