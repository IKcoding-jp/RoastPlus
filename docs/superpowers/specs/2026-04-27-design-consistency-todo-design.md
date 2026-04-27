# 設計ドキュメント: デザイン統一 TODO管理

作成日: 2026-04-27

## 背景・目的

コードベース分析（DESIGN.md 生成時）により、38ページにわたって5種類のデザイン差異が存在することが判明した。
差異を放置するとテーマ切替が壊れるリスク・保守コストの増大につながるため、計画的に解消する。

## 解決する差異の種類

| # | 種類 | 具体例 | 検出パターン |
|---|------|--------|------------|
| 1 | アイコンライブラリ混在 | `phosphor-react` の `Plus` が `react-icons/hi` の `HiPlus` と混在 | `from 'phosphor-react'` |
| 2 | ボタン未使用 | 生 `<Link className="bg-btn-primary...">` を使用 | `className=".*bg-btn-primary` |
| 3 | カード未使用 | 生 `<div className="bg-surface rounded...">` を使用 | `className=".*bg-surface.*rounded` |
| 4 | ハードコードカラー | `bg-white`, `bg-gray-*`, `text-gray-*`, `bg-black` | 各パターンを個別 Grep |
| 5 | Viewport 不統一 | `h-screen` を使用（PWA では `h-dvh` 推奨） | `h-screen` |

## 管理ファイル

- **場所**: プロジェクトルート `TODO.md`
- **形式**: 自動スキャン結果を元にした「ページ × 行番号チケット」型
- **問題ゼロのページは記載しない**（要修正ページのみ掲載）

### TODO.md フォーマット

```markdown
# デザイン統一 進捗管理
スキャン日: YYYY-MM-DD

## 凡例
- 🔴 未着手
- 🟡 作業中（ブランチ: `style/#xxx-yyy`）
- ✅ 完了（PR: #xxx）

---

## Phase 1: 毎日使う画面（7ページ）

### app/drip-guide/page.tsx 🔴
- [ ] L7: `phosphor-react` の `Plus` → `react-icons/hi` の `HiPlus`
- [ ] L23: 生 `<Link className="bg-btn-primary...">` → `<Button variant="primary">`
- [ ] L18: `h-screen` → `h-dvh`

...（スキャン結果で埋める）

## Phase 2: サブページ・設定（18ページ）
...

## Phase 3: 静的・補助ページ（13ページ）
...
```

## ページ優先順位

### Phase 1 — 毎日使う画面（7ページ）

| ページ | パス |
|--------|------|
| 担当表 | `app/assignment/page.tsx` |
| 焙煎タイマー | `app/roast-timer/page.tsx` |
| テイスティング | `app/tasting/page.tsx` |
| ドリップガイド | `app/drip-guide/page.tsx` |
| コーヒークイズ | `app/coffee-trivia/page.tsx` |
| 作業進捗 | `app/progress/page.tsx` |
| スケジュール | `app/schedule/page.tsx` |

### Phase 2 — サブページ・設定（18ページ）

各機能の詳細・編集ページ、`settings/page.tsx`、`defect-beans/page.tsx`、`notifications/page.tsx`、`roast-record/page.tsx`、クイズサブページ、テイスティングサブページ、ドリップガイドサブページなど。

### Phase 3 — 静的・補助ページ（13ページ）

`login`、`privacy-policy`、`terms`、`changelog`、`contact`、`consent`、`brewing`、`clock`、`dev-stories`、`ui-test`、`dev/design-lab` など。

## 1ページあたりの作業フロー

```
① TODO.md でページを確認（差異の種類・行番号を見る）
② git checkout -b style/#[Issue番号]-[ページ名] でブランチ作成
③ 差異を修正（機能変更なし・見た目を変えないリファクタリング）
④ npm run build && npm run test:run で検証
⑤ PR作成 → IKさんが確認・マージ
⑥ TODO.md の該当ページ行に ✅ と PR番号を記入
```

## Issue管理方針

- 統括 Issue を 1 つ `/issue-creator` で払い出す
- 各ページ修正は `style/#[統括Issue番号]-[ページ名]` ブランチで作業
- PR タイトル例: `style(#xxx): drip-guide/page.tsx デザイン統一（phosphor-react 除去・Button化）`

## 実装の制約

- **機能変更禁止**: リファクタリングのみ。UI の見た目・動作は変えない
- **テスト**: `npm run build && npm run test:run` がパスすること（lint は Husky が自動実行）
- **1PR 1ページ**: IKさんがページ単位で確認できるよう、ページをまたいだ PR は作らない

## 参照ドキュメント

- `DESIGN.md` — デザインパターンの正解定義
- `.claude/skills/roastplus-ui/references/design-tokens.md` — CSS変数完全一覧
- `.claude/skills/roastplus-ui/references/components.md` — コンポーネント API
