import { describe, it, expect } from 'vitest';
import {
  isReorderStatus,
  selectReorderItems,
  countReorderItems,
  normalizeInventoryStatus,
  normalizeInventoryCategory,
  buildInventoryItemInput,
  formatUpdatedBy,
  STATUS_LABELS,
  CATEGORY_LABELS,
} from './inventory';
import type { InventoryItem } from '@/types';

function makeItem(id: string, status: InventoryItem['status']): InventoryItem {
  return { id, name: id, category: 'consumable', status, updatedBy: 'tester' };
}

describe('isReorderStatus', () => {
  it('low と out が要発注', () => {
    expect(isReorderStatus('low')).toBe(true);
    expect(isReorderStatus('out')).toBe(true);
    expect(isReorderStatus('enough')).toBe(false);
  });
});

describe('selectReorderItems / countReorderItems', () => {
  it('low と out だけを抽出し、out を先頭に並べ件数を返す', () => {
    const items = [makeItem('a', 'enough'), makeItem('b', 'low'), makeItem('c', 'out')];
    expect(selectReorderItems(items).map((i) => i.id)).toEqual(['c', 'b']);
    expect(countReorderItems(items)).toBe(2);
  });

  it('緊急度順に out(切れた)を low(少ない)より前に並べる', () => {
    const items = [makeItem('a', 'low'), makeItem('b', 'out'), makeItem('c', 'low'), makeItem('d', 'out')];
    expect(selectReorderItems(items).map((i) => i.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('同一 status 内は元の順序を維持する(安定ソート)', () => {
    const items = [makeItem('x', 'out'), makeItem('y', 'out'), makeItem('z', 'out')];
    expect(selectReorderItems(items).map((i) => i.id)).toEqual(['x', 'y', 'z']);

    const lows = [makeItem('p', 'low'), makeItem('q', 'low'), makeItem('r', 'low')];
    expect(selectReorderItems(lows).map((i) => i.id)).toEqual(['p', 'q', 'r']);
  });
});

describe('normalizeInventoryStatus', () => {
  it('正しい値はそのまま、未知の値は enough にフォールバック', () => {
    expect(normalizeInventoryStatus('low')).toBe('low');
    expect(normalizeInventoryStatus('xxx')).toBe('enough');
    expect(normalizeInventoryStatus(undefined)).toBe('enough');
  });
});

describe('normalizeInventoryCategory', () => {
  it('正しい値はそのまま、未知の値は consumable にフォールバック', () => {
    expect(normalizeInventoryCategory('green-bean')).toBe('green-bean');
    expect(normalizeInventoryCategory('xxx')).toBe('consumable');
  });
});

describe('buildInventoryItemInput', () => {
  it('name をトリムし、status/category を正規化する', () => {
    const result = buildInventoryItemInput({
      name: '  ドリップ袋 ',
      category: 'material',
      status: 'low',
      note: ' 残りわずか ',
    });
    expect(result).toEqual({ name: 'ドリップ袋', category: 'material', status: 'low', note: '残りわずか' });
  });

  it('note が空文字/空白のみなら省略する', () => {
    const result = buildInventoryItemInput({ name: '砂糖', category: 'consumable', status: 'enough', note: '   ' });
    expect(result.note).toBeUndefined();
  });

  it('name が空ならエラー', () => {
    expect(() => buildInventoryItemInput({ name: '   ', category: 'consumable', status: 'enough' })).toThrow(
      '品目名を入力してください'
    );
  });
});

describe('ラベル定数', () => {
  it('全 status / category にラベルがある', () => {
    expect(STATUS_LABELS.enough).toBe('十分');
    expect(STATUS_LABELS.low).toBe('少ない');
    expect(STATUS_LABELS.out).toBe('切れた');
    expect(CATEGORY_LABELS['green-bean']).toBe('生豆');
    expect(CATEGORY_LABELS.material).toBe('資材');
    expect(CATEGORY_LABELS.consumable).toBe('消耗品');
  });
});

describe('formatUpdatedBy', () => {
  it('メール形式なら @ より前のローカル部だけを返す', () => {
    expect(formatUpdatedBy('kensaku.ikeda04@gmail.com')).toBe('kensaku.ikeda04');
  });

  it('@ を含まない表示名はそのまま返す', () => {
    expect(formatUpdatedBy('池田')).toBe('池田');
  });

  it('先頭が @ の場合はそのまま返す(ローカル部が空にならないようにする)', () => {
    expect(formatUpdatedBy('@handle')).toBe('@handle');
  });
});
