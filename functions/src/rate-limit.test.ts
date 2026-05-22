import { describe, expect, it, vi } from 'vitest';
import { getDefaultAdminApp, getUsageDocId, getUsageWindowId } from './rate-limit-helpers';

describe('getUsageWindowId', () => {
  it('指定したタイムゾーンの日付キーを返す', () => {
    const date = new Date('2026-05-21T15:30:00.000Z');

    expect(getUsageWindowId(date, 'Asia/Tokyo')).toBe('2026-05-22');
  });
});

describe('getUsageDocId', () => {
  it('uidと関数名をFirestoreのドキュメントID向けに安全化する', () => {
    const date = new Date('2026-05-22T00:00:00.000Z');

    expect(getUsageDocId('user/abc@example.com', 'ocrScheduleFromImage', date)).toBe(
      'user%2Fabc%40example.com_ocrScheduleFromImage_2026-05-22'
    );
  });
});

describe('getDefaultAdminApp', () => {
  it('デフォルトAdmin appがない場合だけ初期化する', () => {
    const defaultApp = { name: '[DEFAULT]' };
    const getApp = vi.fn(() => {
      const error = new Error('The default Firebase app does not exist.') as Error & { code?: string };
      error.code = 'app/no-app';
      throw error;
    });
    const initializeApp = vi.fn(() => defaultApp);

    expect(getDefaultAdminApp({ getApp, initializeApp })).toBe(defaultApp);
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });

  it('デフォルトAdmin appがある場合は既存appを使う', () => {
    const defaultApp = { name: '[DEFAULT]' };
    const getApp = vi.fn(() => defaultApp);
    const initializeApp = vi.fn();

    expect(getDefaultAdminApp({ getApp, initializeApp })).toBe(defaultApp);
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('app/no-app以外のエラーは握りつぶさない', () => {
    const error = new Error('permission denied');
    const getApp = vi.fn(() => {
      throw error;
    });
    const initializeApp = vi.fn();

    expect(() => getDefaultAdminApp({ getApp, initializeApp })).toThrow(error);
    expect(initializeApp).not.toHaveBeenCalled();
  });
});
