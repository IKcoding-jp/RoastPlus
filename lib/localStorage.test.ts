import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  setSelectedMemberId,
  getSelectedMemberId,
  getDeviceId,
  setLast46Taste,
  getLast46Taste,
  setLast46Strength,
  getLast46Strength,
} from './localStorage';

// localStorageのモック
const createLocalStorageMock = () => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };
};

describe('localStorage', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('メンバーID管理', () => {
    it('メンバーIDを保存できる', () => {
      setSelectedMemberId('user-123');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('roastplus_selected_member_id', 'user-123');
    });

    it('メンバーIDを取得できる', () => {
      localStorageMock.setItem('roastplus_selected_member_id', 'user-456');

      const memberId = getSelectedMemberId();
      expect(memberId).toBe('user-456');
    });

    it('メンバーIDがnullの場合は削除される', () => {
      setSelectedMemberId('user-123');
      setSelectedMemberId(null);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('roastplus_selected_member_id');
    });

    it('メンバーIDが存在しない場合はnullを返す', () => {
      const memberId = getSelectedMemberId();
      expect(memberId).toBeNull();
    });
  });

  describe('デバイスID', () => {
    it('既存のデバイスIDを取得できる', () => {
      localStorageMock.setItem('roastplus_device_id', 'device_existing_abc123');

      const deviceId = getDeviceId();
      expect(deviceId).toBe('device_existing_abc123');
    });

    it('デバイスIDが存在しない場合は新規生成される', () => {
      const deviceId = getDeviceId();

      expect(deviceId).toMatch(/^device_\d+_[a-z0-9]+$/);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('生成されたデバイスIDは保存される', () => {
      const deviceId1 = getDeviceId();
      const deviceId2 = getDeviceId();

      // 2回目は同じIDを返す（再生成されない）
      expect(deviceId1).toBe(deviceId2);
    });

    it('デバイスIDは一意である', () => {
      // キャッシュをクリアして複数回生成
      localStorageMock.clear();
      const id1 = getDeviceId();

      localStorageMock.clear();
      const id2 = getDeviceId();

      localStorageMock.clear();
      const id3 = getDeviceId();

      // すべて異なることを確認
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });
  });

  describe('4:6メソッド - 味わい', () => {
    it('味わい選択を保存できる', () => {
      setLast46Taste('さっぱり');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('roastplus_last_46_taste', 'さっぱり');
    });

    it('味わい選択を取得できる', () => {
      localStorageMock.setItem('roastplus_last_46_taste', '濃厚');

      const taste = getLast46Taste();
      expect(taste).toBe('濃厚');
    });

    it('味わい選択がnullの場合は削除される', () => {
      setLast46Taste(null);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('roastplus_last_46_taste');
    });

    it('味わい選択が存在しない場合はnullを返す', () => {
      const taste = getLast46Taste();
      expect(taste).toBeNull();
    });
  });

  describe('4:6メソッド - 濃度', () => {
    it('濃度選択を保存できる', () => {
      setLast46Strength('濃いめ');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('roastplus_last_46_strength', '濃いめ');
    });

    it('濃度選択を取得できる', () => {
      localStorageMock.setItem('roastplus_last_46_strength', '薄め');

      const strength = getLast46Strength();
      expect(strength).toBe('薄め');
    });

    it('濃度選択がnullの場合は削除される', () => {
      setLast46Strength(null);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('roastplus_last_46_strength');
    });

    it('濃度選択が存在しない場合はnullを返す', () => {
      const strength = getLast46Strength();
      expect(strength).toBeNull();
    });
  });

  describe('実際のユースケース', () => {
    it('ユーザーがメンバーを選択して保存', () => {
      setSelectedMemberId('member-abc-123');
      const retrieved = getSelectedMemberId();

      expect(retrieved).toBe('member-abc-123');
    });

    it('4:6メソッドの前回選択を記憶', () => {
      setLast46Taste('さっぱり');
      setLast46Strength('濃いめ');

      const taste = getLast46Taste();
      const strength = getLast46Strength();

      expect(taste).toBe('さっぱり');
      expect(strength).toBe('濃いめ');
    });

    it('デバイスIDは初回アクセス時に自動生成される', () => {
      const deviceId = getDeviceId();

      expect(deviceId).toMatch(/^device_/);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('roastplus_device_id', deviceId);
    });
  });
});
