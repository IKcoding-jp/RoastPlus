import type { TableSettings, Team } from '@/types';

export const DEFAULT_TEAM_COLUMN_WIDTH = 150;
const SPARSE_TEAM_COLUMN_MIN_WIDTH = DEFAULT_TEAM_COLUMN_WIDTH * 2;
const DEFAULT_TASK_LABEL_COLUMN_WIDTH = 160;
const DEFAULT_NOTE_COLUMN_WIDTH = 160;

export const DRAFT_TEAM_ID = '__draft_team__';

export const isDraftTeam = (teamId: string): boolean => teamId === DRAFT_TEAM_ID;

export function getDesktopGridTemplateColumns(teams: Team[], tableSettings: TableSettings | null) {
  const labelWidth = tableSettings?.colWidths?.taskLabel ?? DEFAULT_TASK_LABEL_COLUMN_WIDTH;
  const noteWidth = tableSettings?.colWidths?.note ?? DEFAULT_NOTE_COLUMN_WIDTH;

  if (teams.length === 0) {
    return `${labelWidth}px ${SPARSE_TEAM_COLUMN_MIN_WIDTH}px ${noteWidth}px`;
  }

  if (teams.length === 1 && isDraftTeam(teams[0].id)) {
    return `${labelWidth}px ${SPARSE_TEAM_COLUMN_MIN_WIDTH}px ${noteWidth}px`;
  }

  const teamColumns = teams
    .map((team) => {
      const width = tableSettings?.colWidths?.teams?.[team.id] ?? DEFAULT_TEAM_COLUMN_WIDTH;
      const isDraft = isDraftTeam(team.id);
      const resolvedWidth = isDraft
        ? width
        : teams.length === 1
          ? Math.max(width, SPARSE_TEAM_COLUMN_MIN_WIDTH)
          : width;
      return `${resolvedWidth}px`;
    })
    .join(' ');

  return `${labelWidth}px ${teamColumns} ${noteWidth}px`;
}
