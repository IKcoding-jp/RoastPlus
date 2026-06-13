// レガシー互換シム（issue #543）
// 汎用ヘルパーは lib/firestore/assignment/ へ移設済み。ここは既存 import を壊さないための再エクスポートのみ。
// このファイルへ新しいロジックを追加しない。後続 #544〜#546 で各消費者を新モジュール直参照へ移行し、
// 最終的に旧ディレクトリごと削除する。
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
  toMillisSafe,
  DEFAULT_SHUFFLE_SETTINGS,
  DEFAULT_TABLE_SETTINGS,
  normalizeAssignmentsForDate,
  sortAssignmentsStable,
  areAssignmentsEqual,
} from '@/lib/firestore/assignment';
