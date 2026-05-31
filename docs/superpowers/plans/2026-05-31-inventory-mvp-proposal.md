# 在庫・不足品 提案用MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 現場の誰もがスマホで1タップ「これ足りない」を挙げられ、不足品が要発注リストに集まる体験を、提案用MVPとして動く形で作る。

**Architecture:** 生産記録v1の3層構造（純粋ロジック `lib/` → Firestore層 `lib/firestore/` → フック `hooks/` → UI `components/` + ページ `app/`）を踏襲。ただし在庫はトップレベル共有コレクション `inventory` の単層（月/userIdの階層なし）。要発注リストは品目の `status` から導出し、独立データを持たない。

**Tech Stack:** Next.js 16 App Router / React 19 / TypeScript 5 strict / Firebase Firestore / Tailwind v4 / 共通UI `@/components/ui`。

**位置づけ:** 提案用MVP。ブランチ `feat/inventory-mvp-proposal`。**main へマージしない。本番 Firestore Rules はデプロイしない。** 仕様: `docs/superpowers/specs/2026-05-31-inventory-mvp-proposal-design.md`。

**検証:** ローカルは `npm run build && npm run test:run`、コミット前に `npm run format:check`。テストは Vitest（`*.test.ts(x)`）。

---

## File Structure

| ファイル | 責務 | 区分 |
|---|---|---|
| `types/inventory.ts` | 在庫の型定義（InventoryItem, InventoryStatus 等） | 新規 |
| `types/index.ts` | `export * from './inventory'` を追記 | 変更 |
| `lib/inventory.ts` | 純粋ロジック（正規化・バリデーション・要発注導出・ラベル定数） | 新規 |
| `lib/inventory.test.ts` | 純粋ロジックのテスト | 新規 |
| `lib/firestore/inventory.ts` | Firestore I/O（購読・追加・更新・状態変更・削除） | 新規 |
| `lib/firestore/inventory.test.ts` | Firestore層のテスト（モック） | 新規 |
| `lib/firestore/index.ts` | inventory の re-export を追記 | 変更 |
| `hooks/useInventory.ts` | `inventory` 購読フック → `{ items, isLoading }` | 新規 |
| `hooks/useInventory.test.ts` | フックのテスト | 新規 |
| `components/inventory/StatusToggle.tsx` | 信号機3択トグル（タップで status 変更） | 新規 |
| `components/inventory/InventoryItemModal.tsx` | 品目の追加/編集モーダル | 新規 |
| `components/inventory/ReorderList.tsx` | 要発注リスト（🟡🔴を表示＋対応済みボタン） | 新規 |
| `app/inventory/page.tsx` | 在庫ページ（一覧＋要発注＋追加導線） | 新規 |
| `app/inventory/page.test.tsx` | ページ統合テスト | 新規 |
| `app/page.tsx` | ホーム機能カードに「在庫」を追加し要発注件数バッジを表示 | 変更 |

依存方向 `types/ → lib/ → hooks/ → components/ → app/` を厳守。循環依存を作らない。

---

## Task 1: 型定義（types/inventory.ts）

**Files:**
- Create: `types/inventory.ts`
- Modify: `types/index.ts`

- [ ] **Step 1: 型ファイルを作成**

`types/inventory.ts`:

```typescript
import type { FirestoreTimestamp } from './common';

export type InventoryStatus = 'enough' | 'low' | 'out';

export type InventoryCategory = 'green-bean' | 'material' | 'consumable';

export interface InventoryItemInput {
  name: string;
  category: InventoryCategory;
  status: InventoryStatus;
  note?: string;
}

export interface InventoryItem extends InventoryItemInput {
  id: string;
  updatedBy: string;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}
```

- [ ] **Step 2: バレルエクスポートに追記**

`types/index.ts` の末尾に1行追加:

```typescript
export * from './inventory';
```

- [ ] **Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし（PASS）

- [ ] **Step 4: Commit**

```bash
git add types/inventory.ts types/index.ts
git commit -m "feat: 在庫MVPの型定義を追加"
```

---

