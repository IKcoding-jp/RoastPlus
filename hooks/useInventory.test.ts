import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockSubscribe = vi.fn();
vi.mock('@/lib/firestore', () => ({
  subscribeInventoryItems: (...args: unknown[]) => mockSubscribe(...args),
}));

import { useInventory } from './useInventory';
import type { InventoryItem } from '@/types';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useInventory', () => {
  it('userId が確定していれば購読し、callbackで受け取った items を返す', async () => {
    const sample: InventoryItem[] = [{ id: 'a', name: 'ドリップ袋', status: 'low' }];
    let captured: ((items: InventoryItem[]) => void) | undefined;
    mockSubscribe.mockImplementation((_userId: string, cb: (items: InventoryItem[]) => void) => {
      captured = cb;
      return () => {};
    });

    const { result } = renderHook(() => useInventory('user-1'));
    expect(mockSubscribe).toHaveBeenCalledWith('user-1', expect.any(Function), expect.any(Function));
    expect(result.current.isLoading).toBe(true);

    act(() => {
      captured?.(sample);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.items).toEqual(sample);
    });
  });

  it('userId が null の間は購読せず空配列を返す', () => {
    const { result } = renderHook(() => useInventory(null));

    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(result.current).toEqual({ items: [], isLoading: false });
  });
});
