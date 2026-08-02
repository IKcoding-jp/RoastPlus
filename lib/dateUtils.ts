/**
 * 日付・時刻フォーマットユーティリティ
 * JST（日本標準時）前提。toISOString() は使用しない（UTCずれ防止）。
 */

import { WEEKDAY_NAMES } from '@/lib/constants';

/** DateオブジェクトをYYYY-MM-DD形式の文字列に変換（JST基準） */
export function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 今日の日付をYYYY-MM-DD形式で返す（JST基準） */
export function getTodayDateString(now: Date = new Date()): string {
  return formatDateToYMD(now);
}

/** 明日の日付をYYYY-MM-DD形式で返す（JST基準） */
export function getTomorrowDateString(now: Date = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateToYMD(tomorrow);
}

/** 当月をYYYY-MM形式で返す（JST基準） */
export function getCurrentMonth(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** YYYY-MM-DD文字列の前の平日を返す（土日をスキップ） */
export function getPreviousWeekday(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  date.setDate(date.getDate() - 1);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() - 1);
  }
  return formatDateToYMD(date);
}

/** YYYY-MM-DD文字列の次の平日を返す（土日をスキップ） */
export function getNextWeekday(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return formatDateToYMD(date);
}

/** DateオブジェクトをY年M月D日（曜）形式に変換 */
export function formatDateToJapanese(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAY_NAMES[date.getDay()];
  return `${year}年${month}月${day}日（${weekday}）`;
}

/** YYYY-MM-DD文字列をY年M月D日（曜）形式に変換 */
export function formatDateStringToJapanese(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return formatDateToJapanese(date);
}

/** DateオブジェクトをHH:MM:SS形式に変換（秒表示付き時刻用） */
export function formatTimeHMS(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/** DateオブジェクトをHH:MM形式に変換（時刻キー・比較用） */
export function formatTimeHM(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** 総分数をHH:MM形式に変換（例: 570 → "09:30"） */
export function formatMinutesToHHMM(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** 秒数をMM:SS形式に変換（ドリップタイマー表示用、例: 90 → "01:30"） */
export function formatSecondsAsTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * 残り秒数を短い可読形式に変換（例: 45 → "45秒" / 80 → "1:20"）。
 * 60秒未満は秒だけ、60秒以上はM:SS（分の先頭ゼロなし）。負値は0秒扱い。
 */
export function formatSecondsAsShortRemaining(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  if (safe < 60) {
    return `${safe}秒`;
  }
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
