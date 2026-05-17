'use client';

import { useCallback, useState } from 'react';

import {
  getHiddenHomeFeatureKeys,
  setHiddenHomeFeatureKeys,
  setHomeFeatureHidden,
} from '@/lib/homeFeatureVisibility';
import type { HomeFeatureKey } from '@/lib/homeFeatures';

function loadHiddenKeys(): HomeFeatureKey[] {
  if (typeof window === 'undefined') return [];
  return getHiddenHomeFeatureKeys();
}

export function useHomeFeatureVisibility() {
  const [hiddenKeys, setHiddenKeys] = useState<HomeFeatureKey[]>(loadHiddenKeys);

  const updateFeatureHidden = useCallback((key: HomeFeatureKey, hidden: boolean) => {
    setHomeFeatureHidden(key, hidden);
    setHiddenKeys(getHiddenHomeFeatureKeys());
  }, []);

  const resetVisibility = useCallback(() => {
    setHiddenHomeFeatureKeys([]);
    setHiddenKeys([]);
  }, []);

  const isVisible = useCallback(
    (key: HomeFeatureKey) => !hiddenKeys.includes(key),
    [hiddenKeys]
  );

  return {
    hiddenKeys,
    isVisible,
    updateFeatureHidden,
    resetVisibility,
  };
}
