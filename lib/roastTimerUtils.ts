/**
 * 秒数を分:秒形式の文字列に変換
 *
 * @param seconds 秒数
 * @returns "MM:SS"形式の文字列
 */
export function formatTime(seconds: number): string {
  const roundedSeconds = Math.floor(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * 秒数を分単位の文字列に変換（例: "5分"）
 *
 * @param seconds 秒数
 * @returns "X分"形式の文字列
 */
export function formatTimeAsMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${minutes}分`;
}

/**
 * 秒数を分と秒を含む文字列に変換（例: "5分30秒"）
 *
 * @param seconds 秒数
 * @returns "X分Y秒"形式の文字列
 */
export function formatTimeAsMinutesAndSeconds(seconds: number): string {
  const roundedSeconds = Math.floor(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}秒`;
  }
  if (remainingSeconds === 0) {
    return `${minutes}分`;
  }
  return `${minutes}分${remainingSeconds}秒`;
}
