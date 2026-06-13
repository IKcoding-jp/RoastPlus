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
  it('購読のcallbackで受け取った items を返し、isLoading を解除する', async () => {
    const sample: InventoryItem[] = [{ id: 'a', name: 'ドリップ袋', status: 'low' }];
    let captured: ((items: InventoryItem[]) => void) | undefined;
    mockSubscribe.mockImplementation((cb: (items: InventoryItem[]) => void) => {
      captured = cb;
      return () => {};
    });

    const { result } = renderHook(() => useInventory());
    expect(result.current.isLoading).toBe(true);

    act(() => {
      captured?.(sample);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.items).toEqual(sample);
    });
  });
});
