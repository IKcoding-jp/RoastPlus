import type { Assignment, Member, TableSettings, TaskLabel, Team } from '@/types';
import type { AssignmentCellTarget, HeightConfig, MemberMenuTarget, WidthConfig } from '../types';

export type { AssignmentCellTarget, MemberMenuTarget };

export type AssignmentTableModalData = {
  teams: Team[];
  taskLabels: TaskLabel[];
  assignments: Assignment[];
  members: Member[];
  tableSettings: TableSettings | null;
};

export type ContextMenuModalState = {
  current: AssignmentCellTarget | null;
  setCurrent: (menu: AssignmentCellTarget | null) => void;
  editingMemberName: string;
  setEditingMemberName: (value: string) => void;
  isExclusionSettingsOpen: boolean;
  setIsExclusionSettingsOpen: (value: boolean) => void;
};

export type MemberMenuModalState = {
  current: MemberMenuTarget | null;
  setCurrent: (value: MemberMenuTarget | null) => void;
  newMemberName: string;
  setNewMemberName: (value: string) => void;
  handleAddMember: (taskLabelId: string, teamId: string) => Promise<void>;
};

export type TeamActionModalState = {
  activeTeamActionId: string | null;
  setActiveTeamActionId: (id: string | null) => void;
  activeTeamName: string;
  setActiveTeamName: (value: string) => void;
  handleUpdateTeamFromModal: () => Promise<void>;
  handleDeleteTeamFromModal: () => Promise<void>;
};

export type WidthSettingsModalState = {
  widthConfig: WidthConfig | null;
  setWidthConfig: (config: WidthConfig | null) => void;
  handleSaveWidth: (width: number, headerName?: string) => Promise<void>;
};

export type HeightSettingsModalState = {
  heightConfig: HeightConfig | null;
  setHeightConfig: (config: HeightConfig | null) => void;
  handleSaveRowConfig: (height: number, name: string) => Promise<void>;
};

export type TableModalCallbacks = {
  onUpdateMember: (assignment: Assignment, memberId: string | null) => Promise<void>;
  onUpdateMemberName: (memberId: string, name: string) => Promise<void>;
  onUpdateMemberExclusion: (memberId: string, taskLabelId: string, isExcluded: boolean) => Promise<void>;
  onDeleteMember: (memberId: string) => Promise<void>;
  onDeleteTaskLabel: (taskLabelId: string) => Promise<void>;
  onUpdateTableSettings: (settings: TableSettings) => Promise<void>;
};
