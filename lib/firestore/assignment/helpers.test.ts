// assignment 移行(1/4): 移設した汎用ロジックの単体テスト
import { describe, it, expect } from 'vitest';
import {
  toMillisSafe,
  normalizeAssignmentsForDate,
  sortAssignmentsStable,
  areAssignmentsEqual,
  DEFAULT_SHUFFLE_SETTINGS,
  DEFAULT_TABLE_SETTINGS,
} from './helpers';
import type { Assignment } from '@/types';

const makeAssignment = (over: Partial<Assignment> = {}): Assignment => ({
  teamId: 't1',
  taskLabelId: 'l1',
  memberId: null,
  assignedDate: '2026-06-13',
  ...over,
});

describe('toMillisSafe', () => {
  it('null / undefined は 0 を返す', () => {
    expect(toMillisSafe(null)).toBe(0);
    expect(toMillisSafe(undefined)).toBe(0);
  });

  it('ISO 文字列はパースしたミリ秒を返す', () => {
    expect(toMillisSafe('2026-06-13T00:00:00.000Z')).toBe(Date.parse('2026-06-13T00:00:00.000Z'));
  });

  it('不正な文字列は 0 を返す', () => {
    expect(toMillisSafe('not-a-date')).toBe(0);
  });

  it('toMillis() を持つ Timestamp はその値を返す', () => {
    const ts = { toMillis: () => 1234 } as never;
    expect(toMillisSafe(ts)).toBe(1234);
  });

  it('seconds / nanoseconds から計算する', () => {
    const ts = { seconds: 2, nanoseconds: 500_000_000 };
    expect(toMillisSafe(ts)).toBe(2500);
  });
});

describe('normalizeAssignmentsForDate', () => {
  it('全件に指定日を付与し memberId 未指定は null になる', () => {
    const result = normalizeAssignmentsForDate([{ teamId: 't1', taskLabelId: 'l1' } as Assignment], '2026-06-13');
    expect(result).toEqual([{ teamId: 't1', taskLabelId: 'l1', memberId: null, assignedDate: '2026-06-13' }]);
  });

  it('teamId__taskLabelId が重複する場合は後勝ちで 1 件に統合する', () => {
    const result = normalizeAssignmentsForDate(
      [makeAssignment({ memberId: 'm1' }), makeAssignment({ memberId: 'm2' })],
      '2026-06-13'
    );
    expect(result).toHaveLength(1);
    expect(result[0].memberId).toBe('m2');
  });
});

describe('sortAssignmentsStable', () => {
  it('teamId → taskLabelId の順で安定ソートする', () => {
    const result = sortAssignmentsStable([
      makeAssignment({ teamId: 't2', taskLabelId: 'l1' }),
      makeAssignment({ teamId: 't1', taskLabelId: 'l2' }),
      makeAssignment({ teamId: 't1', taskLabelId: 'l1' }),
    ]);
    expect(result.map((a) => `${a.teamId}/${a.taskLabelId}`)).toEqual(['t1/l1', 't1/l2', 't2/l1']);
  });
});

describe('areAssignmentsEqual', () => {
  it('件数が違えば false', () => {
    expect(areAssignmentsEqual([makeAssignment()], [])).toBe(false);
  });

  it('teamId / taskLabelId / memberId が一致すれば true', () => {
    expect(areAssignmentsEqual([makeAssignment({ memberId: 'm1' })], [makeAssignment({ memberId: 'm1' })])).toBe(true);
  });

  it('memberId が違えば false', () => {
    expect(areAssignmentsEqual([makeAssignment({ memberId: 'm1' })], [makeAssignment({ memberId: 'm2' })])).toBe(false);
  });
});

describe('デフォルト定数', () => {
  it('DEFAULT_SHUFFLE_SETTINGS を保持する', () => {
    expect(DEFAULT_SHUFFLE_SETTINGS).toEqual({ crossTeamShuffle: false, priority: 'pair' });
  });

  it('DEFAULT_TABLE_SETTINGS の見出しを保持する', () => {
    expect(DEFAULT_TABLE_SETTINGS.headerLabels).toEqual({ left: '担当', right: 'メモ' });
  });
});
