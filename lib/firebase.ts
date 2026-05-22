import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { getFirestore } from 'firebase/firestore';
import { initializeRoastPlusAppCheck } from './appCheck';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebaseが既に初期化されている場合は既存のインスタンスを使用
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

declare global {
  interface Window {
    __ROASTPLUS_FUNCTIONS_EMULATOR_CONNECTED__?: boolean;
  }
}

const functionsInstance = getFunctions(app);

initializeRoastPlusAppCheck(app);

if (
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR === 'true' &&
  !window.__ROASTPLUS_FUNCTIONS_EMULATOR_CONNECTED__
) {
  const host = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST || '127.0.0.1';
  const port = Number(process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT || '5001');

  connectFunctionsEmulator(functionsInstance, host, port);
  window.__ROASTPLUS_FUNCTIONS_EMULATOR_CONNECTED__ = true;
}

export const auth = getAuth(app);
export const functions = functionsInstance;
export const db = getFirestore(app);
export default app;

