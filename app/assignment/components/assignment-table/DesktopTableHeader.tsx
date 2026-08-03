import React from 'react';
import { MdAdd } from 'react-icons/md';

import { Button, IconButton, InlineInput } from '@/components/ui';
import type { TableSettings, Team } from '@/types';

import { MAX_TEAMS } from '../../lib/constants';
import type { WidthConfig } from './types';
import { formatTeamTitle } from '../../lib/tableModalLogic';
import { isDraftTeam } from './desktopTableViewLayout';

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
  const realTeams = teams.filter((team) => !isDraftTeam(team.id));
  const isSingleTeam = realTeams.length === 1;

  const handleOpenTeamAction = (team: Team) => {
    setActiveTeamActionId(team.id);
    setActiveTeamName(team.name);
  };

  const renderDraftTeamControl = () => (
    <div className="flex min-h-[34px] items-center justify-center gap-1 w-full">
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
        className="!min-h-[30px] !w-20 !border-none !px-1 py-1! text-sm!"
      />
      <IconButton variant="primary" size="sm" onClick={handleAddTeam} title="班を追加">
        <MdAdd size={18} />
      </IconButton>
    </div>
  );

  const renderCompactAddTeamButton = () => {
    if (!isSingleTeam || realTeams.length >= MAX_TEAMS) return null;

    return (
      <IconButton
        variant="ghost"
        size="sm"
        rounded
        onClick={(event) => {
          event.stopPropagation();
          setIsAddingTeam(true);
        }}
        className="absolute right-1 top-1/2 shrink-0 -translate-y-1/2 !bg-gray-700 !text-gray-300 hover:!bg-primary hover:!text-white"
        title="班を追加"
      >
        <MdAdd size={16} className="md:w-5 md:h-5" />
      </IconButton>
    );
  };

  React.useEffect(() => {
    if (!isAddingTeam) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || typeof target.closest !== 'function') return;

      if (target.closest('[data-draft-team-control]')) return;
      setIsAddingTeam(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isAddingTeam, setIsAddingTeam]);

  return (
    <div
      className="grid border-b md:text-base font-semibold text-white sticky top-0 z-20 bg-dark border-gray-700"
      style={{ gridTemplateColumns, minWidth: 'max-content' }}
    >
      <div
        className="h-[52px] px-2 sm:px-3 border-r flex items-center justify-center cursor-pointer transition-colors bg-dark border-gray-700 hover:bg-gray-800"
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

      {realTeams.length === 0 && !isAddingTeam ? (
        <div className="h-[52px] px-2 border-r text-center flex flex-col items-center justify-center bg-dark border-gray-700">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingTeam(true)}
            className="!min-h-[34px] text-sm! md:!text-base gap-1! !bg-transparent"
          >
            <MdAdd className="md:w-5 md:h-5" /> 最初の班を追加
          </Button>
        </div>
      ) : (
        teams.map((team) => (
          <div
            key={team.id}
            className="h-[52px] px-2 border-r text-center relative group flex items-center justify-center bg-dark border-gray-700 cursor-pointer hover:bg-gray-800"
            onClick={(event) => {
              if (isDraftTeam(team.id)) return;
              if (editingTeamId === team.id) return;
              if ((event.target as HTMLElement).closest('button, input')) return;
              handleOpenTeamAction(team);
            }}
            title={isDraftTeam(team.id) || editingTeamId === team.id ? undefined : 'クリックして班を編集'}
          >
            {isDraftTeam(team.id) ? (
              <div data-draft-team-control>{renderDraftTeamControl()}</div>
            ) : editingTeamId === team.id ? (
              <InlineInput
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTeam(team.id)}
                onBlur={() => handleUpdateTeam(team.id)}
                variant="light"
                className="text-sm! md:!text-base"
              />
            ) : (
              <div
                className={`min-h-[28px] w-full items-center ${isSingleTeam ? 'relative flex justify-center' : 'flex justify-center'}`}
                data-testid={isSingleTeam ? 'single-team-header-actions' : undefined}
              >
                <div className="flex max-w-[calc(100%-3rem)] select-none items-center justify-center truncate rounded px-2 py-1 active:bg-gray-700">
                  {formatTeamTitle(team.name) || <span className="text-gray-500 text-xs">班名を設定</span>}
                </div>
                {renderCompactAddTeamButton()}
              </div>
            )}
          </div>
        ))
      )}

      <div
        className="h-[52px] px-2 sm:px-3 text-center flex items-center justify-between relative cursor-pointer transition-colors bg-dark hover:bg-gray-800"
        data-testid="assignment-note-header"
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
          {realTeams.length > 1 && realTeams.length < MAX_TEAMS && !isAddingTeam && (
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
          )}
        </div>
        <span className="whitespace-nowrap">{headerLabels.right}</span>
        <span className="w-4"></span>
      </div>
    </div>
  );
};
