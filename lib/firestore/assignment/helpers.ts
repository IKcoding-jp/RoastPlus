// assignment データ層の汎用ロジック（旧 app/assignment/lib/firebase/helpers.ts から移設）
// 挙動は変えず lib/firestore/ 系へ一本化する（issue #543）
import type { Assignment, TableSettings, ShuffleSettings, FirestoreTimestamp } from '@/types';

const assignmentKey = (teamId: string, taskLabelId: string) => `${teamId}__${taskLabelId}`;

// Firestore の時刻（Timestamp / ISO 文字列）をミリ秒に変換する。ソート用。
export const toMillisSafe = (value?: FirestoreTimestamp | null): number => {
  if (!value) return 0;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  const candidate = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
  if (typeof candidate.toMillis === 'function') {
    const result = candidate.toMillis();
    return typeof result === 'number' ? result : 0;
  }

  const seconds = typeof candidate.seconds === 'number' ? candidate.seconds : 0;
  const nanoseconds = typeof candidate.nanoseconds === 'number' ? candidate.nanoseconds : 0;
  return seconds * 1000 + Math.floor(nanoseconds / 1_000_000);
};

export const DEFAULT_SHUFFLE_SETTINGS: ShuffleSettings = {
  crossTeamShuffle: false,
  priority: 'pair',
};

export const DEFAULT_TABLE_SETTINGS: TableSettings = {
  colWidths: {
    taskLabel: 120,
    note: 120,
    teams: {},
  },
  rowHeights: {},
  headerLabels: {
    left: '担当',
    right: 'メモ',
  },
};

export const normalizeAssignmentsForDate = (assignments: Assignment[], date: string): Assignment[] => {
  const map = new Map<string, Assignment>();
  assignments.forEach((a) => {
    map.set(assignmentKey(a.teamId, a.taskLabelId), { ...a, assignedDate: date, memberId: a.memberId ?? null });
  });
  return Array.from(map.values());
};

export const sortAssignmentsStable = (assignments: Assignment[]) =>
  [...assignments].sort((a, b) => {
    const teamDiff = a.teamId.localeCompare(b.teamId);
    if (teamDiff !== 0) return teamDiff;
    return a.taskLabelId.localeCompare(b.taskLabelId);
  });

export const areAssignmentsEqual = (a: Assignment[], b: Assignment[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const aItem = a[i];
    const bItem = b[i];
    if (aItem.teamId !== bItem.teamId || aItem.taskLabelId !== bItem.taskLabelId || aItem.memberId !== bItem.memberId) {
      return false;
    }
  }
  return true;
};
