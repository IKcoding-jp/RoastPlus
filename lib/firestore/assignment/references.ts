// assignment 配下のコレクション参照
// common.ts の getUserDocRef を土台にして、ユーザードキュメント参照の重複を解消する（issue #543）
import { collection } from 'firebase/firestore';
import { getUserDocRef } from '../common';

export function getTeamsCollection(userId: string) {
  return collection(getUserDocRef(userId), 'teams');
}

export function getMembersCollection(userId: string) {
  return collection(getUserDocRef(userId), 'members');
}

export function getTaskLabelsCollection(userId: string) {
  return collection(getUserDocRef(userId), 'taskLabels');
}

export function getAssignmentDaysCollection(userId: string) {
  return collection(getUserDocRef(userId), 'assignmentDays');
}

export function getShuffleEventsCollection(userId: string) {
  return collection(getUserDocRef(userId), 'shuffleEvents');
}

export function getShuffleHistoryCollection(userId: string) {
  return collection(getUserDocRef(userId), 'shuffleHistory');
}

export function getAssignmentSettingsCollection(userId: string) {
  return collection(getUserDocRef(userId), 'assignmentSettings');
}

export function getManagersCollection(userId: string) {
  return collection(getUserDocRef(userId), 'managers');
}

export function getPairExclusionsCollection(userId: string) {
  return collection(getUserDocRef(userId), 'pairExclusions');
}
