import { describe, expect, it } from 'vitest';

import type { TableSettings, Team } from '@/types';

import { getDesktopGridTemplateColumns } from './desktopTableViewLayout';

const baseSettings: TableSettings = {
  colWidths: { taskLabel: 160, note: 160, teams: {} },
  rowHeights: {},
  headerLabels: { left: '作業', right: '補足' },
};

const configuredSettings: TableSettings = {
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
  it('班がないときは操作ボタンが縦長にならない幅を確保する', () => {
    expect(getDesktopGridTemplateColumns([], baseSettings)).toBe('160px 300px 160px');
  });

  it('班がないときもラベル列と補足列は設定幅を使う', () => {
    expect(getDesktopGridTemplateColumns([], configuredSettings)).toBe('180px 300px 220px');
  });

  it('班が1つのときは担当追加とシャッフル操作の幅を確保する', () => {
    const teams: Team[] = [{ id: 'team-1', name: 'A', order: 0 }];

    expect(getDesktopGridTemplateColumns(teams, baseSettings)).toBe('160px 300px 160px');
  });

  it('班が1つでも保存済みの列幅が十分広い場合はその幅を使う', () => {
    const teams: Team[] = [{ id: 'team-1', name: 'A', order: 0 }];
    const settings: TableSettings = {
      ...baseSettings,
      colWidths: { ...baseSettings.colWidths, teams: { 'team-1': 320 } },
    };

    expect(getDesktopGridTemplateColumns(teams, settings)).toBe('160px 320px 160px');
  });

  it('班が複数あるときは班ごとの設定幅を使い、未設定の班は既定幅にする', () => {
    const teams: Team[] = [
      { id: 'team-1', name: 'A', order: 0 },
      { id: 'team-2', name: 'B', order: 1 },
    ];

    expect(getDesktopGridTemplateColumns(teams, configuredSettings)).toBe('180px 120px 150px 220px');
  });
});
