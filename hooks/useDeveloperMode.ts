'use client';

import { useState, useCallback, useEffect } from 'react';
import { getIdTokenResult, type User } from 'firebase/auth';
import { useAuth } from '@/lib/auth';

const STORAGE_KEY = 'roastplus_developer_mode';
const DEVELOPER_EMAIL_ALLOWLIST = new Set(
  (process.env.NEXT_PUBLIC_DEVELOPER_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0)
);

function hasDeveloperClaim(user: User): Promise<boolean> {
  return getIdTokenResult(user)
    .then((token) => {
      const { claims } = token;
      return (
        claims.developerMode === true ||
        claims.developer === true ||
        claims.isDeveloper === true
      );
    })
    .catch(() => false);
}

async function isAuthorizedDeveloperUser(user: User): Promise<boolean> {
  const email = user.email?.toLowerCase();
  if (DEVELOPER_EMAIL_ALLOWLIST.size > 0 && email && DEVELOPER_EMAIL_ALLOWLIST.has(email)) {
    return true;
  }

  return hasDeveloperClaim(user);
}

export function useDeveloperMode() {
  const { user, loading: authLoading } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [canUseDeveloperMode, setCanUseDeveloperMode] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(typeof window === 'undefined');

  const refreshPermissions = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!user) {
      setCanUseDeveloperMode(false);
      setIsEnabled(false);
      localStorage.removeItem(STORAGE_KEY);
      setIsLoading(false);
      return;
    }

    const isAllowed = await isAuthorizedDeveloperUser(user);
    setCanUseDeveloperMode(isAllowed);
    if (isAllowed) {
      setIsEnabled(localStorage.getItem(STORAGE_KEY) === 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setIsEnabled(false);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (authLoading) {
      return;
    }

    queueMicrotask(() => {
      void refreshPermissions();
    });
  }, [authLoading, refreshPermissions]);

  // 開発者モードを有効化
  const enableDeveloperMode = useCallback((_password?: string): boolean => {
    void _password;
    if (!canUseDeveloperMode || typeof window === 'undefined') {
      return false;
    }

    localStorage.setItem(STORAGE_KEY, 'true');
    setIsEnabled(true);
    return true;
  }, [canUseDeveloperMode]);

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
