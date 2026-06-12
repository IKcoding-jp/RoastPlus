import { describe, expect, it } from 'vitest';
import type { Assignment, Member, TaskLabel, Team } from '@/types';
import {
  buildAssignmentModalTitle,
  createEmptyAssignment,
  getAvailableMembers,
  isMemberExcludedFromTaskLabel,
  parseTableDimensionInput,
} from './tableModalLogic';

const teams: Team[] = [
  { id: 'team-a', name: ' A ' },
  { id: 'team-empty', name: '   ' },
];

const taskLabels: TaskLabel[] = [
  { id: 'task-drip', leftLabel: 'ドリップ', rightLabel: '午前' },
  { id: 'task-seal', leftLabel: 'シール' },
];

const members: Member[] = [
  { id: 'member-1', name: '田中', teamId: 'team-a', excludedTaskLabelIds: ['task-seal'] },
  { id: 'member-2', name: '佐藤', teamId: 'team-a', excludedTaskLabelIds: [] },
  { id: 'member-3', name: '鈴木', teamId: 'team-b', excludedTaskLabelIds: [] },
];

describe('tableModalLogic', () => {
  it('班名がある場合は班名と作業名でモーダルタイトルを作る', () => {
    expect(buildAssignmentModalTitle(teams, taskLabels, 'team-a', 'task-drip')).toBe('A班 - ドリップ');
  });

  it('班名が空の場合は作業名だけをモーダルタイトルにする', () => {
    expect(buildAssignmentModalTitle(teams, taskLabels, 'team-empty', 'task-seal')).toBe('シール');
  });

  it('対象メンバーが作業ラベルを除外しているか判定する', () => {
    expect(isMemberExcludedFromTaskLabel(members, 'member-1', 'task-seal')).toBe(true);
    expect(isMemberExcludedFromTaskLabel(members, 'member-1', 'task-drip')).toBe(false);
    expect(isMemberExcludedFromTaskLabel(members, null, 'task-seal')).toBe(false);
  });

  it('すでに割り当て済みのメンバーを選択候補から除外する', () => {
    const assignments: Assignment[] = [
      { teamId: 'team-a', taskLabelId: 'task-drip', memberId: 'member-1', assignedDate: '2026-06-12' },
      { teamId: 'team-a', taskLabelId: 'task-seal', memberId: null, assignedDate: '2026-06-12' },
    ];

    expect(getAvailableMembers(members, assignments).map((member) => member.id)).toEqual(['member-2', 'member-3']);
  });

  it('数値入力を整数に変換し、空値や0は既存のフォールバック値を使う', () => {
    expect(parseTableDimensionInput('128', 100)).toBe(128);
    expect(parseTableDimensionInput('', 100)).toBe(100);
    expect(parseTableDimensionInput('0', 100)).toBe(100);
  });

  it('メンバー未割り当てのAssignmentをセル位置から作る', () => {
    expect(createEmptyAssignment('team-a', 'task-drip')).toEqual({
      teamId: 'team-a',
      taskLabelId: 'task-drip',
      memberId: null,
      assignedDate: '',
    });
  });
});
