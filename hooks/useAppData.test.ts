import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppData } from './useAppData';
import type { AppData } from '@/types';

// モック関数
const mockUseAuth = vi.fn();
const mockGetUserData = vi.fn();
const mockSaveUserData = vi.fn();
const mockSubscribeUserData = vi.fn();

const INITIAL_APP_DATA: AppData = {
  todaySchedules: [],
  roastSchedules: [],
  tastingSessions: [],
  tastingRecords: [],
  notifications: [],
  encouragementCount: 0,
  dripRecipes: [],
};

const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
};

const mockUserData: AppData = {
  ...INITIAL_APP_DATA,
  roastSchedules: [
    {
      id: 'schedule-1',
      beanName: 'テスト豆',
      date: '2024-02-05',
      time: '09:00',
    },
  ],
};

// モック設定
vi.mock('@/lib/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/firestore', () => ({
  getUserData: (userId: string) => mockGetUserData(userId),
  saveUserData: (userId: string, data: AppData, options?: { updatedFields?: (keyof AppData)[] }) =>
    mockSaveUserData(userId, data, options),
  subscribeUserData: (userId: string, callback: (data: AppData) => void) => mockSubscribeUserData(userId, callback),
  SAVE_USER_DATA_DEBOUNCE_MS: 500,
}));