## Task 2: 純粋ロジック（lib/inventory.ts）

`status` の正規化・バリデーション・要発注導出・表示ラベルを、Firestore に依存しない純粋関数で実装する。

**Files:**
- Create: `lib/inventory.test.ts`
- Create: `lib/inventory.ts`

- [ ] **Step 1: 失敗するテストを書く**

`lib/inventory.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  isReorderStatus,
  selectReorderItems,
  countReorderItems,
  normalizeInventoryStatus,
  normalizeInventoryCategory,
  buildInventoryItemInput,
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
  it('low と out だけを抽出し件数を返す', () => {
    const items = [makeItem('a', 'enough'), makeItem('b', 'low'), makeItem('c', 'out')];
    expect(selectReorderItems(items).map((i) => i.id)).toEqual(['b', 'c']);
    expect(countReorderItems(items)).toBe(2);
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
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npm run test:run -- lib/inventory.test.ts`
Expected: FAIL（`./inventory` が存在しない）

- [ ] **Step 3: 純粋ロジックを実装**

`lib/inventory.ts`:

```typescript
import type { InventoryCategory, InventoryItem, InventoryItemInput, InventoryStatus } from '@/types';

export const STATUS_LABELS: Record<InventoryStatus, string> = {
  enough: '十分',
  low: '少ない',
  out: '切れた',
};

export const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  'green-bean': '生豆',
  material: '資材',
  consumable: '消耗品',
};

const VALID_STATUSES: InventoryStatus[] = ['enough', 'low', 'out'];
const VALID_CATEGORIES: InventoryCategory[] = ['green-bean', 'material', 'consumable'];

export function normalizeInventoryStatus(value: unknown): InventoryStatus {
  return VALID_STATUSES.includes(value as InventoryStatus) ? (value as InventoryStatus) : 'enough';
}

export function normalizeInventoryCategory(value: unknown): InventoryCategory {
  return VALID_CATEGORIES.includes(value as InventoryCategory) ? (value as InventoryCategory) : 'consumable';
}

/** low / out が「要発注」状態 */
export function isReorderStatus(status: InventoryStatus): boolean {
  return status === 'low' || status === 'out';
}

export function selectReorderItems(items: InventoryItem[]): InventoryItem[] {
  return items.filter((item) => isReorderStatus(item.status));
}

export function countReorderItems(items: InventoryItem[]): number {
  return selectReorderItems(items).length;
}

/**
 * 入力を正規化し保存可能な形にする。
 * name をトリムし空なら例外。note は空白のみなら省略。status/category を正規化。
 */
export function buildInventoryItemInput(input: InventoryItemInput): InventoryItemInput {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new Error('品目名を入力してください');
  }
  const note = input.note?.trim();
  const result: InventoryItemInput = {
    name,
    category: normalizeInventoryCategory(input.category),
    status: normalizeInventoryStatus(input.status),
  };
  if (note && note.length > 0) {
    result.note = note;
  }
  return result;
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npm run test:run -- lib/inventory.test.ts`
Expected: PASS（全テスト緑）

- [ ] **Step 5: Commit**

```bash
git add lib/inventory.ts lib/inventory.test.ts
git commit -m "feat: 在庫MVPの純粋ロジック(正規化・要発注導出)を追加"
```

---

## Task 3: Firestore層（lib/firestore/inventory.ts）

トップレベル `inventory` コレクションの購読・追加・更新・状態変更・削除。生産記録の `lib/firestore/productionRecords.ts` を雛形にするが、月/userId 階層はない。

**Files:**
- Create: `lib/firestore/inventory.test.ts`
- Create: `lib/firestore/inventory.ts`
- Modify: `lib/firestore/index.ts`

- [ ] **Step 1: 失敗するテストを書く（firebase/firestore をモック）**

