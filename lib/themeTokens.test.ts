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

function getRelativeLuminance(hexColor: string): number {
  const channels = hexColor
    .match(/[0-9a-f]{2}/gi)
    ?.map((channel) => parseInt(channel, 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));

  if (!channels) {
    throw new Error(`Invalid hex color: ${hexColor}`);
  }

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function getContrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('theme tokens', () => {
  it('通常テーマのアクセント色は明るいオレンジと読みやすい文字色を使う', () => {
    const css = readThemeCss();
    const spot = getRootThemeToken(css, '--spot');
    const spotHover = getRootThemeToken(css, '--spot-hover');
    const onSpot = getRootThemeToken(css, '--on-spot');
    const btnPrimary = getRootThemeToken(css, '--btn-primary');
    const btnPrimaryHover = getRootThemeToken(css, '--btn-primary-hover');
    const btnPrimaryText = getRootThemeToken(css, '--btn-primary-text');

    expect(spot).toBe('#d97706');
    expect(onSpot).toBe('#211714');
    expect(btnPrimary).toBe('#d97706');
    expect(btnPrimaryText).toBe('#211714');
    expect(getContrastRatio(onSpot!, spot!)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(onSpot!, spotHover!)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(btnPrimaryText!, btnPrimary!)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(btnPrimaryText!, btnPrimaryHover!)).toBeGreaterThanOrEqual(4.5);
  });
});
