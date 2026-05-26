import { describe, expect, it } from 'vitest';

import type { TableSettings, Team } from '@/types';

import { getDesktopGridTemplateColumns } from './desktopTableViewLayout';

const tableSettings: TableSettings = {
  colWidths: {
    taskLabel: 180,
    note: 220,
    teams: {
      'team-1': 120,
    },
  },
  rowHeights: {},
  headerLabels: {
    left: '作業',
    right: '補足',
  },
};

describe('getDesktopGridTemplateColumns', () => {
  it('班がないときはラベル列と補足列の設定幅を使う', () => {
    expect(getDesktopGridTemplateColumns([], tableSettings)).toBe('180px 160px 220px');
  });

  it('班があるときは班ごとの設定幅を使い、未設定の班は既定幅にする', () => {
    const teams: Team[] = [
      { id: 'team-1', name: 'A', order: 0 },
      { id: 'team-2', name: 'B', order: 1 },
    ];

    expect(getDesktopGridTemplateColumns(teams, tableSettings)).toBe('180px 120px 140px 220px');
  });
});
