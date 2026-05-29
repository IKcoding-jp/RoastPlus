import { describe, expect, test } from 'vitest';
import { getServerProbeURL, isE2EModeHTML, quotePlaywrightArgs } from './run-e2e';

describe('isE2EModeHTML', () => {
  test('E2E mode marker is required before reusing an existing server', () => {
    expect(isE2EModeHTML('<body data-roastplus-e2e-mode="true">')).toBe(true);
    expect(isE2EModeHTML('<body data-roastplus-e2e-mode="false">')).toBe(false);
    expect(isE2EModeHTML('<body>')).toBe(false);
  });

  test('server probe URL avoids Next.js trailing slash redirects', () => {
    expect(getServerProbeURL('3100')).toBe('http://localhost:3100/login/');
  });
});

describe('quotePlaywrightArgs', () => {
  test('POSIX では空白を含む引数をシングルクォートで囲み引数境界を保つ', () => {
    expect(quotePlaywrightArgs(['--grep', '対象月 作成'], 'linux')).toBe("--grep '対象月 作成'");
  });

  test('POSIX では安全な文字だけの引数はクォートしない', () => {
    expect(quotePlaywrightArgs(['--ui'], 'linux')).toBe('--ui');
    expect(quotePlaywrightArgs(['--grep', 'production-record'], 'linux')).toBe('--grep production-record');
  });

  test('POSIX ではシングルクォートを含む引数を安全にエスケープする', () => {
    expect(quotePlaywrightArgs(["a'b"], 'linux')).toBe("'a'\\''b'");
  });

  test('Windows(cmd) では従来どおり素の連結に留める（ダブルクォートのネスト崩れ回避）', () => {
    expect(quotePlaywrightArgs(['--grep', '対象月 作成'], 'win32')).toBe('--grep 対象月 作成');
  });

  test('引数なしは空文字を返す', () => {
    expect(quotePlaywrightArgs([], 'linux')).toBe('');
    expect(quotePlaywrightArgs([], 'win32')).toBe('');
  });
});
