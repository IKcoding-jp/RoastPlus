# デザイン統一 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全38ページのデザイン差異（phosphor-react混在・生コンポーネント・ハードコードカラー等）を検出してTODO.mdに記録し、Phase 1の7ページを1ページ1PRで修正する

**Architecture:** GrepスキャンでTODO.mdを自動生成 → 各ページを独立ブランチで修正 → PRごとにIKさんが確認・マージ。機能変更なし・純粋なリファクタリング。

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, `@/components/ui`（カスタム）, `react-icons/hi`

---

## 修正パターン早見表

作業中に参照するコード変換の正解を先にまとめる。

### パターン1: phosphor-react → react-icons

```tsx
// BEFORE
import { Plus } from 'phosphor-react';
<Plus size={20} />

// AFTER
import { HiPlus } from 'react-icons/hi';
<HiPlus size={20} />
```

他のアイコン対応表:
| phosphor-react | react-icons/hi |
|----------------|----------------|
| `Plus` | `HiPlus` |
| `X` | `HiX` |
| `Check` | `HiCheck` |
| `Trash` | `HiTrash` |
| `Pencil` | `HiPencil` |
| `ArrowLeft` | `HiArrowLeft` |

### パターン2: 生Linkボタン → セマンティックトークン整理版 Link

`@/components/ui/Button` は `as` prop を持たないため、Linkはそのまま維持しつつクラスをセマンティックトークンで整理する。`bg-btn-primary` はセマンティックトークンなので使用可。

```tsx
// BEFORE（問題: flex/padding等が冗長・不統一）
import Link from 'next/link';
<Link
  href="/drip-guide/new"
  className="flex items-center gap-2 bg-btn-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-btn-primary-hover transition-colors shadow-sm min-h-[44px]"
>
  <Plus size={20} />
  <span className="hidden sm:inline">新規レシピ</span>
</Link>

// AFTER（セマンティックトークンのみ使用・統一されたクラス構成）
import Link from 'next/link';
import { HiPlus } from 'react-icons/hi';
<Link
  href="/drip-guide/new"
  className="inline-flex items-center gap-2 bg-btn-primary hover:bg-btn-primary-hover text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm min-h-[44px]"
>
  <HiPlus size={20} />
  <span className="hidden sm:inline">新規レシピ</span>
</Link>
```

### パターン3: 生divカード → Card コンポーネント

```tsx
// BEFORE
<div className="bg-surface rounded-lg shadow-sm border border-edge p-6 hover:shadow-card-hover hover:border-edge-strong transition-all">

// AFTER
import { Card } from '@/components/ui';
<Card variant="hoverable" className="p-6">
```

ただし `rounded-lg` → `rounded-2xl` に変わるため、見た目が微妙に変わる。
その場合は `variant="default"` を使い className で上書き:
```tsx
<Card variant="default" className="p-6">
```

### パターン4: ハードコードカラー → セマンティックトークン

| ハードコード | 置換先 |
|-------------|--------|
| `bg-white` | `bg-surface` |
| `bg-gray-50` / `bg-gray-100` | `bg-ground` |
| `text-gray-900` / `text-gray-800` | `text-ink` |
| `text-gray-600` / `text-gray-500` | `text-ink-sub` |
| `text-gray-400` / `text-gray-300` | `text-ink-muted` |
| `border-gray-200` / `border-gray-300` | `border-edge` |
| `bg-black` | `bg-header-bg`（ヘッダー文脈）or `bg-dark` |

### パターン5: h-screen → h-dvh

```tsx
// BEFORE
<div className="h-screen flex flex-col">

// AFTER
<div className="h-dvh flex flex-col">
```

---

## Task 1: 統括 Issue 作成 → 全ページスキャン → TODO.md 生成

**Files:**
- Create: `TODO.md`（プロジェクトルート）

- [ ] **Step 1: 統括 Issue を作成する**

`/issue-creator` スキルを起動し、以下の内容で Issue を作成する:

```
タイトル: デザイン統一: 全ページのデザイン差異を解消する
内容: DESIGN.mdに定義されたデザインシステムに従い、全38ページのデザイン差異
（phosphor-react混在・生コンポーネント・ハードコードカラー・h-screen）を解消する。
1ページ1PRで修正し、TODO.mdで進捗を管理する。
```

作成された Issue 番号を記録しておく（例: #361）。以降の手順で `[統括Issue番号]` と記載された箇所にこの番号を使う。

- [ ] **Step 2: phosphor-react 使用ページをスキャン**

```bash
grep -rn "from 'phosphor-react'" app/ --include="*.tsx" --include="*.ts"
```

