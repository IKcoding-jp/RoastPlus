// ローカルストレージ管理

const SELECTED_MEMBER_ID_KEY = 'roastplus_selected_member_id';
const DEVICE_ID_KEY = 'roastplus_device_id';
const LAST_46_TASTE_KEY = 'roastplus_last_46_taste';
const LAST_46_STRENGTH_KEY = 'roastplus_last_46_strength';

/**
 * 選択されたメンバーIDを保存
 */
export function setSelectedMemberId(memberId: string | null): void {
  if (typeof window === 'undefined') return;

  if (memberId === null) {
    localStorage.removeItem(SELECTED_MEMBER_ID_KEY);
  } else {
    localStorage.setItem(SELECTED_MEMBER_ID_KEY, memberId);
  }
}

/**
 * 選択されたメンバーIDを取得
 */
export function getSelectedMemberId(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem(SELECTED_MEMBER_ID_KEY);
}

/**
 * デバイスIDを取得（存在しない場合は生成）
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    // SSR時は一時的なIDを返す（実際には使用されない）
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    // デバイスIDが存在しない場合は生成
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

/**
 * 4:6メソッドの前回の味わい選択を保存
 */
export function setLast46Taste(taste: string | null): void {
  if (typeof window === 'undefined') return;

  if (taste === null) {
    localStorage.removeItem(LAST_46_TASTE_KEY);
  } else {
    localStorage.setItem(LAST_46_TASTE_KEY, taste);
  }
}

/**
 * 4:6メソッドの前回の味わい選択を取得
 */
export function getLast46Taste(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem(LAST_46_TASTE_KEY);
}

/**
 * 4:6メソッドの前回の濃度選択を保存
 */
export function setLast46Strength(strength: string | null): void {
  if (typeof window === 'undefined') return;

  if (strength === null) {
    localStorage.removeItem(LAST_46_STRENGTH_KEY);
  } else {
    localStorage.setItem(LAST_46_STRENGTH_KEY, strength);
  }
}

/**
 * 4:6メソッドの前回の濃度選択を取得
 */
export function getLast46Strength(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem(LAST_46_STRENGTH_KEY);
}
