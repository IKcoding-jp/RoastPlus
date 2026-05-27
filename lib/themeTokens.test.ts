import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readThemeCss(): string {
  return readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8');
}

function getRootThemeToken(css: string, tokenName: string): string | undefined {
  const rootThemeBlock = css.match(/@layer theme\s*{\s*:root\s*{([\s\S]*?)^\s*}/m)?.[1];
  return rootThemeBlock?.match(new RegExp(`\\s${tokenName}:\\s*([^;]+);`))?.[1]?.trim();
}

describe('theme tokens', () => {
  it('通常テーマのアクセント色は明るすぎないオレンジと白い文字色を使う', () => {
    const css = readThemeCss();
    const spot = getRootThemeToken(css, '--spot');
    const spotHover = getRootThemeToken(css, '--spot-hover');
    const onSpot = getRootThemeToken(css, '--on-spot');
    const btnPrimary = getRootThemeToken(css, '--btn-primary');
    const btnPrimaryHover = getRootThemeToken(css, '--btn-primary-hover');
    const btnPrimaryText = getRootThemeToken(css, '--btn-primary-text');

    expect(spot).toBe('#e48003');
    expect(spotHover).toBe('#c56604');
    expect(onSpot).toBe('#ffffff');
    expect(btnPrimary).toBe('#e48003');
    expect(btnPrimaryHover).toBe('#c56604');
    expect(btnPrimaryText).toBe('#ffffff');
  });
});