`lib/firestore/inventory.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAddDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockServerTimestamp = vi.fn(() => 'SERVER_TS');

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ __type: 'collection' })),
  doc: vi.fn(() => ({ __type: 'doc' })),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(() => ({ __type: 'orderBy' })),
  query: vi.fn(() => ({ __type: 'query' })),
}));

vi.mock('./common', () => ({
  getDb: vi.fn(() => ({ __type: 'db' })),
  removeUndefinedFields: <T>(obj: T) => obj,
}));

import { addInventoryItem, setInventoryItemStatus, deleteInventoryItem } from './inventory';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('addInventoryItem', () => {
  it('正規化した入力に updatedBy と createdAt/updatedAt を付けて addDoc する', async () => {
    await addInventoryItem({ name: ' ドリップ袋 ', category: 'material', status: 'low' }, 'tester');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const saved = mockAddDoc.mock.calls[0][1];
    expect(saved).toMatchObject({
      name: 'ドリップ袋',
      category: 'material',
      status: 'low',
      updatedBy: 'tester',
      createdAt: 'SERVER_TS',
      updatedAt: 'SERVER_TS',
    });
  });
});

describe('setInventoryItemStatus', () => {
  it('status と updatedBy と updatedAt を merge で更新する', async () => {
    await setInventoryItemStatus('item-1', 'out', 'tester');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, payload, options] = mockSetDoc.mock.calls[0];
    expect(payload).toMatchObject({ status: 'out', updatedBy: 'tester', updatedAt: 'SERVER_TS' });
    expect(options).toEqual({ merge: true });
  });
});

describe('deleteInventoryItem', () => {
  it('deleteDoc を呼ぶ', async () => {
    await deleteInventoryItem('item-1');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npm run test:run -- lib/firestore/inventory.test.ts`
Expected: FAIL（`./inventory` が存在しない）

- [ ] **Step 3: Firestore層を実装**

`lib/firestore/inventory.ts`:

```typescript
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb, removeUndefinedFields } from './common';
import { buildInventoryItemInput, normalizeInventoryCategory, normalizeInventoryStatus } from '@/lib/inventory';
import type { InventoryItem, InventoryItemInput } from '@/types';

export function getInventoryCollectionRef() {
  return collection(getDb(), 'inventory');
}

function normalizeInventoryItem(id: string, data: DocumentData): InventoryItem {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    category: normalizeInventoryCategory(data.category),
    status: normalizeInventoryStatus(data.status),
    note: typeof data.note === 'string' && data.note.trim().length > 0 ? data.note : undefined,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : '',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribeInventoryItems(
  callback: (items: InventoryItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const itemsQuery = query(getInventoryCollectionRef(), orderBy('createdAt', 'desc'));
  return onSnapshot(
    itemsQuery,
    (snapshot) => {
      callback(snapshot.docs.map((itemDoc) => normalizeInventoryItem(itemDoc.id, itemDoc.data())));
    },
    (error) => {
      console.error('Failed to subscribe inventory items:', error);
      onError?.(error);
      callback([]);
    }
  );
}

/** 新規品目を追加（自動ID）。 */
export async function addInventoryItem(input: InventoryItemInput, updatedBy: string): Promise<void> {
  const normalized = buildInventoryItemInput(input);
  await addDoc(
    getInventoryCollectionRef(),
    removeUndefinedFields({
      ...normalized,
      updatedBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
}

/** 既存品目の内容を更新（merge）。createdAt は触らない。 */
export async function updateInventoryItem(id: string, input: InventoryItemInput, updatedBy: string): Promise<void> {
  const normalized = buildInventoryItemInput(input);
  await setDoc(
    doc(getInventoryCollectionRef(), id),
    removeUndefinedFields({ ...normalized, updatedBy, updatedAt: serverTimestamp() }),
    { merge: true }
  );
}

/** ステータスだけを1タップ変更（merge）。 */
export async function setInventoryItemStatus(
  id: string,
  status: InventoryItem['status'],
  updatedBy: string
): Promise<void> {
  await setDoc(
    doc(getInventoryCollectionRef(), id),
    { status: normalizeInventoryStatus(status), updatedBy, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await deleteDoc(doc(getInventoryCollectionRef(), id));
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npm run test:run -- lib/firestore/inventory.test.ts`
Expected: PASS

- [ ] **Step 5: バレルエクスポートに追記**

