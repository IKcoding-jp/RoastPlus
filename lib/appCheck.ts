import type { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';


interface AppCheckOptions {
  siteKey?: string;
}

declare global {
  interface Window {
    __ROASTPLUS_APP_CHECK_INITIALIZED__?: boolean;
  }
}

function getRecaptchaSiteKey(siteKey?: string): string {
  return (siteKey ?? process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? String()).trim();
}

export function initializeRoastPlusAppCheck(app: FirebaseApp, options: AppCheckOptions = {}): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR === 'true') {
    return;
  }

  if (window.__ROASTPLUS_APP_CHECK_INITIALIZED__) {
    return;
  }

  const siteKey = getRecaptchaSiteKey(options.siteKey);
  if (!siteKey) {
    return;
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  window.__ROASTPLUS_APP_CHECK_INITIALIZED__ = true;
}
