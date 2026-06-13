# Implementation Guidelines

**最終更新**: 2026-06-05

---

## 目次

1. [開発フロー](#開発フロー)
2. [コーディング規約](#コーディング規約)
3. [UI実装ルール](#ui実装ルール)
4. [テスト戦略](#テスト戦略)
5. [Git運用](#git運用)
6. [ドキュメント運用](#ドキュメント運用)
7. [運用・障害対応](#運用障害対応)
8. [メンテナンス](#メンテナンス)

---

## 開発フロー

### 標準フロー（探索→計画→最小変更→検証型）

```
1. Issue本文とSteering Documents参照
   ↓
2. 関連ファイル・設定・既存テストを確認
   ↓
3. 目的、前提、影響範囲、成功条件、検証方法を整理
   ↓
4. Issue範囲に直結する最小変更を実装
   ↓
5. typecheck / lint / test / build など必要な検証
   ↓
6. 必要に応じてPR作成、変更内容と残リスクを報告
```

#### 1. 仕様・既存方針参照
- Issue本文・コメントで目的と背景を確認
- 仕様判断は `docs/steering/` を優先する
- 大きめの機能追加、業務フロー変更、データ構造変更、認証・認可・Rules・Functions に関わる変更では、実装前に `docs/superpowers/specs/` に仕様、`docs/superpowers/plans/` に実装計画を残す

#### 2. 関連ファイル確認
- 実装前に、対象ファイル、設定、既存テスト、README/steering docs を確認
- 検索は `rg` を優先し、コード理解が必要な場合は Serena 等のコード探索ツールを使う

#### 3. 計画立案
- 目的、前提、触る予定のファイル、影響する画面・データ、認証・Rules・Functionsへの影響、成功条件、検証方法を短く整理
- 不明点が仕様・データ・安全性・本番環境・費用に影響する場合は確認してから進める

#### 4. 実装
- Issue外の改善、隣接コードの整理、無関係なリファクタリングはしない
- 新しい依存関係や大きな設計変更は、必要性を説明してから判断する

#### 5. 検証
```bash
npm run typecheck
npm run lint
npm run security
npm run test:run
npm run test:rules
npm run build
```

#### 6. PR作成
- git-workflow スキルでコミット
- PR作成
- 長期方針や共通仕様が変わった場合は Steering Documents を更新

---

### TDD型フロー（コード変更のデフォルト）

**コード変更を含む実装では、TDDが基本。** 詳細は `superpowers:test-driven-development` スキルを参照。

```
1. テスト設計（仕様・受け入れ条件 or 対象コード分析）
   ↓
2. 🔴 Red: 失敗テスト作成 → コミット
   ↓
3. 🟢 Green: テスト合格する最小実装 → コミット
   ↓
4. 🔵 Refactor: テスト維持したまま改善 → コミット（必要時のみ）
```

**TDD必須の対象**:
- ビジネスロジック実装（`lib/`）
- カスタムフック実装（`hooks/`）
- コンポーネントのロジック部分（`components/`）
- バグ修正（回帰テスト作成）

**TDD対象外**:
- ビジュアル調整のみ → ビジュアル反復型フロー
- `docs/`, `chore` → そのまま編集

#### SDD × TDD 統合フロー

```
Issue / 現場課題
      ↓
docs/steering/ で既存方針・機能仕様・技術制約を確認
      ↓
docs/superpowers/specs/ に仕様・受け入れ条件を作成
      ↓
docs/superpowers/plans/ に実装計画を作成
      ↓
TDDで実装（Red → Green → Refactor）
      ↓
検証 → PR
```

- `docs/superpowers/specs/` の受け入れ条件がTDDのテスト設計インプットになる
- `/clear` 後も仕様と計画がGit上に残り、次のセッションが同じ前提で再開できる

---

### ビジュアル反復型フロー

```
1. UI実装
   ↓
2. Chrome DevTools MCPでスクショ確認
   ↓
3. 改善 → 再度スクショ
   ↓
4. 完成まで反復
```

**使用タイミング**:
- UI調整（レイアウト、配色、アニメーション）
- レスポンシブデザイン確認
- 全テーマ対応確認（ライト系・ダーク系でレイアウト崩れがないか）

---

## コーディング規約

### 命名規則

| 種類 | 規則 | 例 |
|-----|------|-----|
| コンポーネント | PascalCase | `PackageEntryModal`, `DripTimer` |
| 関数 | camelCase | `buildMonthlySummary`, `calculateRoastYield` |
| 変数 | camelCase | `isLoading`, `userData` |
| ブール値 | `is`, `has`, `should` 始まり | `isLoading`, `hasError`, `isDarkTheme` |
| 定数 | UPPER_SNAKE_CASE | `MAX_MEMBERS`, `DEFAULT_RECIPES` |
| 型/インターフェース | PascalCase | `DripRecipe`, `TastingSession` |
| ファイル（コンポーネント） | PascalCase | `RecipeCard.tsx` |
| ファイル（ユーティリティ） | camelCase | `dateUtils.ts` |

---

### インポート順序

```typescript
// 1. 外部ライブラリ
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 2. ローカルコンポーネント・モジュール（相対パス）
import { StepInfo } from './StepInfo';
import { calculateRecipe } from '@/lib/drip-guide/recipeCalculator';

// 3. 型（import type で明示）
import type { DripRecipe } from '@/lib/drip-guide/types';

// 4. 定数
import { DEFAULT_RECIPES } from '@/lib/drip-guide/mockData';
```

---

### 型定義方針

#### interface を使う場合
- オブジェクトの構造定義
- クラスが実装するコントラクト
- 拡張（extends）が必要な場合

```typescript
interface DripRecipe {
  id: string;
  name: string;
  beanAmount: number;
  waterAmount: number;
}

interface CustomDripRecipe extends DripRecipe {
  createdBy: string;
}
```

#### type を使う場合
- ユニオン型
- マッピング型（Record, Pick, Omit等）
- 関数型

```typescript
type RoastLevel = 'light' | 'medium' | 'dark';
type ScheduleType = 'roast' | 'clean' | 'preheat';
type OnSelectHandler = (id: string) => void;
```

---

### コンポーネント構成

```typescript
'use client';  // クライアントコンポーネントの場合のみ

import { useState } from 'react';
import type { Props } from './types';

// Props型定義（同ファイルまたは別ファイル）
interface ComponentProps {
  title: string;
  onAction?: () => void;
}

// コンポーネント本体
export function ComponentName({ title, onAction }: ComponentProps) {
  // 1. 状態管理
  const [state, setState] = useState(false);

  // 2. 副作用（useEffect等）
  useEffect(() => {
    // ...
  }, []);

  // 3. イベントハンドラ
  const handleClick = () => {
    onAction?.();
  };

  // 4. レンダリング
  return (
    <div>
      <h1>{title}</h1>
    </div>
  );
}
```

---

### コメント

```typescript
// 単行コメント（日本語可）

/**
 * 関数の説明（JSDoc形式）
 * @param value - パラメータの説明
 * @returns 戻り値の説明
 */
function calculateScore(value: number): number {
  // 処理
}

// TODO: 未実装タスク
// FIXME: 修正が必要な箇所
```

**コメントのルール**:
- 自明なコードにはコメント不要
- 複雑なロジックには必ずコメント
- 「なぜ」を書く（「何を」はコードが示す）

---

### Tailwind CSS

- ユーティリティクラスを直接使用
- 繰り返しパターンは変数化（`DIFFICULTY_STYLES`等）
- ブランドカラー: `#211714`（深茶色）

```typescript
const DIFFICULTY_STYLES = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800',
} as const;
```

### テーマ対応CSS変数ユーティリティ（推奨）

テーマ自動対応が必要な箇所では、ハードコード色の代わりにセマンティックユーティリティを使用:

```tsx
// ✅ 推奨: テーマ自動対応
<div className="bg-page text-ink border-edge">
  <p className="text-ink-sub">補足テキスト</p>
</div>

// ❌ 非推奨: ハードコード色（テーマ切替で色が変わらない）
<div className="bg-white text-gray-800 border-gray-200">
  <p className="text-gray-500">補足テキスト</p>
</div>
```

| ユーティリティ | 用途 |
|--------------|------|
| `bg-page` | ページ背景 |
| `bg-surface` | カード/パネル背景 |
| `bg-overlay` | モーダル背景 |
| `bg-ground` | セクション背景 |
| `bg-field` | 入力フィールド背景 |
| `text-ink` | 本文テキスト |
| `text-ink-sub` | 補足テキスト |
| `text-ink-muted` | 薄いテキスト |
| `border-edge` | 通常ボーダー |
| `border-edge-strong` | 強調ボーダー |
| `bg-spot` / `text-spot` | アクセントカラー（ボタン・タブ等のアクション要素） |
| `bg-header-bg` / `text-header-text` | コーヒー色アクセント（空状態アイコン・ホバー効果等の装飾要素） |

---

## UI実装ルール

> **正本**: `docs/steering/FEATURES.md`「共通UI（UI Components）」セクション参照。
> 以下はクイックリファレンス。

### 核心ルール
- **生のTailwindでボタン/カード/入力を作らない** → `@/components/ui` を使用
- **テーマ対応はCSS変数で自動** → `data-theme` 属性で7テーマ自動切替、テーマprop不要
- **モーダル背景は `bg-overlay`** → `bg-surface` はダークテーマで半透明のため禁止
- **ハードコード色（`bg-white`, `text-gray-800`等）禁止** → セマンティックトークン（`bg-page`, `text-ink`等）を使用
- **コーヒー色アクセントは `header-bg`** → `#4E3526` / `#211714` 等のハードコード禁止、`bg-header-bg` CSS変数を使用（7テーマ自動対応）
- **新規共通UI追加時は `components/ui/index.ts` へexportし、`.test.tsx` を追加** → 実装漏れをテストで検出

> **自動チェック**: ESLintカスタムルール（`no-raw-button`, `no-raw-checkbox`, `no-raw-select`）により、生のHTML要素の使用はlint時に自動検出される。共通UIコンポーネントの使用漏れを防止する。

---

### レスポンシブデザイン

- **iPad中心**: 現場設置のiPadで読みやすく、押しやすい表示を優先
- **補助端末対応**: 個人端末は補助操作、PCは保守・確認用途としてレスポンシブ対応

```tsx
<div className="flex flex-col md:flex-row">
  {/* 狭い画面: 縦並び、iPad/PC: 横並び */}
</div>
```

---

## テスト戦略

### テスト種別

| 種別 | 対象 | ツール |
|-----|------|--------|
| ユニットテスト | ロジック関数（`lib/`） | Vitest |
| 統合テスト | カスタムフック（`hooks/`） | Vitest + @testing-library/react |
| コンポーネントテスト | UIコンポーネント（`components/`） | Vitest + @testing-library/react |
| E2Eテスト（自動） | ユーザーフロー・レスポンシブ・a11y・パフォーマンス | Playwright + @axe-core/playwright |
| E2Eテスト（手動） | ビジュアル確認 | Chrome DevTools MCP |

---

### カバレッジ目標

| 対象 | 目標 | 現状（2026-02-21） |
|-----|------|-------------------|
| 全体 | 75%以上 | 76.19% |
| `lib/` | 90%以上 | 89.44% |
| `hooks/` | 85%以上 | 87.9% |

---

### ユニットテスト（Vitest）

#### ファイル命名
- `*.test.ts`, `*.test.tsx`

#### 基本パターン

```typescript
import { describe, it, expect } from 'vitest';
import { formatSecondsAsTimer } from '@/lib/dateUtils';

describe('formatSecondsAsTimer', () => {
  it('should format seconds correctly', () => {
    expect(formatSecondsAsTimer(60)).toBe('01:00');
  });

  it('should format minutes and seconds correctly', () => {
    expect(formatSecondsAsTimer(90)).toBe('01:30');
  });

  it('should handle zero seconds', () => {
    expect(formatSecondsAsTimer(0)).toBe('00:00');
  });
});
```

---

### 統合テスト（Hooks）

#### 非同期フックのテストパターン

```typescript
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '@/hooks/useMyHook';

test('should handle async operation', async () => {
  const { result } = renderHook(() => useMyHook());

  // isHydrated等の初期化を待つ
  await act(async () => {
    await vi.runAllTimersAsync();
  });

  // テスト実行
  await act(async () => {
    await result.current.someFunction();
  });

  expect(result.current.data).toBe('expected value');
});
```

---

### コンポーネントテスト（Testing Library）

#### 基本パターン

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui';

test('should render button label', () => {
  render(<Button>保存</Button>);

  expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
});

test('should call onClick when button clicked', () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>保存</Button>);

  fireEvent.click(screen.getByRole('button', { name: '保存' }));

  expect(onClick).toHaveBeenCalledTimes(1);
});
```

---

### E2Eテスト（Playwright）

#### ディレクトリ構成

```
e2e/
├── auth.setup.ts          # E2E用認証状態作成
├── e2e.env                # E2E用環境変数
├── essential.spec.ts      # 主要画面の最小導線
├── production-record.spec.ts # 生産記録の代表フロー
└── accessibility/
    └── a11y.spec.ts       # axe-core自動スキャン
```

#### 認証が必要なページのテストパターン

認証が必要なE2Eは、まず `e2e/auth.setup.ts` で認証状態を作成し、各specでその状態を使う。具体的な設定は `playwright.config.ts` と既存specを正とする。

#### コマンド

```bash
npm run test:e2e          # E2Eテスト実行
npm run test:e2e:ui       # UIモードで実行
npm run test:e2e:report   # レポート表示
```

#### ローカル実行時の開発サーバー

- E2E は既定で `http://localhost:3100` を使う。
- `npm run test:e2e` は `scripts/run-e2e.ts` で E2E 用の Next.js 開発サーバーを起動してから Playwright を実行する。
- ローカルでは `3100` に既存サーバーがある場合、そのサーバーを再利用する。
- CI では意図しないプロセスを使わないため、既存サーバーがある場合は失敗させる。
- Playwright 本体には `E2E_SKIP_WEB_SERVER=1` を渡し、Windows で Playwright 管理の dev server 終了待ちが詰まる問題を避ける。
- ユーザーの作業中プロセスを勝手に停止しない。衝突時は、まず次のコマンドで利用状況を確認する。

```powershell
Get-NetTCPConnection -LocalPort 3100 -ErrorAction SilentlyContinue
```

`3100` が別用途で埋まっている場合は、PowerShell で一時的に別ポートを指定する。

```powershell
$env:E2E_PORT = '3101'
npm run test:e2e
Remove-Item Env:E2E_PORT
```

---

### 重要なテストパターン

#### vi.mock の hoisting 問題

```typescript
// ❌ NG
const MOCK_DATA = { value: 123 };
vi.mock('@/module', () => ({ data: MOCK_DATA }));

// ✅ OK
vi.mock('@/module', () => ({ data: { value: 123 } }));
```

#### デバウンス処理のテスト

```typescript
vi.useFakeTimers();

await act(async () => {
  await debouncedFunction();
});

await act(async () => {
  vi.advanceTimersByTime(1000); // デバウンス時間
  await vi.runAllTimersAsync();
});
```

#### モックパスの完全一致

```typescript
// 実際のimportパス
import { calculateRecipe } from '@/lib/drip-guide/recipe';

// モックパス（完全一致必須）
vi.mock('@/lib/drip-guide/recipe', () => ({
  calculateRecipe: vi.fn(),
}));
```

詳細はプロジェクトメモリ参照

---

### テスト実行コマンド

```bash
# 1回だけユニット/コンポーネントテスト実行
npm run test:run

# ウォッチモード
npm run test

# カバレッジ付き
npm run test:coverage

# Firestore Rulesテスト
npm run test:rules

# E2Eテスト
npm run test:e2e

# 特定ファイルのみ
npm run test -- gamification.test.ts
```

---

## Git運用

### ブランチ戦略

- **mainブランチ**: 本番反映ブランチ
- **トピックブランチ**: `fix/#123-xxx`, `feat/#123-xxx`
- **⚠️ mainへの直接コミット禁止**

---

### コミットメッセージ（コンベンショナルコミット）

```
<type>(<scope>): <日本語で50文字以内の説明>

<body: 変更点を箇条書き>

Closes #123
```

#### タイプ

| タイプ | 用途 | 例 |
|--------|------|-----|
| `feat` | 新機能 | feat(auth): ログイン機能を追加 |
| `fix` | バグ修正 | fix(timer): タイマー停止問題を修正 |
| `refactor` | リファクタリング | refactor(utils): ヘルパー関数を整理 |
| `docs` | ドキュメント | docs(readme): セットアップ手順を追加 |
| `style` | コードスタイル | style: フォーマットを統一 |
| `perf` | パフォーマンス | perf(render): 描画速度を最適化 |
| `test` | テスト | test(api): APIテストを追加 |
| `chore` | ビルド・設定 | chore(deps): 依存関係を更新 |
| `ci` | CI/CD | ci(github): ワークフローを追加 |

#### スコープ例
- コンポーネント名: `header`, `modal`
- 機能名: `auth`, `clock`, `production-record`
- レイヤー名: `api`, `ui`

---

### PR作成

```powershell
# 1. コミット（ユーザーから明示依頼がある場合のみ）
git add .
git commit -m "feat(production-record): 月合計CSVを追加"

# 2. プッシュ
git push -u origin fix/#123-xxx

# 3. PR作成
$prBody = @'
## 概要
Issue #123 を解決。

## 変更内容
- 変更点1
- 変更点2

## テスト
- [x] lint / build / test 通過
- [ ] 実機動作確認

Closes #123
'@
Set-Content -Path .tmp-pr-body.md -Value $prBody -Encoding UTF8

gh pr create --base main --title "[Issue #123] タイトル" --body-file .tmp-pr-body.md
```

---

### セマンティックバージョニング

`MAJOR.MINOR.PATCH` — package.jsonの`version`フィールドを更新。

| 変更種別 | バージョン | コマンド |
|----------|-----------|---------|
| 破壊的変更 | MAJOR | `npm version major` |
| 新機能 | MINOR | `npm version minor` |
| バグ修正 | PATCH | `npm version patch` |

---

## ドキュメント運用

### Steering Documents（永続化ドキュメント）

**場所**: `docs/steering/`

| ドキュメント | 更新タイミング |
|-------------|--------------|
| PRODUCT.md | プロダクト方針変更時 |
| FEATURES.md | 新機能追加時 |
| TECH_SPEC.md | 技術スタック変更時 |
| REPOSITORY.md | リポジトリ構造変更時 |
| GUIDELINES.md | 実装パターン変更時（本ファイル） |
| UBIQUITOUS_LANGUAGE.md | 新規用語追加時 |

**更新方法**:
1. PR作成前、変更内容が Steering Documents の更新対象か確認
2. ユーザーが確認・承認
3. Gitコミット

---

### Spec / Plan Documents（実装前仕様・計画）

**場所**:

- `docs/superpowers/specs/`
- `docs/superpowers/plans/`

| 場所 | 役割 |
|-----|------|
| `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` | 実装前に合意した仕様、背景、受け入れ条件、やらないこと |
| `docs/superpowers/plans/YYYY-MM-DD-<topic>.md` | 仕様に基づく実装手順、検証方法、チェックポイント |

**運用**:
- 仕様・データ・安全性・本番環境・費用に影響する未決事項がある場合は、実装に進まない
- 仕様が固まった後に計画を作り、計画に沿って実装する
- 長期方針に昇格した内容だけ `docs/steering/` に反映する

---

## 運用・障害対応

監視、バックアップ、復元の技術詳細は `docs/steering/TECH_SPEC.md`「運用監視・バックアップ・復元」を正とする。この節では、障害時に迷わないための一次対応フローを定義する。

### 一次対応フロー

1. **影響範囲を止めて把握する**
   - 何が起きているか: ログイン不可、データ保存不可、AI失敗、画面表示不可など
   - 誰に影響しているか: 全員、特定ユーザー、特定端末、特定機能
   - いつからか: 最後に成功した時刻、直近のPR / deploy時刻

2. **一次情報を確認する**
   - GitHub Actions: 直近PRのCI / deploy結果
   - Firebase Hosting: release履歴、live channel
   - Firestore / Storage: 対象データとRules
   - Cloud Functions: `firebase functions:log` と Cloud Logging

3. **記録してから対処する**
   - Issueまたは作業メモに、発生時刻、症状、確認したログ、対象ユーザー、推定原因を書く
   - データ削除、上書き、import、deploy rollback は実行前に影響範囲と戻し方を書く
   - 原因が不明な場合は、推測で本番データを変更しない

4. **ユーザーへ伝える**
   - 現場利用に影響する場合は、暫定回避策、触らないほうがよい機能、次の確認予定を短く伝える
   - 本番復元や一括更新が必要な場合は、作業前に承認を取る

### 連絡・確認の優先順位

| 状況 | 連絡先 / 確認先 | 判断 |
|------|-----------------|------|
| 現場全体でアプリが使えない | 現場管理者、Firebase管理者、GitHub Issue | 高優先。Hosting / deploy / Firebase障害を先に確認 |
| 特定ユーザーだけ保存できない | 対象ユーザー、Firebase管理者 | ユーザーID、権限、Firestoreデータを確認 |
| AI / OCRだけ失敗する | Firebase管理者、OpenAI利用状況の確認担当 | Cloud FunctionsログとSecret設定を確認 |
| 誤削除・誤上書きの疑い | Firebase管理者、作業者、ユーザー | 復元前に現在データを保全し、検証環境で確認 |

### やってはいけないこと

- 原因不明のまま本番Firestoreへimportしない
- 対象範囲を確認せずStorageやFirestoreを一括削除しない
- `.env`、Secret、APIキー、個人情報をIssue / PR / ログに貼らない
- Rulesを緩めて本番障害を回避しない
- 本番deploy、rollback、復元をユーザー承認なしに実行しない

---

## メンテナンス

### 定期実行タスク

- **週次**: `project-maintenance` スキル実行（複雑度・セキュリティ・デッドコード監査）
- **PR作成前**: 必ず統合監査実行
- **リリース前**: 総合チェック
- **月次**: Steering Documents レビュー

---

### リファクタリング優先順位

1. **セキュリティ問題**（最優先）
   - シークレット漏洩
   - Critical/High脆弱性

2. **複雑度が極めて高い関数（CCN 51+）**
   - 即座に分割すべき

3. **複雑度が高い関数（CCN 26-50）**
   - 計画的にリファクタリング

4. **デッドコード（中優先度）**
   - 未使用依存関係・ファイル

5. **デッドコード（低優先度）**
   - 未使用エクスポート（バレルファイル経由の可能性あり）

---

### 現在のリファクタリング対象（2026-02-21）

| ファイル | 関数名 | CCN | NLOC | 優先度 |
|---------|--------|-----|------|--------|
| `assignment-table/DesktopTableView.tsx` | `DesktopTableView` | 125 | 289 | 最優先 |
| `assignment-table/TableModals.tsx` | `TableModals` | 117 | 414 | 最優先 |

---

### リファクタリング手法

#### 複雑度削減の手法

1. **ガード節の導入** - 早期リターンでネストを削減
2. **関数の抽出** - 一つの責務に分割
3. **ストラテジーパターン** - 条件分岐をポリモーフィズムで置換
4. **テーブル駆動** - switch/if-else チェーンをマップに変換
5. **コンポーネント分割** - 巨大なReactコンポーネントを子コンポーネントに分離

#### セキュリティ問題の対応

- **シークレット漏洩**: `.env.local` に移動、`.gitignore` に追加、Git履歴から削除
- **脆弱性**: `npm audit fix` で修正、必要に応じて手動更新

#### デッドコードの削除

- **未使用依存関係**: `npm uninstall <package>`
- **未使用ファイル**: 確認後に削除
- **未使用エクスポート**: バレルファイル経由でないか確認後に削除

---

## 参照

- **プロダクトビジョン**: `docs/steering/PRODUCT.md`
- **リポジトリ構造**: `docs/steering/REPOSITORY.md`
- **技術仕様**: `docs/steering/TECH_SPEC.md`
- **ユビキタス言語**: `docs/steering/UBIQUITOUS_LANGUAGE.md`
- **機能一覧**: `docs/steering/FEATURES.md`
- **ADR**: `docs/steering/TECH_SPEC.md`（ADRセクション）
- **テスト実装の学び**: 現在のエージェント用メモリと、対象テストの近接ファイルを参照
