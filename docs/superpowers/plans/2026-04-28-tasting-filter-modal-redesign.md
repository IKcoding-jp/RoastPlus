# フィルターモーダル UI 改善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `TastingSessionFilterModal` のUIを刷新し、ダークヘッダー・横並びチップ・リセット右上配置・シンプルフッターを実装する。

**Architecture:** `components/TastingSessionFilterModal.tsx` のみを変更する。Button コンポーネントは変更しない（チップはネイティブ `<button>` + Tailwind クラスで実装）。フィルターロジック（`useTastingFilters`）は一切触らない。

**Tech Stack:** React 19, TypeScript 5, Tailwind CSS v4, Framer Motion, Phosphor Icons, Vitest + Testing Library

---

## ファイルマップ

| ファイル | 変更種別 | 内容 |
|--------|---------|------|
| `components/TastingSessionFilterModal.tsx` | Modify | UIを全面刷新 |
| `components/TastingSessionFilterModal.test.tsx` | Create | 新規テスト作成 |

---

## Task 1: テストファイルを作成して失敗させる

**Files:**
- Create: `components/TastingSessionFilterModal.test.tsx`

- [ ] **Step 1: テストファイルを作成する**

```tsx
// components/TastingSessionFilterModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TastingSessionFilterModal } from './TastingSessionFilterModal';

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  searchQuery: '',
  sortOption: 'newest' as const,
  dateFrom: '',
  dateTo: '',
  selectedRoastLevels: [] as Array<'浅煎り' | '中煎り' | '中深煎り' | '深煎り'>,
  onApply: vi.fn(),
};

describe('TastingSessionFilterModal', () => {
  describe('ヘッダー', () => {
    it('ダークヘッダーにフィルター設定タイトルを表示する', () => {
      render(<TastingSessionFilterModal {...baseProps} />);
      expect(screen.getByText('フィルター設定')).toBeInTheDocument();
    });

    it('フィルター未適用時はリセットボタンを表示しない', () => {
      render(<TastingSessionFilterModal {...baseProps} />);
      expect(screen.queryByText('リセット')).not.toBeInTheDocument();
    });

    it('フィルター適用中はリセットボタンをヘッダーに表示する', () => {
      render(
        <TastingSessionFilterModal
          {...baseProps}
          searchQuery="ブラジル"
        />
      );
      expect(screen.getByText('リセット')).toBeInTheDocument();
    });

    it('リセットボタンを押すと全フィルターがリセットされる', () => {
      const onApply = vi.fn();
      render(
        <TastingSessionFilterModal
          {...baseProps}
          searchQuery="ブラジル"
          onApply={onApply}
        />
      );
      fireEvent.click(screen.getByText('リセット'));
      // リセット後に適用ボタンを押す
      fireEvent.click(screen.getByText('適用'));
      expect(onApply).toHaveBeenCalledWith({
        searchQuery: '',
        sortOption: 'newest',
        dateFrom: '',
        dateTo: '',
        selectedRoastLevels: [],
      });
    });
  });

  describe('並び替えチップ', () => {
    it('新しい順・古い順・名前順の3つを表示する', () => {
      render(<TastingSessionFilterModal {...baseProps} />);
      expect(screen.getByRole('button', { name: '新しい順' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '古い順' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '名前順' })).toBeInTheDocument();
    });

    it('現在の sortOption に対応するチップが選択状態になる', () => {
      render(
        <TastingSessionFilterModal {...baseProps} sortOption="oldest" />
      );
      const oldestBtn = screen.getByRole('button', { name: '古い順' });
      expect(oldestBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('チップをクリックすると sortOption が変わる', () => {
      const onApply = vi.fn();
      render(<TastingSessionFilterModal {...baseProps} onApply={onApply} />);
      fireEvent.click(screen.getByRole('button', { name: '古い順' }));
      fireEvent.click(screen.getByText('適用'));
      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ sortOption: 'oldest' })
      );
    });
  });

  describe('焙煎度合いチップ', () => {
    it('4つの焙煎度を表示する', () => {
      render(<TastingSessionFilterModal {...baseProps} />);
      expect(screen.getByRole('button', { name: '浅煎り' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '中煎り' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '中深煎り' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '深煎り' })).toBeInTheDocument();
    });

    it('選択中の焙煎度が aria-pressed="true" になる', () => {
      render(
        <TastingSessionFilterModal
          {...baseProps}
          selectedRoastLevels={['中深煎り']}
        />
      );
      expect(
        screen.getByRole('button', { name: '中深煎り' })
      ).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('フッター', () => {
    it('キャンセルと適用ボタンのみ表示する（リセット行はない）', () => {
      render(<TastingSessionFilterModal {...baseProps} />);
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
      expect(screen.getByText('適用')).toBeInTheDocument();
    });

    it('キャンセルを押すと onClose が呼ばれる', () => {
      const onClose = vi.fn();
      render(<TastingSessionFilterModal {...baseProps} onClose={onClose} />);
      fireEvent.click(screen.getByText('キャンセル'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('適用を押すと onApply が呼ばれてモーダルが閉じる', () => {
      const onApply = vi.fn();
      const onClose = vi.fn();
      render(
        <TastingSessionFilterModal
          {...baseProps}
          onApply={onApply}
          onClose={onClose}
        />
      );
      fireEvent.click(screen.getByText('適用'));
      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
```

