import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import AssignmentPage from './page';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useAssignmentData: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock('@/hooks/useDeveloperMode', () => ({
  useDeveloperMode: () => ({ isEnabled: false, isLoading: false }),
}));

vi.mock('@/app/login/page', () => ({
  default: () => <div>ログイン画面</div>,
}));

vi.mock('@/components/Loading', () => ({
  Loading: () => <div>読み込み中...</div>,
}));

vi.mock('./hooks', () => ({
  useAssignmentData: () => mocks.useAssignmentData(),
  useShuffleExecution: () => ({ handleShuffle: vi.fn() }),
  useAssignmentHandlers: () => ({
    handleUpdateTableSettings: vi.fn(),
    handleUpdateMember: vi.fn(),
    handleUpdateMemberName: vi.fn(),
    handleUpdateMemberExclusion: vi.fn(),
    handleSwapAssignments: vi.fn(),
    handleAddMember: vi.fn(),
    handleDeleteMember: vi.fn(),
    handleUpdateTaskLabel: vi.fn(),
    handleAddTaskLabel: vi.fn(),
    handleDeleteTaskLabel: vi.fn(),
    handleAddTeam: vi.fn(),
    handleDeleteTeam: vi.fn(),
    handleUpdateTeam: vi.fn(),
  }),
}));

vi.mock('./components/assignment-table', () => ({
  AssignmentTable: () => <div>担当表</div>,
}));

vi.mock('./components/RouletteOverlay', () => ({
  RouletteOverlay: () => null,
}));

vi.mock('./components/ManagerDialog', () => ({
  ManagerDialog: () => null,
}));

vi.mock('./components/AssignmentSettingsModal', () => ({
  AssignmentSettingsModal: () => null,
}));

vi.mock('./lib/firebase', () => ({
  setManager: vi.fn(),
  deleteManager: vi.fn(),
  addPairExclusion: vi.fn(),
  deletePairExclusion: vi.fn(),
  updateShuffleSettings: vi.fn(),
}));

describe('AssignmentPage', () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue({ user: { uid: 'user-1' }, loading: false });
    mocks.useAssignmentData.mockReturnValue({
      teams: [],
      setTeams: vi.fn(),
      members: [],
      setMembers: vi.fn(),
      taskLabels: [],
      setTaskLabels: vi.fn(),
      tableSettings: null,
      manager: null,
      setManagerState: vi.fn(),
      pairExclusions: [],
      shuffleSettings: { crossTeamShuffle: false, priority: {} },
      todayDate: '2026-05-23',
      setTodayDate: vi.fn(),
      activeDate: '2026-05-23',
      setActiveDate: vi.fn(),
      isRouletteVisible: false,
      isLocalShuffling: false,
      setIsLocalShuffling: vi.fn(),
      isShuffleDisabled: false,
      displayAssignments: [],
      isLoading: false,
    });
  });

  it('未ログイン時は読み込み中のままにせずログイン画面を表示する', () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: false });
    mocks.useAssignmentData.mockReturnValue({
      teams: [],
      setTeams: vi.fn(),
      members: [],
      setMembers: vi.fn(),
      taskLabels: [],
      setTaskLabels: vi.fn(),
      tableSettings: null,
      manager: null,
      setManagerState: vi.fn(),
      pairExclusions: [],
      shuffleSettings: { crossTeamShuffle: false, priority: {} },
      todayDate: '',
      setTodayDate: vi.fn(),
      activeDate: '',
      setActiveDate: vi.fn(),
      isRouletteVisible: false,
      isLocalShuffling: false,
      setIsLocalShuffling: vi.fn(),
      isShuffleDisabled: true,
      displayAssignments: [],
      isLoading: true,
    });

    render(<AssignmentPage />);

    expect(screen.getByText('ログイン画面')).toBeInTheDocument();
    expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
  });
});
