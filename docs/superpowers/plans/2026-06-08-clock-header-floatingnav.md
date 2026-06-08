# 時計ページのヘッダー改善（FloatingNav統一＋設定ボタン明確化）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 時計ページの戻るを `FloatingNav` に統一し、右上の設定2ボタンをラベル付きテーマ追従ピル（ベル「チャイム」／歯車「表示」）にして何のボタンか分かるようにする。

**Architecture:** ナビを新規 `components/clock/ClockHeaderNav.tsx` に切り出し、単体テストする。`app/clock/page.tsx` は左上 `BackLink` と右上の2つの `IconButton` ブロックを削除し、`ClockHeaderNav` に置き換える。右ボタンの色はテーマ追従トークン `colors.uiBg`/`colors.uiText` をインラインstyleで指定し全テーマで視認できるようにする。

**Tech Stack:** Next.js (App Router) / React / Tailwind CSS v4 / Vitest + Testing Library / react-icons (`MdNotificationsActive`, `HiCog6Tooth`) / 共有UI `FloatingNav`・`Button`

---

## File Structure

- Create: `components/clock/ClockHeaderNav.tsx` — 時計ページのヘッダーナビ（戻る＋設定2ボタン）。Props経由でモーダル開閉ハンドラとテーマ色を受け取る。
- Create: `components/clock/ClockHeaderNav.test.tsx` — ラベル表示・クリックハンドラ・戻るリンクの単体テスト。
- Modify: `app/clock/page.tsx` — ナビ3ブロックを `ClockHeaderNav` に置換、不要 import 削除。

スコープ外（変更しない）: `components/ui/FloatingNav.tsx`、`ClockSettingsModal`/`WorkChimeScheduleModal` の中身、時計表示ロジック。プライバシーポリシー／利用規約（ページ追加・削除ではないため不要）。

---

## Task 1: ClockHeaderNav コンポーネントを作成（TDD）

**Files:**
- Create: `components/clock/ClockHeaderNav.tsx`
- Test: `components/clock/ClockHeaderNav.test.tsx`

- [ ] **Step 1: 失敗するテストを書く**

`components/clock/ClockHeaderNav.test.tsx` を新規作成：

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ClockHeaderNav } from './ClockHeaderNav';
import type { ThemeColors } from '@/lib/clockSettings';

// next/link のモック（FloatingNav.test.tsx と同じ手法）
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const colors: ThemeColors = {
  bg: '#FFFFFF',
  text: '#211714',
  accent: '#D97706',
  accentSub: 'rgba(217, 119, 6, 0.7)',
  dateText: 'rgba(33, 23, 20, 0.6)',
  uiText: '#6B7280',
  uiBg: 'rgba(0, 0, 0, 0.05)',
};

