import { describe, expect, test } from 'vitest';
import { getServerProbeURL, isE2EModeHTML } from './run-e2e';

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
