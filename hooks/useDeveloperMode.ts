'use client';

import { useState, useCallback, useEffect } from 'react';

// 開発中の表示切替用。認証・認可や本番のアクセス制御として使わない。
const DEVELOPER_MODE_PASSWORD = '4869';
const STORAGE_KEY = 'roastplus_developer_mode';

export function isDeveloperModeAvailable(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function useDeveloperMode() {
  const isAvailable = isDeveloperModeAvailable();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(typeof window === 'undefined');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!isAvailable) {
      queueMicrotask(() => {
        localStorage.removeItem(STORAGE_KEY);
        setIsEnabled(false);
        setIsLoading(false);
      });
      return;
    }

    queueMicrotask(() => {
      setIsEnabled(localStorage.getItem(STORAGE_KEY) === 'true');
      setIsLoading(false);
    });
  }, [isAvailable]);

  // 開発者モードを有効化
  const enableDeveloperMode = useCallback((password?: string): boolean => {
    if (!isAvailable || password !== DEVELOPER_MODE_PASSWORD || typeof window === 'undefined') {
      return false;
    }

    localStorage.setItem(STORAGE_KEY, 'true');
    setIsEnabled(true);
    return true;
  }, [isAvailable]);

  // 開発者モードを無効化
  const disableDeveloperMode = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    setIsEnabled(false);
  }, []);

  return {
    isAvailable,
    isEnabled,
    isLoading,
    enableDeveloperMode,
    disableDeveloperMode,
  };
}