- [ ] **Step 2: テストを実行して失敗することを確認する**

```bash
npx vitest run components/TastingSessionFilterModal.test.tsx
```

期待結果: テストファイルは存在するが、`リセット` がフッターにあったり `aria-pressed` が未実装なので複数テストが FAIL する。

---

## Task 2: モーダルヘッダーをダークブラウンに変更する

**Files:**
- Modify: `components/TastingSessionFilterModal.tsx`

- [ ] **Step 1: ヘッダー部分を書き換える**

`components/TastingSessionFilterModal.tsx` の `return` ブロック内、ヘッダー部分（現在の `{/* ヘッダー */}` セクション）を以下に置き換える:

```tsx
{/* ヘッダー */}
<div className="px-5 py-4 flex items-center justify-between bg-[#261a14]">
  <div className="flex items-center gap-3">
    <div className="p-1.5 rounded-xl bg-white/10">
      <Faders size={20} weight="fill" className="text-primary" />
    </div>
    <h2 className="text-[15px] font-bold text-white tracking-tight">フィルター設定</h2>
  </div>
  <div className="flex items-center gap-2">
    {hasActiveFilters && (
      <button
        type="button"
        onClick={handleReset}
        className="text-[11px] font-semibold text-white/50 underline underline-offset-2 hover:text-white/80 transition-colors"
      >
        リセット
      </button>
    )}
    <IconButton
      variant="ghost"
      onClick={onClose}
      aria-label="閉じる"
      className="text-white/60 hover:text-white hover:bg-white/10"
    >
      <X size={20} weight="bold" />
    </IconButton>
  </div>
</div>
```

> **確認:** `hasActiveFilters` は既に `return` の直前（行 104 付近）でコンポーネント本体に定義済みなので、移動は不要。JSX 内のヘッダーでそのまま使える。

- [ ] **Step 2: 関連するテストを実行して進捗確認**

```bash
npx vitest run components/TastingSessionFilterModal.test.tsx --reporter=verbose 2>&1 | head -40
```

期待結果: ヘッダー関連テスト（`ダークヘッダーにフィルター設定タイトルを表示する`, `フィルター未適用時はリセットボタンを表示しない`, `フィルター適用中はリセットボタンをヘッダーに表示する`）が PASS に変わる。

---

## Task 3: 並び替えセクションを横3列チップに変更する

**Files:**
- Modify: `components/TastingSessionFilterModal.tsx`

- [ ] **Step 1: 並び替えセクションを書き換える**

現在の `{/* ソート */}` セクション全体を以下に置き換える:

