import React from 'react';
import { MdInfoOutline } from 'react-icons/md';
import { Props } from './types';
import { useCellInteraction } from './useCellInteraction';
import { useTableEditing } from './useTableEditing';
import { DesktopTableView } from './DesktopTableView';
import { MobileListView } from './MobileListView';
import { TableModals } from './TableModals';

export const AssignmentTable: React.FC<Props> = (props) => {
  const {
    teams,
    taskLabels,
    assignments,
    members,
    tableSettings,
    onUpdateTableSettings,
    onUpdateMember,
    onAddMember,
    onDeleteMember,
    onUpdateTaskLabel,
    onAddTaskLabel,
    onDeleteTaskLabel,
    onAddTeam,
    onDeleteTeam,
    onUpdateTeam,
    onUpdateMemberName,
    onUpdateMemberExclusion,
    onSwapAssignments,
    onShuffle,
    isShuffleDisabled,
  } = props;

  const cellInteraction = useCellInteraction(members);
  const tableEditing = useTableEditing({
    teams,
    taskLabels,
    members,
    tableSettings,
    onUpdateTableSettings,
    onUpdateTaskLabel,
    onAddTaskLabel,
    onDeleteTaskLabel,
    onAddTeam,
    onDeleteTeam,
    onUpdateTeam,
    onAddMember,
    onUpdateMember,
  });

  const handleCellClick = (teamId: string, taskLabelId: string) => {
    cellInteraction.handleCellClick(teamId, taskLabelId, onSwapAssignments);
  };

  return (
    <div className="w-full max-w-full flex flex-col items-center gap-6">
      {/* データがない場合の初期ガイドメッセージ */}
      {teams.length === 0 && taskLabels.length === 0 && (
        <div className="w-full max-w-[560px] rounded-lg border border-edge bg-surface px-6 py-4 text-center shadow-sm">
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-spot-subtle bg-surface text-spot">
            <MdInfoOutline size={20} />
          </div>
          <div className="mt-2">
            <h3 className="text-base font-bold text-ink">担当表をはじめましょう</h3>
            <p className="mx-auto mt-1 max-w-[440px] text-sm leading-relaxed text-ink-sub">
              まずは「班」と「担当」を追加して、日々の役割分担を管理する表を作成しましょう。
            </p>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center text-xs">
              <div className="rounded-full border border-spot-subtle bg-surface px-3 py-2 text-center shadow-[0_1px_0_rgba(0,0,0,0.04)]">
                <div className="font-bold text-spot">1</div>
                <div className="mt-0.5 font-medium text-ink-sub">班を追加</div>
              </div>
              <div className="h-px w-5 bg-edge-strong" />
              <div className="rounded-full border border-edge bg-surface px-3 py-2 text-center">
                <div className="font-bold text-ink-muted">2</div>
                <div className="mt-0.5 font-medium text-ink-sub">担当を追加</div>
              </div>
              <div className="h-px w-5 bg-edge-strong" />
              <div className="rounded-full border border-edge bg-surface px-3 py-2 text-center">
                <div className="font-bold text-ink-muted">3</div>
                <div className="mt-0.5 font-medium text-ink-sub">割当開始</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DesktopTableView
        teams={teams}
        taskLabels={taskLabels}
        assignments={assignments}
        members={members}
        tableSettings={tableSettings}
        selectedCell={cellInteraction.selectedCell}
        isAddingTeam={tableEditing.isAddingTeam}
        setIsAddingTeam={tableEditing.setIsAddingTeam}
        newTeamName={tableEditing.newTeamName}
        setNewTeamName={tableEditing.setNewTeamName}
        handleAddTeam={tableEditing.handleAddTeam}
        editingTeamId={tableEditing.editingTeamId}
        editTeamName={tableEditing.editTeamName}
        setEditTeamName={tableEditing.setEditTeamName}
        handleUpdateTeam={tableEditing.handleUpdateTeam}
        setActiveTeamActionId={tableEditing.setActiveTeamActionId}
        setActiveTeamName={tableEditing.setActiveTeamName}
        newLeftLabel={tableEditing.newLeftLabel}
        setNewLeftLabel={tableEditing.setNewLeftLabel}
        newRightLabel={tableEditing.newRightLabel}
        setNewRightLabel={tableEditing.setNewRightLabel}
        handleAddTaskLabel={tableEditing.handleAddTaskLabel}
        setWidthConfig={tableEditing.setWidthConfig}
        setHeightConfig={tableEditing.setHeightConfig}
        handleCellTouchStart={cellInteraction.handleCellTouchStart}
        handleCellTouchEnd={cellInteraction.handleCellTouchEnd}
        handleCellTouchMove={cellInteraction.handleCellTouchMove}
        handleCellClick={handleCellClick}
        onShuffle={onShuffle}
        isShuffleDisabled={isShuffleDisabled}
      />

      <MobileListView
        teams={teams}
        taskLabels={taskLabels}
        assignments={assignments}
        members={members}
        tableSettings={tableSettings}
        selectedCell={cellInteraction.selectedCell}
        editingLabelId={tableEditing.editingLabelId}
        editLeftLabel={tableEditing.editLeftLabel}
        setEditLeftLabel={tableEditing.setEditLeftLabel}
        editRightLabel={tableEditing.editRightLabel}
        setEditRightLabel={tableEditing.setEditRightLabel}
        startEditLabel={tableEditing.startEditLabel}
        saveLabel={tableEditing.saveLabel}
        handleDeleteTaskLabel={tableEditing.handleDeleteTaskLabel}
        handleCellTouchStart={cellInteraction.handleCellTouchStart}
        handleCellTouchEnd={cellInteraction.handleCellTouchEnd}
        handleCellTouchMove={cellInteraction.handleCellTouchMove}
        handleCellClick={handleCellClick}
      />

      <TableModals
        data={{ teams, taskLabels, assignments, members, tableSettings }}
        contextMenu={{
          current: cellInteraction.contextMenu,
          setCurrent: cellInteraction.setContextMenu,
          editingMemberName: cellInteraction.editingMemberName,
          setEditingMemberName: cellInteraction.setEditingMemberName,
          isExclusionSettingsOpen: cellInteraction.isExclusionSettingsOpen,
          setIsExclusionSettingsOpen: cellInteraction.setIsExclusionSettingsOpen,
        }}
        memberMenu={{
          current: tableEditing.showMemberMenu,
          setCurrent: tableEditing.setShowMemberMenu,
          newMemberName: tableEditing.newMemberName,
          setNewMemberName: tableEditing.setNewMemberName,
          handleAddMember: tableEditing.handleAddMember,
        }}
        teamAction={{
          activeTeamActionId: tableEditing.activeTeamActionId,
          setActiveTeamActionId: tableEditing.setActiveTeamActionId,
          activeTeamName: tableEditing.activeTeamName,
          setActiveTeamName: tableEditing.setActiveTeamName,
          handleUpdateTeamFromModal: tableEditing.handleUpdateTeamFromModal,
          handleDeleteTeamFromModal: tableEditing.handleDeleteTeamFromModal,
        }}
        widthSettings={{
          widthConfig: tableEditing.widthConfig,
          setWidthConfig: tableEditing.setWidthConfig,
          handleSaveWidth: tableEditing.handleSaveWidth,
        }}
        heightSettings={{
          heightConfig: tableEditing.heightConfig,
          setHeightConfig: tableEditing.setHeightConfig,
          handleSaveRowConfig: tableEditing.handleSaveRowConfig,
        }}
        callbacks={{
          onUpdateMember,
          onUpdateMemberName,
          onUpdateMemberExclusion,
          onDeleteMember,
          onDeleteTaskLabel,
          onUpdateTableSettings,
        }}
      />
    </div>
  );
};
