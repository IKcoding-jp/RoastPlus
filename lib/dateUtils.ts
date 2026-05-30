/**
 * 日付フォーマットユーティリティ関数
 */

/**
 * DateオブジェクトをYYYY-MM-DD形式の文字列に変換
 *
 * ローカルタイムゾーンの暦日を返す。toISOString()(UTC基準)を使うと
 * JST(UTC+9)の早朝(0:00〜8:59)に前日へずれるため、ローカルの年月日から組み立てる。
 *
 * @param date 変換対象の日付（省略時は現在日時）
 * @returns YYYY-MM-DD形式の文字列
 */
export function formatDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
