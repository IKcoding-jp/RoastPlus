import React from 'react';

import { Button } from '@/components/ui';
import type { Assignment, Member, TableSettings, TaskLabel, Team } from '@/types';

import type { HeightConfig } from './types';
import { isDraftTeam } from './desktopTableViewLayout';

type HeaderLabels = {
  left: string;
  right: string;
};

interface DesktopTableBodyProps {
  teams: Team[];
  taskLabels: TaskLabel[];
  assignments: Assignment[];
  members: Member[];
  tableSettings: TableSettings | null;
  selectedCell: { teamId: string; taskLabelId: string } | null;
  gridTemplateColumns: string;
  headerLabels: HeaderLabels;
  setHeightConfig: (config: HeightConfig | null) => void;
  handleCellTouchStart: (
    teamId: string,
    taskLabelId: string,
    memberId: string | null,
    event: React.TouchEvent | React.MouseEvent
  ) => void;
  handleCellTouchEnd: () => void;
  handleCellTouchMove: (event: React.TouchEvent | React.MouseEvent) => void;
  handleCellClick: (teamId: string, taskLabelId: string) => void;
}

export const DesktopTableBody: React.FC<DesktopTableBodyProps> = ({
  teams,
  taskLabels,
  assignments,
  members,
  tableSettings,
  selectedCell,
  gridTemplateColumns,
  headerLabels,
  setHeightConfig,
  handleCellTouchStart,
  handleCellTouchEnd,
  handleCellTouchMove,
  handleCellClick,
}) => {
  const realTeams = teams.filter((team) => !isDraftTeam(team.id));
  const hasDraftTeam = teams.some((team) => isDraftTeam(team.id));

  return (
    <>
      {taskLabels.map((label) => (
        <div
          key={label.id}
          className="grid items-center transition-colors group hover:bg-ground/50"
          style={{
            gridTemplateColumns,
            minHeight: `${tableSettings?.rowHeights?.[label.id] ?? 60}px`,
          }}
        >
          <div
            className="p-3 md:p-4 py-2 border-r h-full flex items-center justify-center border-edge cursor-pointer transition-colors hover:bg-ground"
            onClick={() => {
              setHeightConfig({
                taskLabelId: label.id,
                currentHeight: tableSettings?.rowHeights?.[label.id] ?? 60,
                label: `${headerLabels.left}の設定`,
                currentName: label.leftLabel,
                editMode: 'left',
                currentRightLabel: label.rightLabel || '',
              });
            }}
          >
            <div className="w-full p-1 font-medium text-sm md:text-base whitespace-nowrap text-center overflow-visible text-ink">
              {label.leftLabel}
            </div>
          </div>

          {!hasDraftTeam && realTeams.length === 0 ? (
            <div className="p-2 md:p-4 border-r h-full flex items-center justify-center border-edge bg-ground/30">
              <span className="text-xs md:text-sm text-ink-muted">班を作成してください</span>
            </div>
          ) : (
            teams.map((team) => {
              if (isDraftTeam(team.id)) {
                return (
                  <div
                    key={team.id}
                    className="p-2 md:p-4 py-2 border-r h-full flex items-center justify-center relative border-edge bg-ground/20"
                  >
                    <span className="text-xs md:text-sm text-ink-muted">未割当</span>
                  </div>
                );
              }

              const assignment = assignments.find((item) => item.teamId === team.id && item.taskLabelId === label.id);
              const member = members.find((item) => item.id === assignment?.memberId);
              const isSelected = selectedCell?.teamId === team.id && selectedCell?.taskLabelId === label.id;

              return (
                <div
                  key={team.id}
                  className="p-2 md:p-4 py-2 border-r h-full flex items-center justify-center relative border-edge"
                >
                  <Button
                    variant={isSelected ? (member ? 'primary' : 'outline') : 'surface'}
                    onMouseDown={(event) => handleCellTouchStart(team.id, label.id, member?.id || null, event)}
                    onMouseUp={handleCellTouchEnd}
                    onMouseMove={handleCellTouchMove}
                    onMouseLeave={handleCellTouchEnd}
                    onTouchStart={(event) => handleCellTouchStart(team.id, label.id, member?.id || null, event)}
                    onTouchEnd={handleCellTouchEnd}
                    onTouchMove={handleCellTouchMove}
                    onClick={() => handleCellClick(team.id, label.id)}
                    className={`
                                                min-h-0! w-full py-2 md:py-3 px-1 rounded-lg! text-sm md:text-base !font-bold text-center transition-all truncate select-none
                                                ${member && isSelected ? 'shadow-md scale-105' : ''} ${
                                                  !member && isSelected ? 'bg-surface! !border-spot' : ''
                                                } ${!member && !isSelected ? '!text-ink-muted !bg-ground !border-dashed border-edge-strong! hover:!bg-ground/80 !shadow-none' : ''}
                                            `}
                  >
                    {member ? member.name : '未割当'}
                  </Button>
                </div>
              );
            })
          )}

          <div
            className="p-3 md:p-4 py-2 border-l h-full flex items-center border-edge cursor-pointer transition-colors hover:bg-ground"
            onClick={() => {
              setHeightConfig({
                taskLabelId: label.id,
                currentHeight: tableSettings?.rowHeights?.[label.id] ?? 60,
                label: `${headerLabels.right}の設定`,
                currentName: label.rightLabel || '',
                editMode: 'right',
                currentRightLabel: label.leftLabel,
              });
            }}
          >
            <div className="w-full p-1 font-medium text-sm md:text-base whitespace-nowrap text-center overflow-visible text-ink">
              {label.rightLabel}
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
