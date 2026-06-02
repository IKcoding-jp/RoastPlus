// 欠点豆マスターデータのクライアントキャッシュ
//
// 欠点豆図鑑を開くたびに Firestore からコレクション全体を取得すると、
// 表示までに時間がかかり、画像も順次読み込まれてバラバラに見える。
// マスターデータはめったに変化しないため、メモリ + localStorage にキャッシュし、
// stale-while-revalidate（キャッシュを即時表示しつつ裏で最新を取得）で高速化する。

import type { DefectBean } from '@/types';

const CACHE_KEY = 'roastplus_defect_beans_master_cache';
/** キャッシュ構造を変更した場合はインクリメントして古いキャッシュを無効化する */
const CACHE_VERSION = 1;

interface CacheEntry {
  version: number;
  cachedAt: number;
  data: DefectBean[];
}

// セッション中のクライアント遷移をまたいで即座に参照できるメモリキャッシュ
let memoryCache: DefectBean[] | null = null;

/**
 * キャッシュされたマスターデータを取得する。
 * メモリキャッシュを優先し、なければ localStorage から復元する。
 * キャッシュが存在しない / 破損している場合は null を返す。
 */
export function getCachedMasterDefectBeans(): DefectBean[] | null {
  if (memoryCache !== null) {
    return memoryCache;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }

    const entry = JSON.parse(raw) as CacheEntry;
    if (entry.version !== CACHE_VERSION || !Array.isArray(entry.data)) {
      return null;
    }

    memoryCache = entry.data;
    return entry.data;
  } catch {
    // パース失敗や localStorage アクセス不可は致命的ではない
    return null;
  }
}

/**
 * マスターデータをキャッシュに保存する（メモリ + localStorage）。
 */
export function setCachedMasterDefectBeans(data: DefectBean[]): void {
  memoryCache = data;

  if (typeof window === 'undefined') {
    return;
  }

  try {
    const entry: CacheEntry = {
      version: CACHE_VERSION,
      cachedAt: Date.now(),
      data,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // 容量超過やシリアライズ失敗は無視（メモリキャッシュは有効なまま）
  }
}

/**
 * キャッシュを破棄する（メモリ + localStorage）。主にテストや明示的な無効化で使用。
 */
export function clearCachedMasterDefectBeans(): void {
  memoryCache = null;

  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // 無視
  }
}
