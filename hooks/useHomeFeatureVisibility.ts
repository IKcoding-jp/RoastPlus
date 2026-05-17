'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  getHiddenHomeFeatureKeys,
  normalizeHiddenHomeFeatureKeys,
  setHiddenHomeFeatureKeys,
} from '@/lib/homeFeatureVisibility';
import type { HomeFeatureKey } from '@/lib/homeFeatures';
import type { AppData } from '@/types';

import { useAppData } from './useAppData';

function loadHiddenKeys(): HomeFeatureKey[] {
  if (typeof window === 'undefined') return [];
  return getHiddenHomeFeatureKeys();
}

export function useHomeFeatureVisibility() {
  const { data, updateData, isLoading } = useAppData();
  const [localHiddenKeys, setLocalHiddenKeys] = useState<HomeFeatureKey[]>(loadHiddenKeys);
  const hasMigratedLocalStorageRef = useRef(false);
  const accountHiddenKeys = useMemo(
    () => (!isLoading && data.userSettings && 'homeHiddenFeatureKeys' in data.userSettings
      ? normalizeHiddenHomeFeatureKeys(data.userSettings.homeHiddenFeatureKeys)
      : null),
    [data.userSettings, isLoading]
  );
  const hiddenKeys = accountHiddenKeys ?? localHiddenKeys;

  useEffect(() => {
    if (isLoading) return;

    if (accountHiddenKeys) {
      setHiddenHomeFeatureKeys(accountHiddenKeys);
      return;
    }

    if (localHiddenKeys.length === 0 || hasMigratedLocalStorageRef.current) {
      return;
    }

    hasMigratedLocalStorageRef.current = true;
    updateData((currentData: AppData) => ({
      ...currentData,
      userSettings: {
        ...currentData.userSettings,
        homeHiddenFeatureKeys: localHiddenKeys,
      },
    }));
  }, [accountHiddenKeys, isLoading, localHiddenKeys, updateData]);

  const updateFeatureHidden = useCallback((key: HomeFeatureKey, hidden: boolean) => {
    const currentKeys = hiddenKeys;
    const nextKeys = normalizeHiddenHomeFeatureKeys(
      hidden
        ? [...currentKeys, key]
        : currentKeys.filter((currentKey) => currentKey !== key)
    );

    setLocalHiddenKeys(nextKeys);
    setHiddenHomeFeatureKeys(nextKeys);
    updateData((currentData: AppData) => ({
      ...currentData,
      userSettings: {
        ...currentData.userSettings,
        homeHiddenFeatureKeys: nextKeys,
      },
    }));
  }, [hiddenKeys, updateData]);

  const resetVisibility = useCallback(() => {
    setHiddenHomeFeatureKeys([]);
    setLocalHiddenKeys([]);
    updateData((currentData: AppData) => ({
      ...currentData,
      userSettings: {
        ...currentData.userSettings,
        homeHiddenFeatureKeys: [],
      },
    }));
  }, [updateData]);

  const isVisible = useCallback(
    (key: HomeFeatureKey) => !hiddenKeys.includes(key),
    [hiddenKeys]
  );

  return {
    hiddenKeys,
    isVisible,
    isLoading,
    updateFeatureHidden,
    resetVisibility,
  };
}