`lib/firestore/index.ts` の末尾に追加:

```typescript
export {
  getInventoryCollectionRef,
  subscribeInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  setInventoryItemStatus,
  deleteInventoryItem,
} from './inventory';
```

- [ ] **Step 6: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 7: Commit**

```bash
git add lib/firestore/inventory.ts lib/firestore/inventory.test.ts lib/firestore/index.ts
git commit -m "feat: 在庫MVPのFirestore層(購読・追加・状態変更・削除)を追加"
```

---

## Task 4: 購読フック（hooks/useInventory.ts）

`hooks/useProductionRecord.ts` を雛形に、`inventory` を購読し `{ items, isLoading }` を返す。`queueMicrotask` と `set-state-in-effect` の扱いは既存パターンに合わせる。

**Files:**
- Create: `hooks/useInventory.test.ts`
- Create: `hooks/useInventory.ts`

- [ ] **Step 1: 失敗するテストを書く**

`hooks/useInventory.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockSubscribe = vi.fn();
vi.mock('@/lib/firestore', () => ({
  subscribeInventoryItems: (...args: unknown[]) => mockSubscribe(...args),
}));

import { useInventory } from './useInventory';
import type { InventoryItem } from '@/types';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useInventory', () => {
  it('購読のcallbackで受け取った items を返し、isLoading を解除する', async () => {
    const sample: InventoryItem[] = [
      { id: 'a', name: 'ドリップ袋', category: 'material', status: 'low', updatedBy: 'tester' },
    ];
    let captured: ((items: InventoryItem[]) => void) | undefined;
    mockSubscribe.mockImplementation((cb: (items: InventoryItem[]) => void) => {
      captured = cb;
      return () => {};
    });

    const { result } = renderHook(() => useInventory());
    expect(result.current.isLoading).toBe(true);

    act(() => {
      captured?.(sample);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.items).toEqual(sample);
    });
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npm run test:run -- hooks/useInventory.test.ts`
Expected: FAIL（`./useInventory` が存在しない）

- [ ] **Step 3: フックを実装**

`hooks/useInventory.ts`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { subscribeInventoryItems } from '@/lib/firestore';
import type { InventoryItem } from '@/types';

/**
 * トップレベル共有コレクション `inventory` をリアルタイム購読するフック。
 * @returns { items, isLoading }
 */
