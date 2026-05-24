// ゲーミフィケーション関連の型定義

// ========================================
// ストリーク情報
// ========================================

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  streakStartDate?: string; // YYYY-MM-DD
}

// ========================================
// レベル情報
// ========================================

export interface LevelInfo {
  level: number;
  currentXP: number;
  totalXP: number;
  xpToNextLevel: number;
}

// ========================================
// バッジ
// ========================================

// バッジの種類
export type BadgeType =
  // ストリーク系
  | 'streak-3'
  | 'streak-7'
  | 'streak-30'
  | 'streak-100'
  // 正解数系
  | 'correct-10'
  | 'correct-50'
  | 'correct-100'
  | 'correct-500'
  // カテゴリマスタリー
  | 'master-basics'
  | 'master-roasting'
  | 'master-brewing'
  | 'master-history'
  // パーフェクト
  | 'perfect-session'
  | 'perfect-week'
  // その他
  | 'first-quiz'
  | 'early-bird'
  | 'night-owl'
  | 'speed-demon';

// 獲得バッジ
export interface EarnedBadge {
  type: BadgeType;
  earnedAt: string; // ISO 8601
}

// バッジ定義
export interface BadgeDefinition {
  type: BadgeType;
  name: string;
  description: string;
  icon: string; // emoji
  requirement: string;
}

// バッジ定義リスト
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ストリーク系
  {
    type: 'streak-3',
    name: '3日連続',
    description: '3日連続でクイズに挑戦',
    icon: '🔥',
    requirement: '3日連続ログイン',
  },
  { type: 'streak-7', name: '1週間', description: '7日連続でクイズに挑戦', icon: '🔥', requirement: '7日連続ログイン' },
  {
    type: 'streak-30',
    name: '1ヶ月',
    description: '30日連続でクイズに挑戦',
    icon: '🔥',
    requirement: '30日連続ログイン',
  },
  {
    type: 'streak-100',
    name: '100日達成',
    description: '100日連続でクイズに挑戦',
    icon: '💯',
    requirement: '100日連続ログイン',
  },
  // 正解数系
  { type: 'correct-10', name: '10問正解', description: '累計10問正解', icon: '✅', requirement: '累計10問正解' },
  { type: 'correct-50', name: '50問正解', description: '累計50問正解', icon: '✅', requirement: '累計50問正解' },
  { type: 'correct-100', name: '100問正解', description: '累計100問正解', icon: '🎯', requirement: '累計100問正解' },
  { type: 'correct-500', name: '500問正解', description: '累計500問正解', icon: '🏆', requirement: '累計500問正解' },
  // カテゴリマスタリー
  {
    type: 'master-basics',
    name: '基礎マスター',
    description: '基礎知識を20問マスター',
    icon: '☕',
    requirement: '基礎カテゴリ20問マスター',
  },
  {
    type: 'master-roasting',
    name: '焙煎マスター',
    description: '焙煎理論を20問マスター',
    icon: '🫘',
    requirement: '焙煎カテゴリ20問マスター',
  },
  {
    type: 'master-brewing',
    name: '抽出マスター',
    description: '抽出理論を20問マスター',
    icon: '☕',
    requirement: '抽出カテゴリ20問マスター',
  },
  {
    type: 'master-history',
    name: '歴史マスター',
    description: '歴史と文化を20問マスター',
    icon: '📚',
    requirement: '歴史カテゴリ20問マスター',
  },
  // パーフェクト
  {
    type: 'perfect-session',
    name: 'パーフェクト',
    description: '1セッション全問正解',
    icon: '⭐',
    requirement: '10問連続正解',
  },
  {
    type: 'perfect-week',
    name: 'パーフェクトウィーク',
    description: '1週間全問正解',
    icon: '🌟',
    requirement: '1週間のクイズで全問正解',
  },
  // その他
  { type: 'first-quiz', name: '初挑戦', description: '初めてクイズに挑戦', icon: '🎉', requirement: '初回クイズ完了' },
  {
    type: 'early-bird',
    name: 'アーリーバード',
    description: '朝6時前にクイズ',
    icon: '🌅',
    requirement: '午前6時前にクイズ完了',
  },
  {
    type: 'night-owl',
    name: 'ナイトオウル',
    description: '深夜0時以降にクイズ',
    icon: '🦉',
    requirement: '午前0時以降にクイズ完了',
  },
  {
    type: 'speed-demon',
    name: 'スピードデーモン',
    description: '10問を2分以内に回答',
    icon: '⚡',
    requirement: '10問を2分以内に完了',
  },
];

// ========================================
// デイリーゴール
// ========================================

export interface DailyGoal {
  date: string; // YYYY-MM-DD
  targetQuestions: number;
  completedQuestions: number;
  correctAnswers: number;
  xpEarned: number;
}

// ========================================
// XP・レベル計算用の定数
// ========================================

export const XP_CONFIG = {
  baseXPCorrect: 10,
  baseXPIncorrect: 2,
  difficultyMultiplier: {
    beginner: 1.0,
    intermediate: 1.5,
    advanced: 2.0,
  },
  speedBonus: {
    fast: 5, // 5秒以内
    normal: 2, // 10秒以内
    slow: 0, // 10秒超
  },
  firstTimeBonus: 5,
  streakMultiplierPerCorrect: 0.1, // 連続正解ごとに+10%
  maxStreakMultiplier: 2.0, // 最大2倍
} as const;

export const LEVEL_CONFIG = {
  baseXP: 50,
  exponent: 1.5,
  maxLevel: 100,
} as const;

// ========================================
// 初期値
// ========================================

export const INITIAL_STREAK_INFO: StreakInfo = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: '',
};

export const INITIAL_LEVEL_INFO: LevelInfo = {
  level: 1,
  currentXP: 0,
  totalXP: 0,
  xpToNextLevel: 50,
};