describe('useAppData', () => {
  let unsubscribeCallback: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-02-05T12:00:00.000Z'));

    unsubscribeCallback = vi.fn();

    // デフォルトのモック実装
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
    mockGetUserData.mockResolvedValue(mockUserData);
    mockSaveUserData.mockResolvedValue(undefined);
    mockSubscribeUserData.mockImplementation((userId, callback) => {
      // 購読を即座にトリガー
      setTimeout(() => callback(mockUserData), 0);
      return unsubscribeCallback;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('初期化', () => {
    it('認証ローディング中は初期データのまま', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });

      const { result } = renderHook(() => useAppData());

      expect(result.current.data).toEqual(INITIAL_APP_DATA);
      expect(result.current.isLoading).toBe(true);
    });

    it('ユーザーがいない場合は初期データに設定', async () => {
      mockUseAuth.mockReturnValue({ user: null, loading: false });

      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.data).toEqual(INITIAL_APP_DATA);
      expect(result.current.isLoading).toBe(false);
      expect(mockGetUserData).not.toHaveBeenCalled();
    });

    it('ユーザーがいる場合はFirestoreからデータを取得', async () => {
      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockGetUserData).toHaveBeenCalledWith('test-user-id');
      expect(result.current.data).toEqual(mockUserData);
      expect(result.current.isLoading).toBe(false);
    });

    it('データ取得エラーをハンドリング', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Firestore error');
      mockGetUserData.mockRejectedValue(error);

      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load initial data:', error);
      expect(result.current.isLoading).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('リアルタイム購読', () => {
    it('Firestoreの変更を購読する', async () => {
      renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSubscribeUserData).toHaveBeenCalledWith('test-user-id', expect.any(Function));
    });

    it('アンマウント時に購読を解除する', async () => {
      const { unmount } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      unmount();

      expect(unsubscribeCallback).toHaveBeenCalled();
    });

    it('購読で受信したデータを適用する', async () => {
      let subscriptionCallback: ((data: AppData) => void) | null = null;

      mockSubscribeUserData.mockImplementation((userId, callback) => {
        subscriptionCallback = callback;
        return unsubscribeCallback;
      });

      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      const updatedData: AppData = {
        ...mockUserData,
        roastSchedules: [
          ...mockUserData.roastSchedules,
          {
            id: 'schedule-2',
            beanName: '新しい豆',
            date: '2024-02-10',
            time: '10:00',
          },
        ],
      };

      act(() => {
        subscriptionCallback?.(updatedData);
      });

      expect(result.current.data.roastSchedules).toHaveLength(2);
    });
  });

  describe('updateData', () => {
    it('データを更新できる', async () => {
      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      const newData: AppData = {
        ...mockUserData,
        encouragementCount: 5,
      };

      await act(async () => {
        await result.current.updateData(newData);
        await vi.runAllTimersAsync();
      });

      expect(mockSaveUserData).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          encouragementCount: 5,
        }),
        expect.objectContaining({ updatedFields: ['encouragementCount'] })
      );
      expect(result.current.data.encouragementCount).toBe(5);
    });

    it('保存対象フィールドを変更されたキーだけに絞る', async () => {
      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await act(async () => {
        await result.current.updateData((currentData) => ({
          ...currentData,
          encouragementCount: 7,
        }));
        await vi.runAllTimersAsync();
      });

      expect(mockSaveUserData).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          encouragementCount: 7,
          tastingSessions: [],
          tastingRecords: [],
        }),
        { updatedFields: ['encouragementCount'] }
      );
    });

    it('関数形式でデータを更新できる', async () => {
      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await act(async () => {
        await result.current.updateData((currentData) => ({
          ...currentData,
          encouragementCount: (currentData.encouragementCount ?? 0) + 1,
        }));
        await vi.runAllTimersAsync();
      });

      expect(result.current.data.encouragementCount).toBe(1);
    });

    it('ユーザーがいない場合は更新をスキップ', async () => {
      mockUseAuth.mockReturnValue({ user: null, loading: false });

      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await act(async () => {
        await result.current.updateData({ ...INITIAL_APP_DATA, encouragementCount: 5 });
      });

      expect(mockSaveUserData).not.toHaveBeenCalled();
    });

    it('ローディング中は更新をスキップ(データ消失防止)', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockGetUserData.mockImplementation(() => new Promise(() => {})); // 永遠にペンディング

      const { result } = renderHook(() => useAppData());

      // ローディング中に更新を試みる
      await act(async () => {
        await result.current.updateData({ ...mockUserData, encouragementCount: 5 });
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Cannot update data while loading. This prevents overwriting data with initial empty state.'
      );
      expect(mockSaveUserData).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('保存エラー時にデータを再取得する', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Save failed');
      mockSaveUserData.mockRejectedValue(error);

      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await act(async () => {
        await expect(
          result.current.updateData({ ...mockUserData, encouragementCount: 10 })
        ).rejects.toThrow('Save failed');
        await vi.runAllTimersAsync();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save data:', error);
      expect(mockGetUserData).toHaveBeenCalledTimes(2); // 初回読み込み + エラー後の再取得

      consoleErrorSpy.mockRestore();
    });
  });

  describe('データ消失防止', () => {
    it('ローカルに実データがあり受信データが空の場合はスキップ', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let subscriptionCallback: ((data: AppData) => void) | null = null;

      mockSubscribeUserData.mockImplementation((userId, callback) => {
        subscriptionCallback = callback;
        return unsubscribeCallback;
      });

      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // ローカルに実データがある状態
      expect(result.current.data.roastSchedules).toHaveLength(1);

      // 空のデータを受信
      const emptyData: AppData = INITIAL_APP_DATA;

      act(() => {
        subscriptionCallback?.(emptyData);
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Data loss prevention:'), expect.any(Object));

      // データが空に上書きされていないことを確認
      expect(result.current.data.roastSchedules).toHaveLength(1);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('applyIncomingSnapshot - ackタイムアウトとマージロジック', () => {
    it('ackタイムアウト時にlockedKeysをクリアしてサーバーデータを適用', async () => {
      let subscriptionCallback: ((data: AppData) => void) | null = null;

      mockSubscribeUserData.mockImplementation((_userId: string, callback: (data: AppData) => void) => {
        subscriptionCallback = callback;
        return unsubscribeCallback;
      });

      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // ローカルデータを更新してロックを作成
      await act(async () => {
        await result.current.updateData((current) => ({
          ...current,
          encouragementCount: 99,
        }));
      });

      // FIRESTORE_ACK_TIMEOUT_MS(1300ms = 500 + 800)以上経過させる
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await vi.runAllTimersAsync();
      });

      // サーバーから異なるデータが到着（ackタイムアウト発動）
      const serverData: AppData = {
        ...mockUserData,
        encouragementCount: 50,
      };

      act(() => {
        subscriptionCallback?.(serverData);
      });

      // タイムアウト後はサーバーデータが適用される
      expect(result.current.data.encouragementCount).toBe(50);
    });

    it('更新中にサーバーデータとローカルロックキーをマージする', async () => {
      let subscriptionCallback: ((data: AppData) => void) | null = null;

      mockSubscribeUserData.mockImplementation((_userId: string, callback: (data: AppData) => void) => {
        subscriptionCallback = callback;
        return unsubscribeCallback;
      });

      // saveUserDataを遅延させてpendingSaveCountを保持
      mockSaveUserData.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 5000)));

      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // ローカルデータを更新（保存中の状態を維持）
      act(() => {
        result.current.updateData((current) => ({
          ...current,
          encouragementCount: 42,
        }));
      });

      // サーバーから部分的に異なるデータが到着（lockedKeysの一部が不一致）
      const serverData: AppData = {
        ...mockUserData,
        encouragementCount: 10, // ローカルと異なる
        roastSchedules: [
          {
            id: 'schedule-new-from-server',
            beanName: 'サーバー豆',
            date: '2024-02-10',
            time: '10:00',
          },
        ],
      };

      act(() => {
        subscriptionCallback?.(serverData);
      });

      // ロックされたキー（encouragementCount）はローカル値を維持
      expect(result.current.data.encouragementCount).toBe(42);
      // ロックされていないキー（roastSchedules）はサーバー値を適用
      expect(result.current.data.roastSchedules[0].id).toBe('schedule-new-from-server');
    });

    it('lockedKeys全てがサーバーと一致する場合ロックをクリア', async () => {
      let subscriptionCallback: ((data: AppData) => void) | null = null;

      mockSubscribeUserData.mockImplementation((_userId: string, callback: (data: AppData) => void) => {
        subscriptionCallback = callback;
        return unsubscribeCallback;
      });

      // saveUserDataを遅延させる
      mockSaveUserData.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 5000)));

      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // ローカルデータを更新
      act(() => {
        result.current.updateData((current) => ({
          ...current,
          encouragementCount: 42,
        }));
      });

      // サーバーからlockedKeyと一致するデータが到着（ack成功のシミュレーション）
      const serverData: AppData = {
        ...mockUserData,
        encouragementCount: 42, // ローカルと一致
      };

      act(() => {
        subscriptionCallback?.(serverData);
      });

      // サーバーデータがそのまま適用される（ロックが解除されたため）
      expect(result.current.data.encouragementCount).toBe(42);
    });
  });

  describe('updateData - リカバリエラーハンドリング', () => {
    it('保存失敗時に updateData が reject し、エラーがログされる', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const saveError = new Error('Save failed');
      mockSaveUserData.mockRejectedValue(saveError);

      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await act(async () => {
        await expect(
          result.current.updateData({ ...mockUserData, encouragementCount: 10 })
        ).rejects.toThrow('Save failed');
        await vi.runAllTimersAsync();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save data:', saveError);
      consoleErrorSpy.mockRestore();
    });

    it('保存失敗後の再取得も失敗した場合、両方のエラーがログされ reject する', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const saveError = new Error('Save failed');
      const recoveryError = new Error('Recovery also failed');
      mockSaveUserData.mockRejectedValue(saveError);

      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      mockGetUserData.mockRejectedValue(recoveryError);

      await act(async () => {
        await expect(
          result.current.updateData({ ...mockUserData, encouragementCount: 10 })
        ).rejects.toThrow('Save failed');
        await vi.runAllTimersAsync();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save data:', saveError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to recover data:', recoveryError);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('実際のユースケース', () => {
    it('完全なCRUDフロー', async () => {
      const { result } = renderHook(() => useAppData());

      // 1. 初期データ読み込み
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.data.roastSchedules).toHaveLength(1);

      // 2. データ追加
      await act(async () => {
        await result.current.updateData((current) => ({
          ...current,
          roastSchedules: [
            ...current.roastSchedules,
            {
              id: 'schedule-new',
              beanName: '追加された豆',
              date: '2024-02-10',
              time: '10:00',
            },
          ],
        }));
        await vi.runAllTimersAsync();
      });

      expect(result.current.data.roastSchedules).toHaveLength(2);

      // 3. データ更新
      await act(async () => {
        await result.current.updateData((current) => ({
          ...current,
          roastSchedules: current.roastSchedules.map((schedule) =>
            schedule.id === 'schedule-new' ? { ...schedule, beanName: '更新された豆' } : schedule
          ),
        }));
        await vi.runAllTimersAsync();
      });

      const updatedSchedule = result.current.data.roastSchedules.find((s) => s.id === 'schedule-new');
      expect(updatedSchedule?.beanName).toBe('更新された豆');

      // 4. データ削除
      await act(async () => {
        await result.current.updateData((current) => ({
          ...current,
          roastSchedules: current.roastSchedules.filter((schedule) => schedule.id !== 'schedule-new'),
        }));
        await vi.runAllTimersAsync();
      });

      expect(result.current.data.roastSchedules).toHaveLength(1);
    });

    it('ユーザー切り替え時にデータを再読み込み', async () => {
      const { rerender } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockGetUserData).toHaveBeenCalledWith('test-user-id');

      // ユーザーを切り替え
      const newUser = {
        uid: 'new-user-id',
        email: 'new@example.com',
        displayName: 'New User',
      };

      const newUserData: AppData = {
        ...INITIAL_APP_DATA,
        encouragementCount: 10,
      };

      mockUseAuth.mockReturnValue({ user: newUser, loading: false });
      mockGetUserData.mockResolvedValue(newUserData);

      rerender();

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockGetUserData).toHaveBeenCalledWith('new-user-id');
    });
  });
});