```tsx
{/* ソート */}
<div className="space-y-2">
  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-muted">
    <SortAscending size={16} weight="bold" />
    並び替え
  </label>
  <div className="grid grid-cols-3 gap-1.5">
    {(
      [
        { id: 'newest', label: '新しい順' },
        { id: 'oldest', label: '古い順' },
        { id: 'beanName', label: '名前順' },
      ] as const
    ).map((opt) => (
      <button
        key={opt.id}
        type="button"
        aria-pressed={tempSortOption === opt.id}
        onClick={() => setTempSortOption(opt.id)}
        className={`py-2 rounded-xl text-xs font-semibold text-center transition-colors ${
          tempSortOption === opt.id
            ? 'bg-spot text-white border border-spot shadow-sm'
            : 'bg-ground border border-edge text-ink-sub hover:border-edge-strong'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 2: テストを実行して並び替え関連テストが通ることを確認する**

```bash
npx vitest run components/TastingSessionFilterModal.test.tsx --reporter=verbose 2>&1 | head -50
```

期待結果: 並び替え関連テスト（`新しい順・古い順・名前順の3つを表示する`, `現在の sortOption に対応するチップが選択状態になる`, `チップをクリックすると sortOption が変わる`）が PASS。

---

## Task 4: 焙煎度合いセクションを4列グリッドチップに変更する

**Files:**
- Modify: `components/TastingSessionFilterModal.tsx`

- [ ] **Step 1: 焙煎度合いセクションを書き換える**

現在の `{/* 焙煎度合い */}` セクション全体を以下に置き換える:

```tsx
{/* 焙煎度合い */}
<div className="space-y-2 pb-2">
  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-muted">
    <Thermometer size={16} weight="bold" />
    焙煎度合い
  </label>
  <div className="grid grid-cols-4 gap-1.5">
    {ROAST_LEVELS.map((level) => (
      <button
        key={level}
        type="button"
        aria-pressed={tempSelectedRoastLevels.includes(level)}
        onClick={() => handleRoastLevelToggle(level)}
        className={`py-2 rounded-xl text-[11px] font-semibold text-center transition-colors ${
          tempSelectedRoastLevels.includes(level)
            ? 'bg-[#261a14] text-[#f5c89a] border border-[#261a14]'
            : 'bg-ground border border-edge text-ink-sub hover:border-edge-strong'
        }`}
      >
        {level}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 2: テストを実行して焙煎度関連テストが通ることを確認する**

```bash
npx vitest run components/TastingSessionFilterModal.test.tsx --reporter=verbose 2>&1 | head -60
```

期待結果: 焙煎度合い関連テスト（`4つの焙煎度を表示する`, `選択中の焙煎度が aria-pressed="true" になる`）が PASS。

---

## Task 5: フッターを簡素化してスクリムを強化する

**Files:**
- Modify: `components/TastingSessionFilterModal.tsx`

- [ ] **Step 1: フッターからリセット行を削除する**

現在の `{/* フッター */}` セクション全体を以下に置き換える:

```tsx
{/* フッター */}
<div className="p-5 pt-4 border-t flex gap-3 bg-ground border-edge">
  <Button
    variant="secondary"
    onClick={onClose}
    className="flex-1"
  >
    キャンセル
  </Button>
  <Button
    variant="primary"
    onClick={handleApply}
    className="flex-1"
  >
    適用
  </Button>
</div>
```

- [ ] **Step 2: スクリム（背景暗転）を強化する**

モーダル外枠のスクリム部分を変更する:

```tsx
// Before
className="absolute inset-0 bg-black/20"

// After
className="absolute inset-0 bg-black/40"
```

- [ ] **Step 3: 全テストを実行して全部 PASS することを確認する**

```bash
npx vitest run components/TastingSessionFilterModal.test.tsx
```

期待結果: 全テスト PASS。

---

## Task 6: ビルドと全テストを通してコミットする

**Files:**
- なし（検証のみ）

- [ ] **Step 1: TypeScript の型エラーがないことを確認する**

```bash
cd "D:/Dev/roastplus" && npx tsc --noEmit 2>&1 | head -20
```

期待結果: エラーなし（出力なし）。

- [ ] **Step 2: ビルドと全テストを実行する**

```bash
npm run build && npm run test:run
```

期待結果:
- ビルド: `Export successful` でエラーなし
- テスト: 全テスト PASS（新規追加テスト含む）

- [ ] **Step 3: コミットする**

```bash
git add components/TastingSessionFilterModal.tsx components/TastingSessionFilterModal.test.tsx
git commit -m "feat: フィルターモーダルUIを改善（ダークヘッダー・横チップ・リセット右上）"
```

---

## 完成後の見た目チェックリスト

ブラウザで `localhost:3000/tasting` を開き、フィルターボタンを押して確認する:

- [ ] モーダルヘッダーがダークブラウン（`#261a14`）になっている
- [ ] ヘッダーにフィルター設定タイトルとアンバーアイコンが表示される
- [ ] フィルター未適用時はリセットボタンが表示されない
- [ ] 検索に文字を入力するとリセットボタンがヘッダー右上に現れる
- [ ] 並び替えが横3列のチップで表示される
- [ ] 選択中のチップがアンバー（`bg-spot`）で表示される
- [ ] 焙煎度合いが4列グリッドで表示される
- [ ] 選択中の焙煎度がダークブラウン地+琥珀テキストで表示される
- [ ] フッターにキャンセルと適用のみ表示される（リセット行なし）
- [ ] 背景が十分暗くなっている（`bg-black/40`）
