import type { TableSettings, Team } from '@/types';

const DEFAULT_TEAM_COLUMN_WIDTH = 140;
const EMPTY_TEAM_COLUMN_WIDTH = 160;
const DEFAULT_TASK_LABEL_COLUMN_WIDTH = 160;
const DEFAULT_NOTE_COLUMN_WIDTH = 160;

export function formatTeamTitle(teamName?: string) {
  return teamName && teamName.trim().length > 0 ? `${teamName.trim()}班` : '';
}

export function getDesktopGridTemplateColumns(teams: Team[], tableSettings: TableSettings | null) {
  const labelWidth = tableSettings?.colWidths?.taskLabel ?? DEFAULT_TASK_LABEL_COLUMN_WIDTH;
  const noteWidth = tableSettings?.colWidths?.note ?? DEFAULT_NOTE_COLUMN_WIDTH;

  if (teams.length === 0) {
    return `${labelWidth}px ${EMPTY_TEAM_COLUMN_WIDTH}px ${noteWidth}px`;
  }

  const teamColumns = teams
    .map((team) => {
      const width = tableSettings?.colWidths?.teams?.[team.id] ?? DEFAULT_TEAM_COLUMN_WIDTH;
      return `${width}px`;
    })
    .join(' ');

  return `${labelWidth}px ${teamColumns} ${noteWidth}px`;
}
