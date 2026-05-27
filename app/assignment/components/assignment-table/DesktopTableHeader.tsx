import React from 'react';
import { MdAdd } from 'react-icons/md';

import { Button, IconButton, InlineInput } from '@/components/ui';
import type { TableSettings, Team } from '@/types';

import { MAX_TEAMS } from '../../lib/constants';
import type { WidthConfig } from './types';
import { formatTeamTitle } from './desktopTableViewLayout';

type HeaderLabels = {
  left: string;
  right: string;
};

interface DesktopTableHeaderProps {
  teams: Team[];
  tableSettings: TableSettings | null;
  gridTemplateColumns: string;
  headerLabels: HeaderLabels;
  isAddingTeam: boolean;
  setIsAddingTeam: (value: boolean) => void;
  newTeamName: string;
  setNewTeamName: (value: string) => void;
  handleAddTeam: () => Promise<void>;
  editingTeamId: string | null;
  editTeamName: string;
  setEditTeamName: (value: string) => void;
  handleUpdateTeam: (teamId: string) => Promise<void>;
  setActiveTeamActionId: (id: string | null) => void;
  setActiveTeamName: (name: string) => void;
  setWidthConfig: (config: WidthConfig | null) => void;
}

export const DesktopTableHeader: React.FC<DesktopTableHeaderProps> = ({
  teams,
  tableSettings,
  gridTemplateColumns,
  headerLabels,
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
  setWidthConfig,
}) => {
  return (
    <div
      className="grid border-b md:text-base font-semibold text-white sticky top-0 z-20 bg-dark border-gray-700"
      style={{ gridTemplateColumns, minWidth: 'max-content' }}
    >
      <div
        className="py-2 px-2 sm:px-3 border-r flex items-center justify-center cursor-pointer transition-colors bg-dark border-gray-700 hover:bg-gray-800"
        onClick={() =>
          setWidthConfig({
            type: 'taskLabel',
            currentWidth: tableSettings?.colWidths?.taskLabel ?? 160,
            label: `${headerLabels.left}列の幅`,
            currentTitle: headerLabels.left,
          })
        }
        title="クリックして幅を変更"
      >
        {headerLabels.left}
      </div>

      {teams.length === 0 ? (
        <div className="py-2 px-2 border-r text-center flex flex-col items-center justify-center h-full min-h-[44px] bg-dark border-gray-700">
          {isAddingTeam ? (
            <div className="relative z-20 flex items-center shadow-lg rounded p-1 w-32 md:w-40 bg-surface border border-spot">
              <InlineInput
                placeholder="班名(任意)"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTeam();
                  if (e.key === 'Escape') setIsAddingTeam(false);
                }}
                variant="dark"
                className="!border-none !px-1 md:!p-2 md:!text-base !text-sm"
              />
              <IconButton variant="primary" size="sm" onClick={handleAddTeam}>
                <MdAdd size={20} className="md:w-6 md:h-6" />
              </IconButton>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingTeam(true)}
              className="!text-sm md:!text-base !gap-1 !bg-transparent"
            >
              <MdAdd className="md:w-5 md:h-5" /> 最初の班を追加
            </Button>
          )}
        </div>
      ) : (
        teams.map((team) => (
          <div
            key={team.id}
            className="py-2 px-2 border-r text-center relative group flex items-center justify-center bg-dark border-gray-700"
          >
            {editingTeamId === team.id ? (
              <InlineInput
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTeam(team.id)}
                onBlur={() => handleUpdateTeam(team.id)}
                variant="light"
                className="!text-sm md:!text-base"
              />
            ) : (
              <div
                className="cursor-pointer rounded px-2 py-1 truncate w-full select-none hover:bg-gray-800 active:bg-gray-700 min-h-[28px] flex items-center justify-center"
                onClick={() => {
                  setActiveTeamActionId(team.id);
                  setActiveTeamName(team.name);
                }}
              >
                {formatTeamTitle(team.name) || <span className="text-gray-500 text-xs">班名を設定</span>}
              </div>
            )}
          </div>
        ))
      )}

      <div
        className="py-2 px-2 sm:px-3 text-center flex items-center justify-between relative cursor-pointer transition-colors bg-dark hover:bg-gray-800"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, input')) return;
          setWidthConfig({
            type: 'note',
            currentWidth: tableSettings?.colWidths?.note ?? 160,
            label: `${headerLabels.right}列の幅`,
            currentTitle: headerLabels.right,
          });
        }}
        title="クリックして幅を変更"
      >
        <div className="relative">
          {teams.length > 0 &&
            teams.length < MAX_TEAMS &&
            (isAddingTeam ? (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddingTeam(false);
                  }}
                />
                <div className="absolute top-1/2 -translate-y-1/2 right-0 z-20 flex items-center shadow-lg rounded p-1 w-32 md:w-40 bg-surface border border-spot">
                  <InlineInput
                    placeholder="班名(任意)"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTeam();
                      if (e.key === 'Escape') setIsAddingTeam(false);
                    }}
                    variant="dark"
                    className="!border-none !px-1 md:!p-2 !text-sm md:!text-base"
                  />
                  <IconButton variant="primary" size="sm" onClick={handleAddTeam}>
                    <MdAdd size={20} className="md:w-6 md:h-6" />
                  </IconButton>
                </div>
              </>
            ) : (
              <IconButton
                variant="ghost"
                size="sm"
                rounded
                onClick={() => setIsAddingTeam(true)}
                className="!bg-gray-700 !text-gray-300 hover:!bg-primary hover:!text-white"
                title="班を追加"
              >
                <MdAdd size={16} className="md:w-5 md:h-5" />
              </IconButton>
            ))}
        </div>
        <span className="whitespace-nowrap">{headerLabels.right}</span>
        <span className="w-4"></span>
      </div>
    </div>
  );
};
