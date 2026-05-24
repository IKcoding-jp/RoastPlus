import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  setSelectedMemberId,
  getSelectedMemberId,
  setRoastTimerState,
  getRoastTimerState,
  setRoastTimerSettings,
  getRoastTimerSettings,
  getDeviceId,
  setLast46Taste,
  getLast46Taste,
  setLast46Strength,
  getLast46Strength,
  setQuizProgress,
  getQuizProgress,
  exportQuizProgress,
  importQuizProgress,
} from './localStorage';
import type { RoastTimerSettings, RoastTimerState } from '@/types';
import type { QuizProgress } from '@/lib/coffee-quiz/types';

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

const createRoastTimerState = (overrides: Partial<RoastTimerState> = {}): RoastTimerState => ({
  status: 'idle',
  duration: 180,
  elapsed: 0,
  remaining: 180,
  startedAt: '2024-01-01T00:00:00.000Z',
  lastUpdatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const createQuizProgress = (overrides: Partial<QuizProgress> = {}): QuizProgress => ({
  userId: 'user-123',
  cards: [],
  checkmarks: [],
  streak: {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: '2024-01-01',
  },
  level: {
    level: 1,
    currentXP: 0,
    totalXP: 0,
    xpToNextLevel: 50,
  },
  earnedBadges: [],
  dailyGoals: [],
  settings: {
    dailyGoal: 10,
    enabledCategories: ['basics', 'roasting', 'brewing', 'history'],
    soundEnabled: true,
    vibrationEnabled: true,
    showExplanation: true,
  },
  stats: {
    totalQuestions: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    averageAccuracy: 0,
    categoryStats: {
      basics: { total: 0, correct: 0, accuracy: 0, masteredCount: 0 },
      roasting: { total: 0, correct: 0, accuracy: 0, masteredCount: 0 },
      brewing: { total: 0, correct: 0, accuracy: 0, masteredCount: 0 },
      history: { total: 0, correct: 0, accuracy: 0, masteredCount: 0 },
    },
    difficultyStats: {
      beginner: { total: 0, correct: 0, accuracy: 0 },
      intermediate: { total: 0, correct: 0, accuracy: 0 },
      advanced: { total: 0, correct: 0, accuracy: 0 },
    },
    weeklyActivity: [],
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

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

  describe('ローストタイマー状態', () => {
    it('タイマー状態を保存できる（バージョニング付き）', () => {
      const state = createRoastTimerState({
        status: 'running',
        elapsed: 60,
        remaining: 120,
      });

      setRoastTimerState(state);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'roastplus_roast_timer_state',
        JSON.stringify({ version: 1, state })
      );
    });

    it('バージョニング付きタイマー状態を取得できる', () => {
      const state = createRoastTimerState({
        status: 'paused',
        elapsed: 120,
        remaining: 60,
      });

      localStorageMock.setItem('roastplus_roast_timer_state', JSON.stringify({ version: 1, state }));

      const retrieved = getRoastTimerState();
      expect(retrieved).toEqual(state);
    });

    it('レガシーデータ（version未設定）を取得できる', () => {
      const state = createRoastTimerState({
        status: 'paused',
        elapsed: 120,
        remaining: 60,
      });

      localStorageMock.setItem('roastplus_roast_timer_state', JSON.stringify(state));

      const retrieved = getRoastTimerState();
      expect(retrieved).toEqual(state);
    });

    it('タイマー状態がnullの場合は削除される', () => {
      setRoastTimerState(null);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('roastplus_roast_timer_state');
    });

    it('タイマー状態がundefinedの場合は削除される', () => {
      setRoastTimerState(undefined);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('roastplus_roast_timer_state');
    });

    it('無効なJSONの場合はnullを返す', () => {
      localStorageMock.setItem('roastplus_roast_timer_state', 'invalid json');

      const state = getRoastTimerState();
      expect(state).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('ローストタイマー設定', () => {
    it('タイマー設定を保存できる（バージョニング付き）', () => {
      const settings: RoastTimerSettings = {
        timerSoundEnabled: true,
        timerSoundFile: '/sounds/alarm.mp3',
        timerSoundVolume: 1,
        notificationSoundEnabled: true,
        notificationSoundFile: '/sounds/notification.mp3',
        notificationSoundVolume: 0.8,
        settingsVersion: 1,
      };

      setRoastTimerSettings(settings);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'roastplus_roast_timer_settings',
        JSON.stringify({ version: 1, settings })
      );
    });

    it('バージョニング付きタイマー設定を取得できる', () => {
      const settings: RoastTimerSettings = {
        timerSoundEnabled: false,
        timerSoundFile: '/sounds/bell.mp3',
        timerSoundVolume: 0.5,
        notificationSoundEnabled: false,
        notificationSoundFile: '/sounds/chime.mp3',
        notificationSoundVolume: 0.3,
        settingsVersion: 1,
      };

      localStorageMock.setItem('roastplus_roast_timer_settings', JSON.stringify({ version: 1, settings }));

      const retrieved = getRoastTimerSettings();
      expect(retrieved).toEqual(settings);
    });

    it('レガシーデータ（version未設定）を取得できる', () => {
      const settings: RoastTimerSettings = {
        timerSoundEnabled: false,
        timerSoundFile: '/sounds/bell.mp3',
        timerSoundVolume: 0.5,
        notificationSoundEnabled: false,
        notificationSoundFile: '/sounds/chime.mp3',
        notificationSoundVolume: 0.3,
        settingsVersion: 1,
      };

      localStorageMock.setItem('roastplus_roast_timer_settings', JSON.stringify(settings));

      const retrieved = getRoastTimerSettings();
      expect(retrieved).toEqual(settings);
    });

    it('タイマー設定がnullの場合は削除される', () => {
      setRoastTimerSettings(null);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('roastplus_roast_timer_settings');
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

  describe('クイズ進捗 - 基本操作', () => {
    it('クイズ進捗を保存できる', () => {
      const progress = createQuizProgress({
        userId: 'user-123',
        level: {
          level: 5,
          currentXP: 500,
          totalXP: 1000,
          xpToNextLevel: 500,
        },
        streak: {
          currentStreak: 3,
          longestStreak: 3,
          lastActiveDate: '2024-01-15',
        },
      });

      setQuizProgress(progress);

      const saved = localStorageMock.setItem.mock.calls[0];
      expect(saved[0]).toBe('roastplus_quiz_progress');

      const savedData = JSON.parse(saved[1] as string);
      expect(savedData.version).toBe(1);
      expect(savedData.progress).toEqual(progress);
    });

    it('クイズ進捗を取得できる', () => {
      const progress = createQuizProgress({
        userId: 'user-456',
        level: {
          level: 10,
          currentXP: 1200,
          totalXP: 2000,
          xpToNextLevel: 800,
        },
        streak: {
          currentStreak: 7,
          longestStreak: 7,
          lastActiveDate: '2024-01-20',
        },
      });

      const stored = {
        version: 1,
        progress,
      };

      localStorageMock.setItem('roastplus_quiz_progress', JSON.stringify(stored));

      const retrieved = getQuizProgress();
      expect(retrieved).toEqual(progress);
    });

    it('クイズ進捗がnullの場合は削除される', () => {
      setQuizProgress(null);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('roastplus_quiz_progress');
    });

    it('バージョンが一致しない場合はnullを返す', () => {
      const stored = {
        version: 0, // 古いバージョン
        progress: { userId: 'user-123' },
      };

      localStorageMock.setItem('roastplus_quiz_progress', JSON.stringify(stored));

      const retrieved = getQuizProgress();
      expect(retrieved).toBeNull();
    });

    it('無効なJSONの場合はnullを返す', () => {
      localStorageMock.setItem('roastplus_quiz_progress', 'invalid json');

      const progress = getQuizProgress();
      expect(progress).toBeNull();
    });
  });

  describe('クイズ進捗 - エクスポート', () => {
    it('クイズ進捗をエクスポートできる', () => {
      const progress = createQuizProgress({
        userId: 'user-789',
        level: {
          level: 15,
          currentXP: 2000,
          totalXP: 3000,
          xpToNextLevel: 1000,
        },
        earnedBadges: [
          { type: 'first-quiz', earnedAt: '2024-01-10T00:00:00.000Z' },
          { type: 'streak-7', earnedAt: '2024-01-20T00:00:00.000Z' },
        ],
        streak: {
          currentStreak: 14,
          longestStreak: 14,
          lastActiveDate: '2024-01-25',
        },
      });

      setQuizProgress(progress);

      const exported = exportQuizProgress();
      expect(exported).not.toBeNull();

      const parsed = JSON.parse(exported!);
      expect(parsed.version).toBe(1);
      expect(parsed.progress).toEqual(progress);
      expect(parsed.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('進捗が存在しない場合はnullを返す', () => {
      const exported = exportQuizProgress();
      expect(exported).toBeNull();
    });

    it('エクスポートされたJSONは整形されている（インデント付き）', () => {
      const progress = createQuizProgress({
        userId: 'user-test',
        level: {
          level: 1,
          currentXP: 50,
          totalXP: 100,
          xpToNextLevel: 50,
        },
      });

      setQuizProgress(progress);

      const exported = exportQuizProgress();
      expect(exported).toContain('\n'); // 改行が含まれている
      expect(exported).toContain('  '); // インデントが含まれている
    });
  });

  describe('クイズ進捗 - インポート', () => {
    it('有効なJSONをインポートできる', () => {
      const progress = createQuizProgress({
        userId: 'user-import',
        level: {
          level: 20,
          currentXP: 3500,
          totalXP: 5000,
          xpToNextLevel: 1500,
        },
        earnedBadges: [{ type: 'master-basics', earnedAt: '2024-02-01T00:00:00.000Z' }],
        streak: {
          currentStreak: 30,
          longestStreak: 30,
          lastActiveDate: '2024-02-01',
        },
      });

      const exportedData = {
        exportedAt: new Date().toISOString(),
        version: 1,
        progress,
      };

      const result = importQuizProgress(JSON.stringify(exportedData));

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const imported = getQuizProgress();
      expect(imported).toEqual(progress);
    });

    it('バージョンが一致しない場合はエラーを返す', () => {
      const exportedData = {
        exportedAt: new Date().toISOString(),
        version: 999, // 不正なバージョン
        progress: { userId: 'user-test' },
      };

      const result = importQuizProgress(JSON.stringify(exportedData));

      expect(result.success).toBe(false);
      expect(result.error).toContain('バージョンが一致しません');
    });

    it('無効なJSON形式の場合はエラーを返す', () => {
      const result = importQuizProgress('invalid json');

      expect(result.success).toBe(false);
      expect(result.error).toBe('JSONの解析に失敗しました');
    });

    it('必須フィールドが欠けている場合はエラーを返す', () => {
      const exportedData = {
        exportedAt: new Date().toISOString(),
        version: 1,
        progress: null, // progressが無効
      };

      const result = importQuizProgress(JSON.stringify(exportedData));

      expect(result.success).toBe(false);
      expect(result.error).toBe('無効なデータ形式です');
    });

    it('userIdが欠けている場合はエラーを返す', () => {
      const exportedData = {
        exportedAt: new Date().toISOString(),
        version: 1,
        progress: {
          // userIdが無い
          totalXP: 100,
          level: 1,
        },
      };

      const result = importQuizProgress(JSON.stringify(exportedData));

      expect(result.success).toBe(false);
      expect(result.error).toBe('無効なデータ形式です');
    });
  });

  describe('実際のユースケース', () => {
    it('ユーザーがメンバーを選択して保存', () => {
      setSelectedMemberId('member-abc-123');
      const retrieved = getSelectedMemberId();

      expect(retrieved).toBe('member-abc-123');
    });

    it('タイマーを開始して状態を保存（バージョニング経由）', () => {
      const state = createRoastTimerState({
        status: 'running',
        startedAt: new Date().toISOString(),
      });

      setRoastTimerState(state);
      const retrieved = getRoastTimerState();

      expect(retrieved?.status).toBe('running');
      expect(retrieved?.elapsed).toBe(0);
    });

    it('クイズ進捗をエクスポートして別端末でインポート', () => {
      // 端末Aでエクスポート
      const progressA = createQuizProgress({
        userId: 'user-cross-device',
        level: {
          level: 50,
          currentXP: 5000,
          totalXP: 10000,
          xpToNextLevel: 5000,
        },
        earnedBadges: [{ type: 'streak-100', earnedAt: '2024-02-05T00:00:00.000Z' }],
        streak: {
          currentStreak: 100,
          longestStreak: 100,
          lastActiveDate: '2024-02-05',
        },
      });

      setQuizProgress(progressA);
      const exported = exportQuizProgress();

      // 端末Bでクリア＋インポート
      setQuizProgress(null);
      expect(getQuizProgress()).toBeNull();

      const result = importQuizProgress(exported!);
      expect(result.success).toBe(true);

      // 端末Bで進捗を確認
      const progressB = getQuizProgress();
      expect(progressB).toEqual(progressA);
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
