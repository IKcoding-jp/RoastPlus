import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FirebaseApp } from 'firebase/app';

const mockInitializeAppCheck = vi.fn();
const mockReCaptchaV3Provider = vi.fn(function MockProvider(this: { siteKey: string }, siteKey: string) {
  this.siteKey = siteKey;
});

const mockFirebaseApp: FirebaseApp = {
  name: '[DEFAULT]',
  options: {},
  automaticDataCollectionEnabled: false,
};

vi.mock('firebase/app-check', () => ({
  initializeAppCheck: (...args: unknown[]) => mockInitializeAppCheck(...args),
  ReCaptchaV3Provider: mockReCaptchaV3Provider,
}));

describe('initializeRoastPlusAppCheck', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    Object.defineProperty(window, '__ROASTPLUS_APP_CHECK_INITIALIZED__', {
      configurable: true,
      value: false,
      writable: true,
    });
  });

  it('サイトキーがある場合はApp Checkを初期化する', async () => {
    const { initializeRoastPlusAppCheck } = await import('./appCheck');
    const app = mockFirebaseApp;

    initializeRoastPlusAppCheck(app, { siteKey: 'site-key' });

    expect(mockReCaptchaV3Provider).toHaveBeenCalledWith('site-key');
    expect(mockInitializeAppCheck).toHaveBeenCalledWith(app, {
      provider: expect.objectContaining({ siteKey: 'site-key' }),
      isTokenAutoRefreshEnabled: true,
    });
    expect(window.__ROASTPLUS_APP_CHECK_INITIALIZED__).toBe(true);
  });

  it('環境変数のサイトキーでApp Checkを初期化する', async () => {
    vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', 'env-site-key');
    const { initializeRoastPlusAppCheck } = await import('./appCheck');

    initializeRoastPlusAppCheck(mockFirebaseApp);

    expect(mockReCaptchaV3Provider).toHaveBeenCalledWith('env-site-key');
    expect(mockInitializeAppCheck).toHaveBeenCalled();
  });

  it('サイトキーがない場合は初期化しない', async () => {
    const { initializeRoastPlusAppCheck } = await import('./appCheck');

    initializeRoastPlusAppCheck(mockFirebaseApp);

    expect(mockInitializeAppCheck).not.toHaveBeenCalled();
    expect(window.__ROASTPLUS_APP_CHECK_INITIALIZED__).toBe(false);
  });

  it('Functions Emulator利用時は初期化しない', async () => {
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR', 'true');
    const { initializeRoastPlusAppCheck } = await import('./appCheck');

    initializeRoastPlusAppCheck(mockFirebaseApp, { siteKey: 'site-key' });

    expect(mockInitializeAppCheck).not.toHaveBeenCalled();
  });

  it('すでに初期化済みなら二重初期化しない', async () => {
    window.__ROASTPLUS_APP_CHECK_INITIALIZED__ = true;
    const { initializeRoastPlusAppCheck } = await import('./appCheck');

    initializeRoastPlusAppCheck(mockFirebaseApp, { siteKey: 'site-key' });

    expect(mockInitializeAppCheck).not.toHaveBeenCalled();
  });
});
