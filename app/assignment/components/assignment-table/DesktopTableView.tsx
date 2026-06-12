import React from 'react';

import { Card } from '@/components/ui';
import type { Assignment, Member, TableSettings, TaskLabel, Team } from '@/types';

import { DesktopTableBody } from './DesktopTableBody';
import { DesktopTableFooter } from './DesktopTableFooter';
import { DesktopTableHeader } from './DesktopTableHeader';
import { DRAFT_TEAM_ID, getDesktopGridTemplateColumns } from './desktopTableViewLayout';
import { DEFAULT_TABLE_SETTINGS, type HeightConfig, type WidthConfig } from './types';
import { MAX_TEAMS } from '../../lib/constants';

type DesktopTableViewProps = {
  teams: Team[];
  taskLabels: TaskLabel[];
  assignments: Assignment[];
  members: Member[];
  tableSettings: TableSettings | null;
  selectedCell: { teamId: string; taskLabelId: string } | null;
  // チーム関連
  isAddingTeam: boolean;
  setIsAddingTeam: (v: boolean) => void;
  newTeamName: string;
  setNewTeamName: (v: string) => void;
  handleAddTeam: () => Promise<void>;
  editingTeamId: string | null;
  editTeamName: string;
  setEditTeamName: (v: string) => void;
  handleUpdateTeam: (teamId: string) => Promise<void>;
  setActiveTeamActionId: (id: string | null) => void;
  setActiveTeamName: (name: string) => void;
  // ラベル関連
  newLeftLabel: string;
  setNewLeftLabel: (v: string) => void;
  newRightLabel: string;
  setNewRightLabel: (v: string) => void;
  handleAddTaskLabel: () => Promise<void>;
  // 設定
  setWidthConfig: (config: WidthConfig | null) => void;
  setHeightConfig: (config: HeightConfig | null) => void;
  // イベント
  handleCellTouchStart: (
    teamId: string,
    taskLabelId: string,
    memberId: string | null,
    e: React.TouchEvent | React.MouseEvent
  ) => void;
  handleCellTouchEnd: () => void;
  handleCellTouchMove: (e: React.TouchEvent | React.MouseEvent) => void;
  handleCellClick: (teamId: string, taskLabelId: string) => void;
  onShuffle: () => Promise<void>;
  isShuffleDisabled: boolean;
};

export const DesktopTableView: React.FC<DesktopTableViewProps> = ({
  teams,
  taskLabels,
  assignments,
  members,
  tableSettings,
  selectedCell,
  isAddingTeam,
  setIsAddingTeam,
  newTeamName,
  setNewTeamName,
  handleAddTeam,
  editingTeamId,
  editTeamName,
  setEditTeamName,
  handleUpdateTeam,
  setActiveTeamActionId,
  setActiveTeamName,
  newLeftLabel,
  setNewLeftLabel,
  newRightLabel,
  setNewRightLabel,
  handleAddTaskLabel,
  setWidthConfig,
  setHeightConfig,
  handleCellTouchStart,
  handleCellTouchEnd,
  handleCellTouchMove,
  handleCellClick,
  onShuffle,
  isShuffleDisabled,
}) => {
  const headerLabels = tableSettings?.headerLabels ?? DEFAULT_TABLE_SETTINGS.headerLabels;
  const displayTeams: Team[] =
    isAddingTeam && teams.length < MAX_TEAMS
      ? [
          ...teams,
          { id: DRAFT_TEAM_ID, name: '', order: (teams.length > 0 ? (teams[teams.length - 1].order ?? 0) : 0) + 1 },
        ]
      : teams;
  const gridTemplateColumns = getDesktopGridTemplateColumns(displayTeams, tableSettings);

  return (
    <Card variant="table" className="hidden md:block w-fit mx-auto max-w-full overflow-x-auto relative">
      <DesktopTableHeader
        teams={displayTeams}
        tableSettings={tableSettings}
        gridTemplateColumns={gridTemplateColumns}
        headerLabels={headerLabels}
        isAddingTeam={isAddingTeam}
        setIsAddingTeam={setIsAddingTeam}
        newTeamName={newTeamName}
        setNewTeamName={setNewTeamName}
        handleAddTeam={handleAddTeam}
        editingTeamId={editingTeamId}
        editTeamName={editTeamName}
        setEditTeamName={setEditTeamName}
        handleUpdateTeam={handleUpdateTeam}
        setActiveTeamActionId={setActiveTeamActionId}
        setActiveTeamName={setActiveTeamName}
        setWidthConfig={setWidthConfig}
      />

      <div className="divide-y divide-edge bg-surface" style={{ minWidth: 'max-content' }}>
        <DesktopTableBody
          teams={displayTeams}
          taskLabels={taskLabels}
          assignments={assignments}
          members={members}
          tableSettings={tableSettings}
          selectedCell={selectedCell}
          gridTemplateColumns={gridTemplateColumns}
          headerLabels={headerLabels}
          setHeightConfig={setHeightConfig}
          handleCellTouchStart={handleCellTouchStart}
          handleCellTouchEnd={handleCellTouchEnd}
          handleCellTouchMove={handleCellTouchMove}
          handleCellClick={handleCellClick}
        />

        <DesktopTableFooter
          teamsLength={displayTeams.length}
          taskLabelsLength={taskLabels.length}
          gridTemplateColumns={gridTemplateColumns}
          headerLabels={headerLabels}
          newLeftLabel={newLeftLabel}
          setNewLeftLabel={setNewLeftLabel}
          newRightLabel={newRightLabel}
          setNewRightLabel={setNewRightLabel}
          handleAddTaskLabel={handleAddTaskLabel}
          onShuffle={onShuffle}
          isShuffleDisabled={isShuffleDisabled}
        />
      </div>
    </Card>
  );
};
