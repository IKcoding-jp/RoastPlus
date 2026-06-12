import { ContextMenuModal } from './modals/ContextMenuModal';
import { HeightSettingsModal } from './modals/HeightSettingsModal';
import { MemberSelectionModal } from './modals/MemberSelectionModal';
import { TeamActionModal } from './modals/TeamActionModal';
import { WidthSettingsModal } from './modals/WidthSettingsModal';
import type {
  AssignmentTableModalData,
  ContextMenuModalState,
  HeightSettingsModalState,
  MemberMenuModalState,
  TableModalCallbacks,
  TeamActionModalState,
  WidthSettingsModalState,
} from './modals/types';

type TableModalsProps = {
  data: AssignmentTableModalData;
  contextMenu: ContextMenuModalState;
  memberMenu: MemberMenuModalState;
  teamAction: TeamActionModalState;
  widthSettings: WidthSettingsModalState;
  heightSettings: HeightSettingsModalState;
  callbacks: TableModalCallbacks;
};

export function TableModals({
  data,
  contextMenu,
  memberMenu,
  teamAction,
  widthSettings,
  heightSettings,
  callbacks,
}: TableModalsProps) {
  return (
    <>
      <ContextMenuModal data={data} state={contextMenu} setMemberMenu={memberMenu.setCurrent} callbacks={callbacks} />
      <MemberSelectionModal data={data} state={memberMenu} callbacks={callbacks} />
      <TeamActionModal
        tableSettings={data.tableSettings}
        state={teamAction}
        onUpdateTableSettings={callbacks.onUpdateTableSettings}
      />
      <WidthSettingsModal state={widthSettings} />
      <HeightSettingsModal
        tableSettings={data.tableSettings}
        state={heightSettings}
        onDeleteTaskLabel={callbacks.onDeleteTaskLabel}
      />
    </>
  );
}
