// lib/firestore/assignment バレルエクスポート（issue #543）

// コレクション参照
export {
  getTeamsCollection,
  getMembersCollection,
  getTaskLabelsCollection,
  getAssignmentDaysCollection,
  getShuffleEventsCollection,
  getShuffleHistoryCollection,
  getAssignmentSettingsCollection,
  getManagersCollection,
  getPairExclusionsCollection,
} from './references';

// 汎用ロジック・定数
export {
  toMillisSafe,
  DEFAULT_SHUFFLE_SETTINGS,
  DEFAULT_TABLE_SETTINGS,
  normalizeAssignmentsForDate,
  sortAssignmentsStable,
  areAssignmentsEqual,
} from './helpers';

// 購読・保存のエラー通知基盤
export { createSyncedSubscription, runWriteWithSync } from './sync';