結果をメモしておく（ファイルパスと行番号）。

- [ ] **Step 2: ハードコードカラーをスキャン**

```bash
grep -rn "bg-white\|bg-gray-\|text-gray-\|bg-black" app/ --include="*.tsx" | grep -v "node_modules"
```

- [ ] **Step 3: h-screen 使用ページをスキャン**

```bash
grep -rn "h-screen" app/ --include="*.tsx"
```

- [ ] **Step 4: 生ボタン（bg-btn-primary）使用ページをスキャン**

```bash
grep -rn "bg-btn-primary" app/ --include="*.tsx"
```

- [ ] **Step 5: 生カード（bg-surface.*rounded）使用ページをスキャン**

```bash
grep -rn "bg-surface" app/ --include="*.tsx" | grep "rounded"
```

- [ ] **Step 6: TODO.md を生成する**

スキャン結果を以下のフォーマットで `TODO.md` に書き出す:

```markdown
# デザイン統一 進捗管理
スキャン日: 2026-04-27

## 凡例
- 🔴 未着手
- 🟡 作業中（ブランチ: `style/#xxx-yyy`）
- ✅ 完了（PR: #xxx）

---

## Phase 1: 毎日使う画面（7ページ）

### app/drip-guide/page.tsx 🔴
- [ ] L7: `phosphor-react` の `Plus` → `react-icons/hi` の `HiPlus`
- [ ] L23: 生 `<Link className="bg-btn-primary...">` → セマンティックトークン版 Link（修正パターン2参照）
- [ ] L18: `h-screen` → `h-dvh`

### app/tasting/page.tsx 🔴
- [ ] L14: `phosphor-react` の `Plus` → `react-icons/hi` の `HiPlus`

...（スキャン結果で埋める）

## Phase 2: サブページ・設定（18ページ）
...

## Phase 3: 静的・補助ページ（13ページ）
...
```

問題がないページは記載しない。

- [ ] **Step 7: コミット**

```bash
git add TODO.md
git commit -m "chore: デザイン統一 TODO.md をスキャンで自動生成"
```

---

## Task 2: drip-guide/page.tsx の修正

**Files:**
- Modify: `app/drip-guide/page.tsx`

**既知の差異（TODO.mdのL番号で確認後に作業）:**
1. `phosphor-react` の `Plus` を使用
2. `<Link className="bg-btn-primary...">` で生ボタンを作成
3. `h-screen` を使用

- [ ] **Step 1: ブランチ作成**

```bash
git checkout -b style/#[統括Issue番号]-drip-guide
```

- [ ] **Step 2: phosphor-react を react-icons に置換**

`app/drip-guide/page.tsx` の import を変更:

```tsx
// BEFORE
import { Plus } from 'phosphor-react';

// AFTER
import { HiPlus } from 'react-icons/hi';
```

JSX内の `<Plus size={20} />` を `<HiPlus size={20} />` に変更。

- [ ] **Step 3: 生Linkボタンをセマンティックトークン版に修正**

```tsx
// BEFORE
<Link
  href="/drip-guide/new"
  className="flex items-center gap-2 bg-btn-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-btn-primary-hover transition-colors shadow-sm min-h-[44px]"
>
  <Plus size={20} />
  <span className="hidden sm:inline">新規レシピ</span>
</Link>

// AFTER
<Link
  href="/drip-guide/new"
  className="inline-flex items-center gap-2 bg-btn-primary hover:bg-btn-primary-hover text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm min-h-[44px]"
>
  <HiPlus size={20} />
  <span className="hidden sm:inline">新規レシピ</span>
</Link>
```

- [ ] **Step 4: h-screen → h-dvh に変更**

```tsx
// BEFORE
<div className="h-screen overflow-y-hidden flex flex-col ...">

// AFTER
<div className="h-dvh overflow-y-hidden flex flex-col ...">
```

- [ ] **Step 5: TODO.mdのハードコードカラーを確認し修正**

Task 1のスキャン結果でこのファイルにハードコードカラーがあれば修正パターン4に従い変換する。

- [ ] **Step 6: ビルドとテストで検証**

```bash
npm run build && npm run test:run
```

期待値: エラーなし・テスト全パス

- [ ] **Step 7: コミット**

```bash
git add app/drip-guide/page.tsx
git commit -m "style(#[Issue番号]): drip-guide/page.tsx デザイン統一（phosphor-react除去・h-dvh化）"
```

- [ ] **Step 8: PR作成**

```bash
gh pr create \
  --title "style(#[Issue番号]): drip-guide/page.tsx デザイン統一" \
  --body "$(cat <<'EOF'
