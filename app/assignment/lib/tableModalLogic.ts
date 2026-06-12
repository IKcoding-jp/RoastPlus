import type { Assignment, Member, TaskLabel, Team } from '@/types';

export const formatTeamTitle = (teamName?: string): string => {
  const trimmedName = teamName?.trim() ?? '';
  return trimmedName.length > 0 ? `${trimmedName}班` : '';
};

export const buildAssignmentModalTitle = (
  teams: Team[],
  taskLabels: TaskLabel[],
  teamId: string,
  taskLabelId: string
): string => {
  const team = teams.find((item) => item.id === teamId);
  const title = formatTeamTitle(team?.name);
  const label = taskLabels.find((item) => item.id === taskLabelId)?.leftLabel ?? '';
  return title ? `${title} - ${label}` : label;
};

export const isMemberExcludedFromTaskLabel = (
  members: Member[],
  memberId: string | null,
  taskLabelId: string
): boolean => {
  if (!memberId) return false;
  const member = members.find((item) => item.id === memberId);
  return member?.excludedTaskLabelIds.includes(taskLabelId) ?? false;
};

export const getAvailableMembers = (members: Member[], assignments: Assignment[]): Member[] => {
  const assignedMemberIds = new Set(
    assignments.flatMap((assignment) => (assignment.memberId ? [assignment.memberId] : []))
  );
  return members.filter((member) => !assignedMemberIds.has(member.id));
};

export const parseTableDimensionInput = (value: string, fallback: number): number => {
  return parseInt(value, 10) || fallback;
};

export const clampTableDimension = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const validateTableDimensionInput = (value: string, min: number, max: number): string | null => {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return `${min}〜${max}pxの数字を入力してください`;
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isFinite(parsedValue)) {
    return '数字で入力してください';
  }

  if (!Number.isInteger(parsedValue)) {
    return '整数で入力してください';
  }

  if (parsedValue < min) {
    return `${min}px以上にしてください`;
  }

  if (parsedValue > max) {
    return `${max}px以下にしてください`;
  }

  return null;
};

// セル位置だけが決まった「メンバー未割り当て」状態のAssignmentを作る。
// onUpdateMember はこの形を受け取り、第2引数のmemberIdで割り当てを更新する。
export const createEmptyAssignment = (teamId: string, taskLabelId: string): Assignment => ({
  teamId,
  taskLabelId,
  memberId: null,
  assignedDate: '',
});
