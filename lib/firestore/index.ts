// lib/firestore barrel export
// 既存の import { xxx } from '@/lib/firestore' を維持するため、
// 全モジュールを再エクスポートする

export { getDb, getUserDocRef, removeUndefinedFields, normalizeAppData, defaultData } from './common';
export { getUserData, saveUserData, subscribeUserData, SAVE_USER_DATA_DEBOUNCE_MS } from './userData';
export { getDefectBeanMasterData, saveDefectBean, deleteDefectBean, updateDefectBeanSetting } from './defectBeans';
export {
  extractTargetAmount,
  extractUnitFromWeight,
  addWorkProgress,
  updateWorkProgress,
  updateWorkProgresses,
  deleteWorkProgress,
  addCompletedCountToWorkProgress,
  addProgressToWorkProgress,
  archiveWorkProgress,
  unarchiveWorkProgress,
  updateProgressHistoryEntry,
  deleteProgressHistoryEntry,
} from './workProgress';
export {
  RECENT_PRODUCTION_PACK_RECORDS_LIMIT,
  getProductionPackRecordsCollectionRef,
  getProductionPackRecordDocRef,
  getProductionPackRecordsByMonth,
  subscribeProductionPackRecord,
  subscribeRecentProductionPackRecords,
  saveProductionPackRecord,
  deleteProductionPackRecord,
} from './productionPackRecords';
