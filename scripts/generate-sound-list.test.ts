import { describe, expect, it } from 'vitest';

import { formatTsStringLiteral } from './generate-sound-list';

describe('formatTsStringLiteral', () => {
  it('escapes apostrophes and backslashes for TypeScript single-quoted literals', () => {
    expect(formatTsStringLiteral("/sounds/roasttimer/worker's\\bell.mp3")).toBe(
      "'/sounds/roasttimer/worker\\'s\\\\bell.mp3'"
    );
  });

  it('keeps JSON string escaping for control characters', () => {
    expect(formatTsStringLiteral('line\nbreak')).toBe("'line\\nbreak'");
  });
});
