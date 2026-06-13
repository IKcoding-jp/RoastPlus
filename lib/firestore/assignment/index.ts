// lib/firestore/assignment バレルエクスポート（issue #543）

// コレクション参照
export { getAssignmentDaysCollection, getShuffleEventsCollection, getShuffleHistoryCollection } from './references';

// 汎用ロジック・定数
export {
  toMillisSafe,
  DEFAULT_SHUFFLE_SETTINGS,
  normalizeAssignmentsForDate,
  sortAssignmentsStable,
  areAssignmentsEqual,
} from './helpers';

// 設定管理（テーブル/シャッフル/管理者/ペア除外）
export {
  subscribeTableSettings,
  updateTableSettings,
  subscribeShuffleSettings,
  updateShuffleSettings,
  subscribeManager,
  setManager,
  deleteManager,
  subscribePairExclusions,
  addPairExclusion,
  deletePairExclusion,
} from './settings';

// マスタデータ管理（チーム/メンバー/作業ラベル）
export {
  fetchTeams,
  fetchMembers,
  fetchTaskLabels,
  updateMemberExclusions,
  updateMemberTeam,
  addTeam,
  deleteTeam,
  updateTeam,
  addMember,
  deleteMember,
  updateMember,
  addTaskLabel,
  deleteTaskLabel,
  updateTaskLabel,
} from './masterData';

// 購読・保存のエラー通知基盤は ./sync に置く。
// 消費者が現れる #546 で、各消費者の import に合わせてここへ再エクスポートを追加する
// （未消費の API をバレルに先出しすると knip が未使用検出するため、消費と同時に公開する）。
