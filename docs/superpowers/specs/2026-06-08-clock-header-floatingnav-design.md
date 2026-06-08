# 時計ページのヘッダー改善（FloatingNav統一＋設定ボタン明確化）— 設計

- 日付: 2026-06-08
- 対象: `app/clock/page.tsx`、新規 `components/clock/ClockHeaderNav.tsx`
- きっかけ: 戻るボタンをアプリ共通の `FloatingNav` に統一したい。右上の「時計の設定（歯車）」「チャイム時刻設定」が何のボタンか分かりにくい。

## 背景・問題

時計ページ（`/clock`）のヘッダーは現在こうなっている。

- 左上: `BackLink href="/" variant="icon-only"`（素のシェブロン、他ページの戻ると見た目が不統一）
- 右上: `IconButton` 2つ（`MdSchedule`＝チャイム時刻設定、`HiCog6Tooth`＝時計の設定）。どちらも**素のアイコンのみ・ラベルなし**で、何のボタンか分かりにくい。

加えて、チャイム時刻設定の現状アイコン `MdSchedule` は**時計マーク**で、時計だらけのこの画面では紛らわしい。

## 制約・前提

- 時計ページは複数テーマ（白〜暗）を持つ没入型画面。UI部品はテーマ追従が必須。
  - テーマ色は `getThemeColors(theme)`（`lib/clockSettings.ts`）の `ThemeColors` から取得。
  - UI部品用に `uiBg`（テーマ追従の薄い背景）と `uiText`（テーマ追従の文字色）が既に用意されている。
- 規約 `local/no-raw-button`: 生 `<button>` ではなく `@/components/ui` の `Button`/`IconButton` を使う。
- `FloatingNav` コンポーネント自体は変更しない（アプリ標準のまま使う）。約20ページで共有されているため。
- ページ追加・削除ではないため、プライバシーポリシー／利用規約のバージョン更新は不要。

## 採用デザイン

### 戻るボタン

- 左上を `FloatingNav`（`backHref="/"`）に統一。アプリ共通の磨りガラス丸ボタン（`IoArrowBack`）。
- `BackLink` を置き換える。
- 補足: `FloatingNav` の戻るはアプリ標準の質感（`bg-surface/80`）で、時計テーマ色には追従しない。役割が「アプリ共通の戻る」であり、全ページで見た目が揃う方が利用者の学習に有利なため、これを許容する。`shadow-md` により白テーマでも視認できる。

### 右上の2ボタン

`FloatingNav` の `right` スロットに、ラベル付きのテーマ追従ピルを2つ並べる。

- 色: 背景＝`colors.uiBg`、文字／アイコン＝`colors.uiText`。**インラインstyle**で指定（テーマ値はランタイム取得のため）。全テーマで視認可。
- 実装: 規約に従い `Button`（`variant="ghost"`）を使い、`style` で `backgroundColor`/`color` を上書き、`className` で `!rounded-full` とサイズ調整。`Button` の `min-h-[44px]` でタップ領域確保。
- 2つの内容:
  - **チャイム**: `MdNotificationsActive`（ベル＝音が鳴るを直感的に）＋「チャイム」ラベル。`onClick` で `WorkChimeScheduleModal` を開く。`aria-label="チャイム時刻設定"` 維持。
  - **表示**: `HiCog6Tooth`（歯車）＋「表示」ラベル。`onClick` で `ClockSettingsModal` を開く。`aria-label="時計の設定"` 維持。
- ラベルは「チャイム」「表示」で確定。

### コンポーネント分離

ナビを `components/clock/ClockHeaderNav.tsx` に切り出す。ページの重いロジック（`useWorkChime` 等）に触れずに単体テストできるようにするため。

- Props:
  - `colors: ThemeColors` — テーマ色（`uiBg`/`uiText` を使う）
  - `onOpenChimeSchedule: () => void`
  - `onOpenSettings: () => void`
- 描画: `<FloatingNav backHref="/" right={<>チャイムButton＋表示Button</>} />`
- 依存: `FloatingNav`（`@/components/ui`）、`Button`（`@/components/ui`）、`react-icons`（`MdNotificationsActive`/`HiCog6Tooth`）、`ThemeColors` 型。

`app/clock/page.tsx` 側は、左上 `BackLink` と右上の2つの `IconButton` ブロックを削除し、`<ClockHeaderNav colors={colors} onOpenChimeSchedule={() => setShowWorkChimeSchedule(true)} onOpenSettings={() => setShowSettings(true)} />` に置き換える。

## 変更範囲

- 新規: `components/clock/ClockHeaderNav.tsx`
- 新規: `components/clock/ClockHeaderNav.test.tsx`
- 変更: `app/clock/page.tsx`
  - `BackLink`・`IconButton`・`MdSchedule` の不要 import を削除（他で未使用であることを確認の上）。
  - `ClockHeaderNav` を import して使用。
  - 左上 `BackLink` ブロック（`absolute top-4 left-4 …`）と右上の2つの `IconButton` ブロック（`absolute … right-20` / `absolute … right-4`）を削除。

## スコープ外

- `FloatingNav` コンポーネント自体の変更。
- モーダルの中身（`ClockSettingsModal` / `WorkChimeScheduleModal`）、チャイムのロジック、時計表示。
- 右ボタンへアクセント色を足す等の追加装飾（今回は `uiBg`/`uiText` の落ち着いた見た目で確定）。

## テスト

`components/clock/ClockHeaderNav.test.tsx`（Vitest + Testing Library）:

- 「チャイム」「表示」のラベルが表示される。
- 「チャイム」クリックで `onOpenChimeSchedule` が呼ばれる。
- 「表示」クリックで `onOpenSettings` が呼ばれる。
- 戻るリンク（`aria-label="戻る"` または href="/"）が存在する。

`colors` は最小のダミー（`uiBg`/`uiText` を含む `ThemeColors`）を渡す。
