import type { User, UserMetadata, IdTokenResult } from 'firebase/auth';
import type { AppData } from '@/types';
import { createConsentData } from '@/lib/consent';

const E2E_AUTH_STORAGE_KEY = 'roastplus_e2e_auth';
const E2E_APP_DATA_STORAGE_KEY = 'roastplus_e2e_app_data';
export const E2E_EMAIL = 'e2e@example.com';
export const E2E_PASSWORD = 'password123';
const E2E_USER_ID = 'e2e-user';

export function isE2EMode(): boolean {
  return process.env.NEXT_PUBLIC_E2E_MODE === 'true';
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getE2EUser(): User {
  const user: User = {
    uid: E2E_USER_ID,
    email: E2E_EMAIL,
    displayName: 'E2E User',
    emailVerified: true,
    isAnonymous: false,
    phoneNumber: null,
    photoURL: null,
    providerData: [],
    providerId: 'password',
    metadata: {} as UserMetadata,
    refreshToken: 'e2e-refresh-token',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'e2e-token',
    getIdTokenResult: async (): Promise<IdTokenResult> => ({
      authTime: new Date(0).toISOString(),
      expirationTime: new Date(0).toISOString(),
      issuedAtTime: new Date(0).toISOString(),
      signInProvider: 'password',
      signInSecondFactor: null,
      token: 'e2e-token',
      claims: {},
    }),
    reload: async () => {},
    toJSON: () => ({
      uid: E2E_USER_ID,
      email: E2E_EMAIL,
      displayName: 'E2E User',
    }),
  };
  return user;
}

export function isE2ESignedIn(): boolean {
  if (!canUseStorage()) {
    return false;
  }

  return window.localStorage.getItem(E2E_AUTH_STORAGE_KEY) === E2E_USER_ID;
}

export function signInE2EUser(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(E2E_AUTH_STORAGE_KEY, E2E_USER_ID);
}

export function signOutE2EUser(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(E2E_AUTH_STORAGE_KEY);
}

function cloneAppData(data: AppData): AppData {
  return JSON.parse(JSON.stringify(data)) as AppData;
}

function createInitialE2EData(defaultData: AppData): AppData {
  return {
    ...cloneAppData(defaultData),
    userConsent: createConsentData(),
  };
}

export function loadE2EAppData(defaultData: AppData): AppData {
  if (!canUseStorage()) {
    return createInitialE2EData(defaultData);
  }

  const storedData = window.localStorage.getItem(E2E_APP_DATA_STORAGE_KEY);
  if (!storedData) {
    const initialData = createInitialE2EData(defaultData);
    saveE2EAppData(initialData);
    return initialData;
  }

  try {
    return JSON.parse(storedData) as AppData;
  } catch {
    const initialData = createInitialE2EData(defaultData);
    saveE2EAppData(initialData);
    return initialData;
  }
}

export function saveE2EAppData(data: AppData): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(E2E_APP_DATA_STORAGE_KEY, JSON.stringify(data));
}
