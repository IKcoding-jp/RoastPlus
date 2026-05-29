/**
 * 通知・アラーム機能
 * Web Notifications APIを使用
 */

import { isE2EMode } from './e2eMode';

/**
 * 通知権限をリクエスト
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (isE2EMode()) {
    return false;
  }

  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('Notification permission has been denied');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

/**
 * 通知を表示
 *
 * @param title 通知のタイトル
 * @param options 通知のオプション
 */
export async function showNotification(title: string, options?: NotificationOptions): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.warn('Notification permission not granted');
      return;
    }

    const notification = new Notification(title, {
      body: options?.body || '通知',
      icon: options?.icon || '/icon-192x192.png',
      badge: options?.badge || '/icon-192x192.png',
      tag: options?.tag || 'notification',
      requireInteraction: options?.requireInteraction !== false,
      ...options,
    });

    // 通知をクリックしたら閉じる
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // 5秒後に自動的に閉じる
    setTimeout(() => {
      notification.close();
    }, 5000);
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}
