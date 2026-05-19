'use client';

import { useState, useCallback, useEffect } from 'react';

const DEVELOPER_MODE_PASSWORD = '4869';
const STORAGE_KEY = 'roastplus_developer_mode';

export function useDeveloperMode() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(typeof window === 'undefined');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    queueMicrotask(() => {
      setIsEnabled(localStorage.getItem(STORAGE_KEY) === 'true');
      setIsLoading(false);
    });
  }, []);

  // 開発者モードを有効化
  const enableDeveloperMode = useCallback((password?: string): boolean => {
    if (password !== DEVELOPER_MODE_PASSWORD || typeof window === 'undefined') {
      return false;
    }

    localStorage.setItem(STORAGE_KEY, 'true');
    setIsEnabled(true);
    return true;
  }, []);

  // 開発者モードを無効化
  const disableDeveloperMode = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    setIsEnabled(false);
  }, []);

  return {
    isEnabled,
    isLoading,
    enableDeveloperMode,
    disableDeveloperMode,
  };
}
