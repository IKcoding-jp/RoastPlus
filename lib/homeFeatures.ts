export const HOME_FEATURES = [
  {
    key: 'assignment',
    title: '担当表',
    description: '公平に担当を割り当て',
  },
  {
    key: 'schedule',
    title: 'スケジュール',
    description: '一日の予定を確認',
  },
  {
    key: 'tasting',
    title: '試飲感想記録',
    description: '試飲の感想を記録',
  },
  {
    key: 'roast-timer',
    title: 'ローストタイマー',
    description: '最適なタイマーで焙煎',
  },
  {
    key: 'defect-beans',
    title: 'コーヒー豆図鑑',
    description: '欠点豆の知識を共有',
  },
  {
    key: 'progress',
    title: '作業進捗',
    description: '進捗を可視化',
  },
  {
    key: 'drip-guide',
    title: 'ドリップガイド',
    description: '淹れ方の手順',
  },
  {
    key: 'coffee-trivia',
    title: 'コーヒークイズ',
    description: '楽しく学ぶコーヒー知識',
  },
  {
    key: 'dev-stories',
    title: '開発秘話',
    description: '開発の裏話を覗く',
  },
  {
    key: 'settings',
    title: 'その他',
    description: '設定やアプリ情報など',
  },
] as const;

export type HomeFeatureKey = typeof HOME_FEATURES[number]['key'];

export const HOME_FEATURE_KEYS = HOME_FEATURES.map((feature) => feature.key);

export const CONFIGURABLE_HOME_FEATURES = HOME_FEATURES.filter(
  (feature) => feature.key !== 'settings'
);

export const CONFIGURABLE_HOME_FEATURE_KEYS = CONFIGURABLE_HOME_FEATURES.map(
  (feature) => feature.key
);