export function useInventory(): { items: InventoryItem[]; isLoading: boolean } {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 購読開始のローディング同期に必要
    setIsLoading(true);
    const unsubscribe = subscribeInventoryItems(
      (next) => {
        setItems(next);
        setIsLoading(false);
      },
      (error) => {
        console.error('Failed to subscribe inventory items:', error);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { items, isLoading };
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npm run test:run -- hooks/useInventory.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hooks/useInventory.ts hooks/useInventory.test.ts
git commit -m "feat: 在庫MVPの購読フックを追加"
```

---

## Task 5: 信号機トグル（components/inventory/StatusToggle.tsx）

3択（十分/少ない/切れた）を大きなタップ領域で表示し、選択中をハイライト。色はセマンティックCSS変数（ハードコード禁止）。共通 `Button` を使う。

**Files:**
- Create: `components/inventory/StatusToggle.tsx`

- [ ] **Step 1: コンポーネントを実装**

`components/inventory/StatusToggle.tsx`:

```tsx
'use client';

import { Button } from '@/components/ui';
import { STATUS_LABELS } from '@/lib/inventory';
import type { InventoryStatus } from '@/types';

const STATUS_ORDER: InventoryStatus[] = ['enough', 'low', 'out'];

// 選択中の見た目: enough=info(青系), low=warning, out=danger。未選択は ghost。
const SELECTED_VARIANT: Record<InventoryStatus, 'primary' | 'secondary'> = {
  enough: 'secondary',
  low: 'primary',
  out: 'primary',
};

interface StatusToggleProps {
  value: InventoryStatus;
  onChange: (status: InventoryStatus) => void;
  disabled?: boolean;
}

export function StatusToggle({ value, onChange, disabled }: StatusToggleProps) {
  return (
    <div className="flex gap-2" role="group" aria-label="在庫状態">
      {STATUS_ORDER.map((status) => {
        const selected = status === value;
        return (
          <Button
            key={status}
            type="button"
            variant={selected ? SELECTED_VARIANT[status] : 'ghost'}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(status)}
            className="flex-1"
          >
            {STATUS_LABELS[status]}
          </Button>
        );
      })}
    </div>
  );
}
```

> 注: `Button` の `variant` 取りうる値は `components/ui/Button.tsx` を確認して合わせること（primary/secondary/ghost を想定）。色の最終調整は実機スクショで行う（提案用MVPのため見栄え重視）。

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add components/inventory/StatusToggle.tsx
git commit -m "feat: 在庫状態の信号機トグルコンポーネントを追加"
```

---

## Task 6: 追加/編集モーダル（components/inventory/InventoryItemModal.tsx）

品目名・カテゴリ・状態・メモを入力。共通 `Modal`/`Input`/`Select`/`Textarea`/`Button` と `StatusToggle` を使う。保存は親から渡す `onSave` に正規化前の入力を渡す（保存処理・トーストは親が担当）。

**Files:**
- Create: `components/inventory/InventoryItemModal.tsx`

- [ ] **Step 1: コンポーネントを実装**

`components/inventory/InventoryItemModal.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Modal, Input, Select, Textarea, Button } from '@/components/ui';
import { StatusToggle } from './StatusToggle';
import { CATEGORY_LABELS } from '@/lib/inventory';
import type { InventoryCategory, InventoryItem, InventoryItemInput, InventoryStatus } from '@/types';

const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABELS) as InventoryCategory[]).map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

interface InventoryItemModalProps {
  open: boolean;
  initial?: InventoryItem | null;
  onClose: () => void;
  onSave: (input: InventoryItemInput) => void;
}

export function InventoryItemModal({ open, initial, onClose, onSave }: InventoryItemModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<InventoryCategory>(initial?.category ?? 'consumable');
  const [status, setStatus] = useState<InventoryStatus>(initial?.status ?? 'enough');
  const [note, setNote] = useState(initial?.note ?? '');

  const handleSave = () => {
    onSave({ name, category, status, note });
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? '品目を編集' : '品目を追加'}>
      <div className="flex flex-col gap-4">
        <Input label="品目名" value={name} onChange={(e) => setName(e.target.value)} placeholder="例: ドリップ袋" />
        <Select
          label="カテゴリ"
          value={category}
          options={CATEGORY_OPTIONS}
          onChange={(e) => setCategory(e.target.value as InventoryCategory)}
        />
        <div>
          <span className="mb-2 block text-sm text-ink-sub">状態</span>
          <StatusToggle value={status} onChange={setStatus} />
        </div>
        <Textarea label="メモ（任意）" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleSave}>
            保存
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

> 注: `Modal`/`Input`/`Select`/`Textarea` の prop 名（`open`/`onClose`/`title`/`options`/`label` 等）は `components/ui/` の各実装と `app/production-record/components/*Modal.tsx` の使用例で確認して合わせること。

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add components/inventory/InventoryItemModal.tsx
git commit -m "feat: 在庫品目の追加/編集モーダルを追加"
```

---

## Task 7: 要発注リスト（components/inventory/ReorderList.tsx）

🟡🔴の品目を `selectReorderItems` で抽出して表示。各行に `[対応済みにする]`（status を enough に戻す）ボタン。空なら `EmptyState`。

**Files:**
- Create: `components/inventory/ReorderList.tsx`

- [ ] **Step 1: コンポーネントを実装**

`components/inventory/ReorderList.tsx`:

```tsx
'use client';

import { Card, Button, Badge, EmptyState } from '@/components/ui';
import { selectReorderItems, STATUS_LABELS, CATEGORY_LABELS } from '@/lib/inventory';
import type { InventoryItem } from '@/types';

interface ReorderListProps {
  items: InventoryItem[];
  onResolve: (item: InventoryItem) => void;
}

export function ReorderList({ items, onResolve }: ReorderListProps) {
  const reorder = selectReorderItems(items);

  if (reorder.length === 0) {
    return <EmptyState title="要発注なし" description="不足している品目はありません" />;
  }

  return (
    <div className="flex flex-col gap-2">
      {reorder.map((item) => (
        <Card key={item.id} variant="table">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-ink">{item.name}</div>
              <div className="text-sm text-ink-sub">
                {CATEGORY_LABELS[item.category]}・<Badge>{STATUS_LABELS[item.status]}</Badge>
              </div>
            </div>
            <Button variant="secondary" onClick={() => onResolve(item)}>
              対応済みにする
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add components/inventory/ReorderList.tsx
git commit -m "feat: 要発注リストコンポーネントを追加"
```

---

## Task 8: 在庫ページ（app/inventory/page.tsx）

`useAuth` + `useInventory` で一覧と要発注リストを表示。品目の状態変更（StatusToggle）、追加/編集（モーダル）、削除、対応済み化を配線。保存処理は `lib/firestore` の関数を呼び、成功/失敗を `showToast` で通知（`app/production-record/page.tsx` の Toast 利用を踏襲）。

**Files:**
- Create: `app/inventory/page.tsx`
- Create: `app/inventory/page.test.tsx`

- [ ] **Step 1: 失敗するページ統合テストを書く**

`app/inventory/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { InventoryItem } from '@/types';

const mockUseAuth = vi.fn();
const mockUseInventory = vi.fn();

vi.mock('@/lib/auth', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/useInventory', () => ({ useInventory: () => mockUseInventory() }));
vi.mock('@/lib/firestore', () => ({
  addInventoryItem: vi.fn(),
  updateInventoryItem: vi.fn(),
  setInventoryItemStatus: vi.fn(),
  deleteInventoryItem: vi.fn(),
}));
vi.mock('@/components/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

import InventoryPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { uid: 'u1', displayName: '池田' }, loading: false });
});

describe('InventoryPage', () => {
  it('品目があれば一覧に名前を表示する', () => {
    const items: InventoryItem[] = [
      { id: 'a', name: 'ドリップ袋', category: 'material', status: 'low', updatedBy: '池田' },
    ];
    mockUseInventory.mockReturnValue({ items, isLoading: false });
    render(<InventoryPage />);
    expect(screen.getByText('ドリップ袋')).toBeInTheDocument();
  });

  it('要発注（low/out）の件数を見出しに表示する', () => {
    const items: InventoryItem[] = [
      { id: 'a', name: 'ドリップ袋', category: 'material', status: 'low', updatedBy: '池田' },
      { id: 'b', name: 'ラベル', category: 'consumable', status: 'out', updatedBy: '池田' },
      { id: 'c', name: '段ボール', category: 'material', status: 'enough', updatedBy: '池田' },
    ];
    mockUseInventory.mockReturnValue({ items, isLoading: false });
    render(<InventoryPage />);
    expect(screen.getByText(/要発注/)).toHaveTextContent('2');
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npm run test:run -- app/inventory/page.test.tsx`
Expected: FAIL（`./page` が存在しない）

- [ ] **Step 3: ページを実装**

`app/inventory/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { BackLink, Button, Card, Badge } from '@/components/ui';
import { StatusToggle } from '@/components/inventory/StatusToggle';
import { InventoryItemModal } from '@/components/inventory/InventoryItemModal';
import { ReorderList } from '@/components/inventory/ReorderList';
import { useAuth } from '@/lib/auth';
import { useInventory } from '@/hooks/useInventory';
import { useToast } from '@/components/Toast';
import {
  addInventoryItem,
  updateInventoryItem,
  setInventoryItemStatus,
  deleteInventoryItem,
} from '@/lib/firestore';
import { countReorderItems, CATEGORY_LABELS } from '@/lib/inventory';
import type { InventoryItem, InventoryItemInput, InventoryStatus } from '@/types';

export default function InventoryPage() {
  const { user, loading } = useAuth();
  const { items, isLoading } = useInventory();
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);

  const updatedBy = user?.displayName || user?.email || 'unknown';
  const reorderCount = countReorderItems(items);

  if (loading) {
    return <div className="p-6 text-ink-sub">読み込み中...</div>;
  }
  if (!user) {
    return <div className="p-6 text-ink-sub">ログインが必要です</div>;
  }

  const handleSave = async (input: InventoryItemInput) => {
    try {
      if (editing) {
        await updateInventoryItem(editing.id, input, updatedBy);
        showToast('品目を更新しました', 'success');
      } else {
        await addInventoryItem(input, updatedBy);
        showToast('品目を追加しました', 'success');
      }
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存に失敗しました', 'error');
    }
  };

  const handleStatusChange = async (item: InventoryItem, status: InventoryStatus) => {
    try {
      await setInventoryItemStatus(item.id, status, updatedBy);
    } catch {
      showToast('状態の更新に失敗しました', 'error');
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    try {
      await deleteInventoryItem(item.id);
      showToast('品目を削除しました', 'success');
    } catch {
      showToast('削除に失敗しました', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4">
      <BackLink href="/">ホーム</BackLink>
      <header className="my-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">
          在庫・不足品 <Badge>要発注 {reorderCount}</Badge>
        </h1>
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          品目を追加
        </Button>
      </header>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-ink">要発注リスト</h2>
        <ReorderList items={items} onResolve={(item) => handleStatusChange(item, 'enough')} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">すべての品目</h2>
        {isLoading ? (
          <div className="text-ink-sub">読み込み中...</div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <Card key={item.id} variant="table">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-ink">{item.name}</div>
                      <div className="text-sm text-ink-sub">{CATEGORY_LABELS[item.category]}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditing(item);
                          setModalOpen(true);
                        }}
                      >
                        編集
                      </Button>
                      <Button variant="ghost" onClick={() => handleDelete(item)}>
                        削除
                      </Button>
                    </div>
                  </div>
                  <StatusToggle value={item.status} onChange={(status) => handleStatusChange(item, status)} />
                  {item.updatedBy && <div className="text-xs text-ink-muted">最終更新: {item.updatedBy}</div>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <InventoryItemModal
        open={modalOpen}
        initial={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
```

> 注: `useToast`/`showToast` のシグネチャ（第2引数の型 `'success' | 'error' | 'info' | 'warning'` 等）は `components/Toast.tsx` と `app/production-record/page.tsx` の使用例に合わせること。`BackLink`/`Card`/`Modal` の prop も既存実装で確認する。

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npm run test:run -- app/inventory/page.test.tsx`
Expected: PASS（必要なら `InventoryItemModal` を `open=false` で非描画にするなど、テストが通るよう調整）

- [ ] **Step 5: Commit**

```bash
git add app/inventory/page.tsx app/inventory/page.test.tsx components/inventory/
git commit -m "feat: 在庫ページ(一覧・要発注・追加/編集/削除/状態変更)を追加"
```

---

## Task 9: ホーム導線とバッジ（app/page.tsx）

機能カード配列に「在庫」を追加し、要発注件数を `badge` に動的に流し込む。

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 現状の features 配列とレンダリングを確認**

Read `app/page.tsx`。`features` 配列（生産記録カードの定義）、`badge?` の使われ方、アイコン import の場所を把握する。アイコンは `react-icons` から在庫向けのもの（例: `BsBoxSeam` や `MdInventory2`）を import する。

- [ ] **Step 2: 在庫カードを features に追加**

生産記録カードの直後に追加（key/title/label/href/icon を既存パターンに合わせる）:

```tsx
{
  key: 'inventory',
  title: '在庫',
  label: 'INVENTORY',
  description: '不足品を共有・要発注',
  href: '/inventory',
  icon: MdInventory2, // ファイル先頭で import { MdInventory2 } from 'react-icons/md'
},
```

`ICON_MAP`（34-47行目相当）にも `inventory: MdInventory2,` を追加。

- [ ] **Step 3: 要発注件数バッジを配線**

`app/page.tsx` をクライアントコンポーネントとして、`useInventory` から `countReorderItems(items)` を求め、在庫カードの `badge` に件数（1以上のとき `String(count)`、0なら undefined）を渡す。

```tsx
import { useInventory } from '@/hooks/useInventory';
import { countReorderItems } from '@/lib/inventory';
// コンポーネント内:
const { items } = useInventory();
const reorderCount = countReorderItems(items);
// features をレンダリングする箇所で、key==='inventory' のカードに badge を差し込む:
//   const badge = feature.key === 'inventory' && reorderCount > 0 ? String(reorderCount) : feature.badge;
```

> 注: `app/page.tsx` が現状サーバー/クライアントどちらかを確認する。`useInventory` はクライアントフックなので、必要なら在庫バッジ部分を小さなクライアント子コンポーネント（例: `components/inventory/InventoryNavBadge.tsx`）に切り出してホームに差し込む形でもよい（既存の `app/page.tsx` の構成を壊さない方を選ぶ）。

- [ ] **Step 4: ビルドと型チェック**

Run: `npm run build`
Expected: 成功（静的エクスポートが通る）

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/inventory/
git commit -m "feat: ホームに在庫カードと要発注件数バッジを追加"
```

---

## Task 10: 提案デモ用の仕上げ

提案の場ですぐ見せられるよう、全体検証とデモ手順の整備。

**Files:**
- 検証のみ（必要に応じて軽微な調整）

- [ ] **Step 1: 全体検証**

Run:
```bash
npm run build
npm run test:run
npm run format:check
```
Expected: build 成功 / 全テスト PASS / format 差分なし（差分が出たら `npx prettier --write` で整形して再確認）

- [ ] **Step 2: 実機デモの確認（E2Eエミュレータ方式）**

本番 Firestore を汚さないため、生産記録v1で確立済みの **E2Eエミュレータ方式**（`firestore.e2e.rules` = allow if true）でローカル起動し、`/inventory` を手動操作して以下を確認:
- 品目追加 → 一覧表示
- StatusToggle で 少ない/切れた に変更 → 要発注リストに出る・ホームバッジが増える
- 対応済みにする → 一覧の status が 十分 に戻り要発注から消える
- 7テーマで表示崩れがないか

> 起動手順は `scripts/run-e2e.ts` / `lib/firebase.ts` の `NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR` 経路を参照（生産記録v1のメモ参照）。**本番 Rules はデプロイしない。**

- [ ] **Step 3: 最終コミット（必要時のみ）**

```bash
git add -A
git commit -m "chore: 在庫MVPの仕上げ(整形・デモ確認)"
```

---

## やらないこと（この計画のスコープ外）

- 本番 `firestore.rules` への `inventory` 追加・本番デプロイ（本採用判断後）
- `docs/steering/FEATURES.md` 等への正式追記（本採用判断後）
- main へのマージ・PR作成（ユーザー明示依頼かつ本採用後）
- 数量管理・消費ペース・生産記録連動・発注先/履歴・プッシュ通知

---

## Self-Review（記入済み）

- **Spec coverage**: §5.1共有リスト→Task5/8、§5.2要発注リスト→Task2(導出)/7、§5.3バッジ→Task9、§5.4状態遷移→Task3(setStatus)/8、§6受け入れ条件→Task8テスト、§7データ設計→Task1/3、§8 Rules→「やらないこと」で本採用後に明記、§12検証→Task2/3/4/8/10。網羅。
- **Placeholder scan**: 各コードステップに完全コードを記載。UIの prop 名は「既存実装で確認」と具体参照先を明示（プレースホルダではなく検証指示）。
- **Type consistency**: `InventoryStatus`/`InventoryCategory`/`InventoryItem`/`InventoryItemInput` は Task1 で定義し以降一貫。関数名 `selectReorderItems`/`countReorderItems`/`buildInventoryItemInput`/`subscribeInventoryItems`/`addInventoryItem`/`updateInventoryItem`/`setInventoryItemStatus`/`deleteInventoryItem` は定義タスクと利用タスクで一致。
