import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TableSettings, Team } from '@/types';

import { DesktopTableHeader } from './DesktopTableHeader';

const tableSettings: TableSettings = {
  colWidths: {
    taskLabel: 160,
    note: 160,
    teams: {},
  },
  rowHeights: {},
  headerLabels: {
    left: '作業',
    right: '補足',
  },
};

const defaultProps = {
  tableSettings,
  gridTemplateColumns: '160px 140px 160px',
  headerLabels: tableSettings.headerLabels,
  isAddingTeam: false,
  setIsAddingTeam: vi.fn(),
  newTeamName: '',
  setNewTeamName: vi.fn(),
  handleAddTeam: vi.fn(),
  editingTeamId: null,
  editTeamName: '',
  setEditTeamName: vi.fn(),
  handleUpdateTeam: vi.fn(),
  setActiveTeamActionId: vi.fn(),
  setActiveTeamName: vi.fn(),
  setWidthConfig: vi.fn(),
};

describe('DesktopTableHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('班が1つのときは班名と班追加ボタンを同じ行に横並びで表示する', () => {
    const teams: Team[] = [{ id: 'team-1', name: 'A', order: 0 }];

    render(<DesktopTableHeader {...defaultProps} teams={teams} />);

    const actionRow = screen.getByTestId('single-team-header-actions');
    expect(within(actionRow).getByText('A班')).toBeInTheDocument();
    expect(within(actionRow).getByTitle('班を追加')).toBeInTheDocument();
    expect(actionRow).toHaveClass('relative');

    const addButton = within(actionRow).getByTitle('班を追加');
    expect(addButton).toHaveClass('absolute');
    expect(addButton).toHaveClass('right-1');

    const noteHeader = screen.getByTestId('assignment-note-header');
    expect(within(noteHeader).queryByTitle('班を追加')).not.toBeInTheDocument();
  });

  it('班名の余白部分をクリックしても班編集モーダルを開く', () => {
    const teams: Team[] = [{ id: 'team-1', name: 'A', order: 0 }];

    render(<DesktopTableHeader {...defaultProps} teams={teams} />);

    fireEvent.click(screen.getByTestId('single-team-header-actions'));

    expect(defaultProps.setActiveTeamActionId).toHaveBeenCalledWith('team-1');
    expect(defaultProps.setActiveTeamName).toHaveBeenCalledWith('A');
  });

  it('班追加ボタンをクリックしても班編集モーダルは開かない', () => {
    const teams: Team[] = [{ id: 'team-1', name: 'A', order: 0 }];

    render(<DesktopTableHeader {...defaultProps} teams={teams} />);

    fireEvent.click(screen.getByTitle('班を追加'));

    expect(defaultProps.setIsAddingTeam).toHaveBeenCalledWith(true);
    expect(defaultProps.setActiveTeamActionId).not.toHaveBeenCalled();
    expect(defaultProps.setActiveTeamName).not.toHaveBeenCalled();
  });
});