describe('ClockHeaderNav', () => {
  it('「チャイム」「表示」ラベルと戻るリンクを表示する', () => {
    render(<ClockHeaderNav colors={colors} onOpenChimeSchedule={vi.fn()} onOpenSettings={vi.fn()} />);
    expect(screen.getByText('チャイム')).toBeInTheDocument();
    expect(screen.getByText('表示')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '戻る' })).toHaveAttribute('href', '/');
  });

  it('「チャイム」クリックで onOpenChimeSchedule が呼ばれる', () => {
    const onOpenChimeSchedule = vi.fn();
    render(<ClockHeaderNav colors={colors} onOpenChimeSchedule={onOpenChimeSchedule} onOpenSettings={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'チャイム時刻設定' }));
    expect(onOpenChimeSchedule).toHaveBeenCalledTimes(1);
  });

  it('「表示」クリックで onOpenSettings が呼ばれる', () => {
    const onOpenSettings = vi.fn();
    render(<ClockHeaderNav colors={colors} onOpenChimeSchedule={vi.fn()} onOpenSettings={onOpenSettings} />);
    fireEvent.click(screen.getByRole('button', { name: '時計の設定' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npx vitest run components/clock/ClockHeaderNav.test.tsx`
Expected: FAIL（`ClockHeaderNav` モジュールが存在しないため import エラー）。

- [ ] **Step 3: コンポーネントを実装**

`components/clock/ClockHeaderNav.tsx` を新規作成：

```tsx
'use client';

import { HiCog6Tooth } from 'react-icons/hi2';
import { MdNotificationsActive } from 'react-icons/md';
import { Button, FloatingNav } from '@/components/ui';
import type { ThemeColors } from '@/lib/clockSettings';

interface ClockHeaderNavProps {
  /** 現在の時計テーマ色（uiBg/uiText を使用） */
  colors: ThemeColors;
  /** チャイム時刻設定モーダルを開く */
  onOpenChimeSchedule: () => void;
  /** 時計の表示設定モーダルを開く */
  onOpenSettings: () => void;
}

/**
 * 時計ページのヘッダーナビ。
 * 左上＝アプリ共通の戻る（FloatingNav）、右上＝ラベル付きテーマ追従ピル2つ。
 */
export function ClockHeaderNav({ colors, onOpenChimeSchedule, onOpenSettings }: ClockHeaderNavProps) {
  // 規約 local/no-raw-button に従い Button を使用。色はテーマ追従のためインラインstyleで上書き。
  const pillClassName = 'gap-2 !rounded-full !px-3.5 active:scale-95';
  const pillStyle = { backgroundColor: colors.uiBg, color: colors.uiText };

  return (
    <FloatingNav
      backHref="/"
      right={
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenChimeSchedule}
            aria-label="チャイム時刻設定"
            className={pillClassName}
            style={pillStyle}
          >
            <MdNotificationsActive className="h-5 w-5" aria-hidden="true" />
            チャイム
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            aria-label="時計の設定"
            className={pillClassName}
            style={pillStyle}
          >
            <HiCog6Tooth className="h-5 w-5" aria-hidden="true" />
            表示
          </Button>
        </>
      }
    />
  );
}
```

- [ ] **Step 4: テストを実行して通過を確認**

Run: `npx vitest run components/clock/ClockHeaderNav.test.tsx`
Expected: 3テストすべて PASS。

- [ ] **Step 5: Lint・整形チェック**

Run: `npm run lint`
Expected: 新ファイルで警告・エラーなし（`no-raw-button` は `Button` 使用のため出ない）。

Run: `npm run format:check`
Expected: Pass。失敗時は `npx prettier --write components/clock/ClockHeaderNav.tsx components/clock/ClockHeaderNav.test.tsx` 後に再チェック。

- [ ] **Step 6: コミット**

> 注: プロジェクト方針により、コミットはユーザーの明示依頼がある場合のみ実行する。依頼が無ければ飛ばす。

```bash
git add components/clock/ClockHeaderNav.tsx components/clock/ClockHeaderNav.test.tsx
git commit -m "feat: 時計ヘッダーナビ ClockHeaderNav を追加（戻る統一＋ラベル付き設定ボタン）"
```

---

## Task 2: 時計ページに ClockHeaderNav を結線

**Files:**
- Modify: `app/clock/page.tsx`（import 行 4・5・6、ナビ3ブロック 156-176 付近）

- [ ] **Step 1: import を整理**

`app/clock/page.tsx` の冒頭 import を次のように変更する。

変更前（4〜6行目付近）:

```tsx
import { HiCog6Tooth } from 'react-icons/hi2';
import { MdSchedule, MdVolumeUp } from 'react-icons/md';
import { BackLink, Button, IconButton } from '@/components/ui';
```

変更後:

```tsx
import { MdVolumeUp } from 'react-icons/md';
import { Button } from '@/components/ui';
import { ClockHeaderNav } from '@/components/clock/ClockHeaderNav';
```

補足:
- `HiCog6Tooth` は `ClockHeaderNav` 側へ移動したのでページからは削除（react-icons/hi2 の import 行ごと削除）。
- `MdSchedule` は不使用（ベルに変更）なので削除。`MdVolumeUp` は音有効化ボタンで使うため残す。
- `BackLink`・`IconButton` は不使用になるため削除。`Button` は音有効化ボタンで使うため残す。

- [ ] **Step 2: ナビ3ブロックを ClockHeaderNav に置換**

`app/clock/page.tsx` の次のブロック（戻る＋右上2ボタン）を探す。

変更前:

```tsx
      {/* ヘッダー：戻るボタン＋設定ボタン */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <BackLink href="/" variant="icon-only" aria-label="ホームに戻る" />
      </div>

      <div className="absolute top-4 right-20 sm:top-6 sm:right-24">
        <IconButton
          variant="ghost"
          rounded
          onClick={() => setShowWorkChimeSchedule(true)}
          aria-label="チャイム時刻設定"
        >
          <MdSchedule className="h-6 w-6" style={{ color: colors.uiText }} />
        </IconButton>
      </div>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <IconButton variant="ghost" rounded onClick={() => setShowSettings(true)} aria-label="時計の設定">
          <HiCog6Tooth className="h-6 w-6" style={{ color: colors.uiText }} />
        </IconButton>
      </div>
```

変更後:

```tsx
      {/* ヘッダー：戻る（FloatingNav）＋設定2ボタン */}
      <ClockHeaderNav
        colors={colors}
        onOpenChimeSchedule={() => setShowWorkChimeSchedule(true)}
        onOpenSettings={() => setShowSettings(true)}
      />
```

- [ ] **Step 3: 型チェックとテスト（時計ページ周辺）**

Run: `npx tsc --noEmit`
Expected: `app/clock/page.tsx` と `components/clock/ClockHeaderNav.tsx` に型エラーなし（既存の無関係エラーがあっても本変更ファイルには出ないこと）。

Run: `npx vitest run components/clock/ClockHeaderNav.test.tsx`
Expected: 3テスト PASS（変更なしだが回帰確認）。

- [ ] **Step 4: Lint・整形チェック**

Run: `npm run lint`
Expected: `app/clock/page.tsx` に未使用 import 警告なし（`BackLink`/`IconButton`/`MdSchedule`/`HiCog6Tooth` を消し忘れていれば lint が検出する）。

Run: `npm run format:check`
Expected: Pass。失敗時は `npx prettier --write app/clock/page.tsx` 後に再チェック。

- [ ] **Step 5: コミット**

> 注: コミットはユーザーの明示依頼がある場合のみ。

```bash
git add app/clock/page.tsx
git commit -m "refactor: 時計ページのヘッダーを ClockHeaderNav に置き換え"
```

---

## 完了確認（手動）

- [ ] `npm run dev` で `/clock` を開き、左上が `FloatingNav` の丸い戻る、右上が「（ベル）チャイム」「（歯車）表示」のラベル付きピルになっている。
- [ ] 「チャイム」で時刻設定モーダル、「表示」で設定モーダルが開く。戻るでホームへ。
- [ ] 時計テーマを白・暗それぞれに切り替え、右ボタンが背景に対して視認できる（uiBg/uiText 追従）。

---

## 補足: クラスが効かない場合のフォールバック

`!rounded-full` 等の先頭 `!`（Tailwind v4）が効かない場合は、`Button` の角丸が `rounded-lg` のままになる。その場合は `style` に `borderRadius: 9999` を追加して丸める（色と同様インラインで確実化）。色（`backgroundColor`/`color`）はインラインstyle指定のため変種の影響を受けない。