## 変更内容
- `phosphor-react` の `Plus` → `react-icons/hi` の `HiPlus` に統一
- 生Linkボタンのクラスをセマンティックトークンに整理
- `h-screen` → `h-dvh`（PWA対応）

## 確認ポイント
- [ ] ドリップガイドページが正常に表示される
- [ ] 新規レシピボタンが動作する
- [ ] 見た目に変化がない
EOF
)"
```

- [ ] **Step 9: TODO.md を更新**

```markdown
### app/drip-guide/page.tsx ✅（PR: #[PR番号]）
```

---

## Task 3: tasting/page.tsx の修正

**Files:**
- Modify: `app/tasting/page.tsx`

- [ ] **Step 1: ブランチ作成**

```bash
git checkout main
git checkout -b style/#[統括Issue番号]-tasting
```

- [ ] **Step 2: phosphor-react を react-icons に置換**

```tsx
// BEFORE
import { Plus } from 'phosphor-react';

// AFTER
import { HiPlus } from 'react-icons/hi';
```

JSX内の `<Plus ... />` をすべて `<HiPlus ... />` に変更。

- [ ] **Step 3: TODO.mdの他の差異を確認・修正**

Task 1のスキャン結果でこのファイルに他の差異があれば修正パターン1〜5に従い変換する。

- [ ] **Step 4: ビルドとテストで検証**

```bash
npm run build && npm run test:run
```

期待値: エラーなし・テスト全パス

- [ ] **Step 5: コミット**

```bash
git add app/tasting/page.tsx
git commit -m "style(#[Issue番号]): tasting/page.tsx デザイン統一（phosphor-react除去）"
```

- [ ] **Step 6: PR作成**

```bash
gh pr create \
  --title "style(#[Issue番号]): tasting/page.tsx デザイン統一" \
  --body "$(cat <<'EOF'
## 変更内容
- `phosphor-react` の `Plus` → `react-icons/hi` の `HiPlus` に統一

## 確認ポイント
- [ ] テイスティングページが正常に表示される
- [ ] 見た目に変化がない
EOF
)"
```

- [ ] **Step 7: TODO.md を更新**

```markdown
### app/tasting/page.tsx ✅（PR: #[PR番号]）
```

---

## Task 4〜8: assignment / roast-timer / coffee-trivia / progress / schedule の修正

**各ページ共通のフロー（Task 2・3と同一パターン）:**

- [ ] **Step 1: ブランチ作成**

```bash
git checkout main
git checkout -b style/#[統括Issue番号]-[ページ名]
```

- [ ] **Step 2: TODO.md で該当ページの差異を確認**

TODO.md（Task 1で生成）を開き、対象ページのチェックリストを確認する。

- [ ] **Step 3: 差異を修正**

TODO.mdに記載された各差異を、本計画の「修正パターン早見表」に従い変換する。

| TODO.mdの表記 | 参照パターン |
|---------------|------------|
| `phosphor-react` | パターン1 |
| 生Linkボタン / `bg-btn-primary` 直接使用 | パターン2 |
| 生divカード / `bg-surface rounded` 直接使用 | パターン3 |
| `bg-white` / `bg-gray-` / `text-gray-` / `bg-black` | パターン4 |
| `h-screen` | パターン5 |

- [ ] **Step 4: ビルドとテストで検証**

```bash
npm run build && npm run test:run
```

期待値: エラーなし・テスト全パス

- [ ] **Step 5: コミット**

```bash
git add app/[ページ名]/page.tsx
git commit -m "style(#[Issue番号]): [ページ名]/page.tsx デザイン統一（[差異の概要]）"
```

- [ ] **Step 6: PR作成**

```bash
gh pr create \
  --title "style(#[Issue番号]): [ページ名]/page.tsx デザイン統一" \
  --body "$(cat <<'EOF'
## 変更内容
- [TODO.mdに記載の差異を箇条書き]

## 確認ポイント
- [ ] ページが正常に表示される
- [ ] 見た目に変化がない
EOF
)"
```

- [ ] **Step 7: TODO.md を更新**

対象ページの行を `✅（PR: #[PR番号]）` に更新してコミット:

```bash
git add TODO.md
git commit -m "chore: TODO.md 更新（[ページ名] 完了）"
```

---

## 完了条件

- [ ] TODO.md が生成されている（スキャン結果が記録されている）
- [ ] Phase 1の7ページがすべて `✅` になっている
- [ ] 各ページのPR番号がTODO.mdに記録されている
- [ ] `npm run build && npm run test:run` がパスしている
- [ ] Phase 2・3は TODO.md に記録されており、次セッションで着手可能な状態
