import { useState } from 'react';
import { MdDelete } from 'react-icons/md';
import { Button, Input, NumberInput } from '@/components/ui';
import {
  clampTableDimension,
  parseTableDimensionInput,
  validateTableDimensionInput,
} from '../../../lib/tableModalLogic';
import { ModalShell } from './ModalShell';
import type { AssignmentTableModalData, TableModalCallbacks, TeamActionModalState } from './types';
import { DEFAULT_TABLE_SETTINGS } from '../types';
import { DEFAULT_TEAM_COLUMN_WIDTH } from '../desktopTableViewLayout';

const TEAM_COLUMN_MIN_WIDTH = 120;
const TEAM_COLUMN_MAX_WIDTH = 320;

type TeamActionModalProps = {
  tableSettings: AssignmentTableModalData['tableSettings'];
  state: TeamActionModalState;
  onUpdateTableSettings: TableModalCallbacks['onUpdateTableSettings'];
};

export function TeamActionModal({ tableSettings, state, onUpdateTableSettings }: TeamActionModalProps) {
  const {
    activeTeamActionId,
    setActiveTeamActionId,
    activeTeamName,
    setActiveTeamName,
    handleUpdateTeamFromModal,
    handleDeleteTeamFromModal,
  } = state;

  return (
    <ModalShell
      isOpen={activeTeamActionId !== null}
      onClose={() => setActiveTeamActionId(null)}
      panelClassName="rounded-xl shadow-xl p-6 w-full max-w-xs relative z-10 bg-overlay border border-edge"
    >
      {activeTeamActionId && (
        <TeamActionModalContent
          key={activeTeamActionId}
          activeTeamActionId={activeTeamActionId}
          activeTeamName={activeTeamName}
          setActiveTeamActionId={setActiveTeamActionId}
          setActiveTeamName={setActiveTeamName}
          handleUpdateTeamFromModal={handleUpdateTeamFromModal}
          handleDeleteTeamFromModal={handleDeleteTeamFromModal}
          tableSettings={tableSettings}
          onUpdateTableSettings={onUpdateTableSettings}
        />
      )}
    </ModalShell>
  );
}

type TeamActionModalContentProps = {
  activeTeamActionId: string;
  activeTeamName: string;
  setActiveTeamActionId: TeamActionModalState['setActiveTeamActionId'];
  setActiveTeamName: TeamActionModalState['setActiveTeamName'];
  handleUpdateTeamFromModal: TeamActionModalState['handleUpdateTeamFromModal'];
  handleDeleteTeamFromModal: TeamActionModalState['handleDeleteTeamFromModal'];
  tableSettings: AssignmentTableModalData['tableSettings'];
  onUpdateTableSettings: TableModalCallbacks['onUpdateTableSettings'];
};

function TeamActionModalContent({
  activeTeamActionId,
  activeTeamName,
  setActiveTeamActionId,
  setActiveTeamName,
  handleUpdateTeamFromModal,
  handleDeleteTeamFromModal,
  tableSettings,
  onUpdateTableSettings,
}: TeamActionModalContentProps) {
  const [draftWidth, setDraftWidth] = useState(() =>
    String(tableSettings?.colWidths?.teams?.[activeTeamActionId] ?? DEFAULT_TEAM_COLUMN_WIDTH)
  );
  const draftWidthValue = clampTableDimension(
    parseTableDimensionInput(draftWidth, DEFAULT_TEAM_COLUMN_WIDTH),
    TEAM_COLUMN_MIN_WIDTH,
    TEAM_COLUMN_MAX_WIDTH
  );
  const widthError = validateTableDimensionInput(draftWidth, TEAM_COLUMN_MIN_WIDTH, TEAM_COLUMN_MAX_WIDTH);

  const handleSaveTeamAction = async () => {
    if (validateTableDimensionInput(draftWidth, TEAM_COLUMN_MIN_WIDTH, TEAM_COLUMN_MAX_WIDTH)) return;

    const currentSettings = tableSettings || DEFAULT_TABLE_SETTINGS;
    const newSettings = {
      ...currentSettings,
      colWidths: {
        ...currentSettings.colWidths,
        teams: { ...currentSettings.colWidths.teams },
      },
      rowHeights: { ...currentSettings.rowHeights },
      headerLabels: { ...currentSettings.headerLabels },
    };
    newSettings.colWidths.teams[activeTeamActionId] = clampTableDimension(
      parseTableDimensionInput(draftWidth, DEFAULT_TEAM_COLUMN_WIDTH),
      TEAM_COLUMN_MIN_WIDTH,
      TEAM_COLUMN_MAX_WIDTH
    );
    await onUpdateTableSettings(newSettings);

    await handleUpdateTeamFromModal();
  };

  return (
    <>
      <h3 className="text-lg font-bold mb-4 text-ink">班の編集</h3>

      <div className="mb-6">
        <Input label="班名" value={activeTeamName} onChange={(event) => setActiveTeamName(event.target.value)} />
      </div>

      <div className="mb-6">
        <NumberInput
          label="幅"
          suffix="px"
          value={draftWidth}
          min={TEAM_COLUMN_MIN_WIDTH}
          max={TEAM_COLUMN_MAX_WIDTH}
          error={widthError ?? undefined}
          onChange={(event) => setDraftWidth(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleSaveTeamAction()}
        />
        <div className="mt-3">
          <input
            type="range"
            min={TEAM_COLUMN_MIN_WIDTH}
            max={TEAM_COLUMN_MAX_WIDTH}
            step={10}
            value={draftWidthValue}
            onChange={(event) => setDraftWidth(event.target.value)}
            className="w-full accent-spot"
            aria-label="班の幅"
          />
          <div className="mt-1 flex justify-between text-xs font-medium text-ink-muted">
            <span>{TEAM_COLUMN_MIN_WIDTH}px</span>
            <span>{draftWidthValue}px</span>
            <span>{TEAM_COLUMN_MAX_WIDTH}px</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Button
          variant="danger"
          size="sm"
          fullWidth
          onClick={handleDeleteTeamFromModal}
          className="flex! items-center! !justify-center gap-1!"
        >
          <MdDelete size={18} />
          削除
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setActiveTeamActionId(null)} className="flex-1">
            キャンセル
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveTeamAction}
            disabled={widthError !== null}
            className="flex-1"
          >
            更新
          </Button>
        </div>
      </div>
    </>
  );
}
