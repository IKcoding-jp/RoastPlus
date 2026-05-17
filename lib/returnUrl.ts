/**
 * リダイレクト用の returnUrl を検証して安全な相対パスとして返します。
 *
 * - decodeURIComponent 後に URL パース
 * - 同一オリジンのみ許可
 * - 外部スキームやプロトコル相対URLは拒否
 * - 失敗時は fallback を返却
 */
export function getSafeReturnUrl(rawReturnUrl: string | null, fallback: string): string {
  if (!rawReturnUrl) {
    return fallback;
  }

  try {
    const maybeDecoded = rawReturnUrl.includes('%') ? decodeURIComponent(rawReturnUrl) : rawReturnUrl;
    const parsed = new URL(maybeDecoded, window.location.origin);

    if (parsed.origin !== window.location.origin) {
      return fallback;
    }

    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!path.startsWith('/')) {
      return fallback;
    }

    // プロトコル相対URL対策: //evil.com のような形式を除外
    if (path.startsWith('//')) {
      return fallback;
    }

    return path;
  } catch {
    return fallback;
  }
}
