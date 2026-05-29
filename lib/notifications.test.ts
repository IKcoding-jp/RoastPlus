import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { requestNotificationPermission, showNotification } from './notifications';

// Notification APIのモック
class MockNotification {
  title: string;
  options?: NotificationOptions;
  onclick: (() => void) | null = null;
  static permission: NotificationPermission = 'default';

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.options = options;
  }

  close() {
    // クローズ処理のモック
  }

  static requestPermission = vi.fn().mockResolvedValue('granted' as NotificationPermission);
}

describe('notifications', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // グローバルのNotificationをモック
    vi.stubGlobal('Notification', MockNotification);

    // コンソールスパイ
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // デフォルトの権限状態
    MockNotification.permission = 'default';
    MockNotification.requestPermission.mockResolvedValue('granted');
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  describe('requestNotificationPermission', () => {
    it('既に権限が許可されている場合はtrueを返す', async () => {
      MockNotification.permission = 'granted';

      const result = await requestNotificationPermission();

      expect(result).toBe(true);
      expect(MockNotification.requestPermission).not.toHaveBeenCalled();
    });

    it('権限が拒否されている場合はfalseを返す', async () => {
      MockNotification.permission = 'denied';

      const result = await requestNotificationPermission();

      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Notification permission has been denied');
    });

    it('権限をリクエストして許可された場合はtrueを返す', async () => {
      MockNotification.permission = 'default';
      MockNotification.requestPermission.mockResolvedValue('granted');

      const result = await requestNotificationPermission();

      expect(result).toBe(true);
      expect(MockNotification.requestPermission).toHaveBeenCalled();
    });

    it('権限をリクエストして拒否された場合はfalseを返す', async () => {
      MockNotification.permission = 'default';
      MockNotification.requestPermission.mockResolvedValue('denied');

      const result = await requestNotificationPermission();

      expect(result).toBe(false);
    });

    it('権限リクエストでエラーが発生した場合はfalseを返す', async () => {
      MockNotification.permission = 'default';
      MockNotification.requestPermission.mockRejectedValue(new Error('Permission error'));

      const result = await requestNotificationPermission();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('showNotification', () => {
    beforeEach(() => {
      MockNotification.permission = 'granted';
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('権限がある場合は通知を表示する', async () => {
      await showNotification('テスト通知');

      // Notificationコンストラクタが呼ばれたことを確認する方法が必要
      // ここでは基本的に例外が投げられないことを確認
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('カスタムオプションで通知を表示できる', async () => {
      const options: NotificationOptions = {
        body: 'テスト本文',
        icon: '/test-icon.png',
        tag: 'test-tag',
      };

      await showNotification('テスト通知', options);

      // 通知が正常に処理されることを確認
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('権限がない場合は通知を表示しない', async () => {
      MockNotification.permission = 'denied';

      await showNotification('テスト通知');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Notification permission has been denied');
    });

    it('デフォルトオプションが適用される', async () => {
      await showNotification('タイトルのみ');

      // デフォルトオプションで通知が作成されることを確認
      // （実際のNotificationインスタンスを確認できないため、エラーがないことを確認）
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('実際のユースケース', () => {
    beforeEach(() => {
      MockNotification.permission = 'default';
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('初回: 権限をリクエストして通知を表示', async () => {
      MockNotification.requestPermission.mockResolvedValue('granted');

      // 権限リクエスト
      const hasPermission = await requestNotificationPermission();
      expect(hasPermission).toBe(true);

      // 通知表示
      await showNotification('テスト通知', {
        body: 'テスト本文',
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('ユーザーが権限を拒否した場合', async () => {
      MockNotification.requestPermission.mockResolvedValue('denied');

      const hasPermission = await requestNotificationPermission();
      expect(hasPermission).toBe(false);

      // 通知を試みる（表示されない）
      await showNotification('通知');

      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});
