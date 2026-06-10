import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeveloperMode } from './useDeveloperMode';

describe('useDeveloperMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('4869 の入力で開発者モードを有効化できる', () => {
    const { result } = renderHook(() => useDeveloperMode());

    let success = false;
    act(() => {
      success = result.current.enableDeveloperMode('4869');
    });

    expect(success).toBe(true);
    expect(result.current.isEnabled).toBe(true);
    expect(localStorage.getItem('roastplus_developer_mode')).toBe('true');
  });

  it('4869 以外の入力では開発者モードを有効化できない', () => {
    const { result } = renderHook(() => useDeveloperMode());

    let success = true;
    act(() => {
      success = result.current.enableDeveloperMode('wrong-password');
    });

    expect(success).toBe(false);
    expect(result.current.isEnabled).toBe(false);
    expect(localStorage.getItem('roastplus_developer_mode')).toBeNull();
  });
});
