import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readThemeCss(): string {
  return readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8');
}

function getRootThemeToken(css: string, tokenName: string): string | undefined {
  const rootThemeBlock = css.match(/@layer theme\s*{\s*:root\s*{(?<body>[\s\S]*?)^\s*}/m)?.groups?.body;
  return rootThemeBlock?.match(new RegExp(`\\s${tokenName}:\\s*([^;]+);`))?.[1]?.trim();
}

describe('theme tokens', () => {
  it('通常テーマのアクセント色は明るいオレンジを使う', () => {
    const css = readThemeCss();

    expect(getRootThemeToken(css, '--spot')).toBe('#d97706');
    expect(getRootThemeToken(css, '--spot-hover')).toBe('#b45309');
    expect(getRootThemeToken(css, '--btn-primary')).toBe('#d97706');
    expect(getRootThemeToken(css, '--btn-primary-hover')).toBe('#b45309');
  });
});
