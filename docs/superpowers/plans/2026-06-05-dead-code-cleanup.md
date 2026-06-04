# デッドコード削除 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** knip が検出した未使用ファイル・npm依存・export を削除し、コードベースを整理する

**Architecture:** 4コミットで段階的に削除する。①ファイル削除 → ②npm依存削除 → ③deprecated prop削除 → ④未使用export削除。各コミット後に typecheck + lint で確認する。

**Tech Stack:** Next.js (App Router), TypeScript, vitest, knip, PowerShell (Windows)

---

## Task 1: ブランチ作成

**Files:**
- (なし)

- [ ] **Step 1: ブランチを作成して切り替える**

```powershell
git checkout -b chore/dead-code-cleanup
```

Expected: `Switched to a new branch 'chore/dead-code-cleanup'`

---

## Task 2: 未使用ファイルを削除（commit 1）

**Files:**
- Delete: `app/brewing/page.tsx`
- Delete: `app/dev/` (ディレクトリ丸ごと)
- Delete: `remotion/` (ディレクトリ丸ごと)
- Delete: `components/MarkdownRenderer.tsx`
- Delete: `lib/sounds.ts`
- Delete: `lib/timeSync.ts`
- Delete: `components/ui/registry.tsx`

- [ ] **Step 1: ファイルを削除する**

```powershell
Remove-Item -Recurse -Force "D:\Dev\roastplus\app\brewing"
Remove-Item -Recurse -Force "D:\Dev\roastplus\app\dev"
Remove-Item -Recurse -Force "D:\Dev\roastplus\remotion"
Remove-Item -Force "D:\Dev\roastplus\components\MarkdownRenderer.tsx"
Remove-Item -Force "D:\Dev\roastplus\lib\sounds.ts"
Remove-Item -Force "D:\Dev\roastplus\lib\timeSync.ts"
Remove-Item -Force "D:\Dev\roastplus\components\ui\registry.tsx"
```

- [ ] **Step 2: typecheckを実行して型エラーがないか確認**

```powershell
cd D:\Dev\roastplus && npm run typecheck
```

Expected: エラーなし（0 errors）

- [ ] **Step 3: lintを実行してコード規約違反がないか確認**

```powershell
npm run lint
```

Expected: エラーなし

- [ ] **Step 4: コミット**

```powershell
git add -A
git commit -m "chore: 未使用ファイルを削除"
```

---

## Task 3: 未使用npm依存を削除（commit 2）

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: dependencies から3パッケージを削除**

```powershell
npm uninstall react-markdown remark-gfm ts-fsrs
```

Expected: `package.json` から3行が消える

- [ ] **Step 2: devDependencies から1パッケージを削除**

```powershell
npm uninstall --save-dev env-cmd
```

Expected: `package.json` から1行が消える

- [ ] **Step 3: typecheckを実行**

```powershell
npm run typecheck
```

Expected: エラーなし

- [ ] **Step 4: lintを実行**

```powershell
npm run lint
```

Expected: エラーなし

- [ ] **Step 5: コミット**

```powershell
git add package.json package-lock.json
git commit -m "chore: 未使用npm依存を削除"
```

---

## Task 4: deprecated router prop を削除（commit 3）

**Files:**
- Modify: `components/TastingSessionCarousel.tsx`
- Modify: `components/TastingSessionList.tsx`

### 4-1: TastingSessionCarousel.tsx を修正

現在の状態（修正前）:
```tsx
// 2行目
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// 13〜14行目（interfaceの中）
  /** @deprecated router is no longer used internally, kept for backward compatibility */
  router?: AppRouterInstance;

// 66〜68行目（関数の引数）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  router: _router,
```

- [ ] **Step 1: `components/TastingSessionCarousel.tsx` を修正する**

`import type { AppRouterInstance }` の行（2行目）を削除する:
```tsx
// この行を削除
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
```

`TastingSessionCarouselProps` interface から router prop を削除する:
```tsx
// この2行を削除
  /** @deprecated router is no longer used internally, kept for backward compatibility */
  router?: AppRouterInstance;
```

関数の引数から router の分解代入を削除する:
```tsx
// この2行を削除
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  router: _router,
```

### 4-2: TastingSessionList.tsx を修正

現在の状態（修正前、420行目付近）:
```tsx
          <TastingSessionCarousel
            sessions={filteredAndSortedSessions}
            tastingRecords={visibleTastingRecords}
            activeMemberCount={activeMemberCount}
            router={router}
            onUpdateSession={handleUpdateSession}
          />
```

- [ ] **Step 2: `components/TastingSessionList.tsx` の `router={router}` を削除する**

```tsx
// 修正後
          <TastingSessionCarousel
            sessions={filteredAndSortedSessions}
            tastingRecords={visibleTastingRecords}
            activeMemberCount={activeMemberCount}
            onUpdateSession={handleUpdateSession}
          />
```

注意: `router` 変数自体（`useRouter()` の呼び出し）は `TastingSessionList.tsx` の119行目付近で別の用途（`router.push('/tasting/sessions/new')`）に使っているため、削除しない。`router={router}` の渡し箇所だけを消す。

- [ ] **Step 3: typecheckを実行**

```powershell
npm run typecheck
```

Expected: エラーなし

- [ ] **Step 4: lintを実行**

```powershell
npm run lint
```

Expected: エラーなし

- [ ] **Step 5: テストを実行**

```powershell
npm run test:run
```

Expected: 全テスト通過（PASS）

- [ ] **Step 6: コミット**

```powershell
git add components/TastingSessionCarousel.tsx components/TastingSessionList.tsx
git commit -m "refactor: deprecatedなrouterプロップを削除"
```

---

## Task 5: 未使用 export を削除（commit 4）

**Files:**
- Modify: `lib/constants.ts`
- Modify: `components/ui/index.ts`
- Modify: `hooks/useDeveloperMode.ts`
- Modify: `lib/firestore/index.ts`
- Modify: `lib/firestore/productionRecords.ts`
- Modify: `lib/productionRecords.ts`
- Modify: `lib/drip-guide/countdownAudio.ts`

### 5-1: lib/constants.ts

現在の内容:
```ts
export const SPLASH_DISPLAY_TIME = 2800;

export const ROAST_LEVELS = ['浅煎り', '中煎り', '中深煎り', '深煎り'] as const;

export type RoastLevel = (typeof ROAST_LEVELS)[number];

export const WEIGHTS = [200, 300, 500] as const;

export type Weight = (typeof WEIGHTS)[number];

export const DEFAULT_DURATIONS: Record<Weight, number> = {
  200: 8,
  300: 9,
  500: 10,
};
```

- [ ] **Step 1: `lib/constants.ts` から未使用の export を削除する**

`WEIGHTS`、`Weight`、`DEFAULT_DURATIONS` はどこからも import されていないので削除する。`RoastLevel` 型も削除。ファイルの最終形:

```ts
export const SPLASH_DISPLAY_TIME = 2800;

export const ROAST_LEVELS = ['浅煎り', '中煎り', '中深煎り', '深煎り'] as const;
```

### 5-2: components/ui/index.ts

- [ ] **Step 2: `components/ui/index.ts` から未使用の export 行を削除する**

削除する行:
```ts
export type { SelectOption } from './Select';    // 43行目を削除
export { ProgressBar } from './ProgressBar';     // 69行目を削除
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './Accordion';  // 73行目を削除
```

注意: `Select.tsx` 内の `interface SelectOption` 定義自体は残す（ファイル内部で使っている）。

### 5-3: hooks/useDeveloperMode.ts

- [ ] **Step 3: `hooks/useDeveloperMode.ts` の `isDeveloperModeAvailable` から `export` キーワードを外す**

修正前:
```ts
export function isDeveloperModeAvailable(): boolean {
  return process.env.NODE_ENV !== 'production';
}
```

修正後（`export` を削除）:
```ts
function isDeveloperModeAvailable(): boolean {
  return process.env.NODE_ENV !== 'production';
}
```

注意: この関数は同ファイル内の `useDeveloperMode` フック（14行目）で使っているため、関数自体は残す。

### 5-4: lib/firestore/index.ts

現在の内容（11〜27行目が生産記録の re-export）:
```ts
export {
  RECENT_PRODUCTION_MONTHS_LIMIT,
  getProductionRecordsCollectionRef,
  getProductionRecordMonthDocRef,
  getHandpickEntriesCollectionRef,
  getRoastEntriesCollectionRef,
  getPackageEntriesCollectionRef,
  subscribeProductionRecordMonth,
  saveProductionRecordMonth,
  subscribeRecentProductionMonths,
  subscribeHandpickEntries,
  saveHandpickEntry,
  subscribeRoastEntries,
  saveRoastEntry,
  subscribePackageEntries,
  savePackageEntry,
} from './productionRecords';
```

注意: `subscribeProductionRecordMonth`・`subscribeHandpickEntries`・`subscribeRoastEntries`・`subscribePackageEntries` の4つは `hooks/useProductionRecord.ts` がこのバレル経由でインポートしているため、**削除しない**。

- [ ] **Step 4: `lib/firestore/index.ts` から未使用の re-export だけを削除する**

修正後のブロック（未使用の11行を削除、使用中の4行を残す）:
```ts
export {
  subscribeProductionRecordMonth,
  subscribeHandpickEntries,
  subscribeRoastEntries,
  subscribePackageEntries,
} from './productionRecords';
```

### 5-5: lib/firestore/productionRecords.ts

- [ ] **Step 5: `lib/firestore/productionRecords.ts` の `RECENT_PRODUCTION_MONTHS_LIMIT` から `export` を外す**

修正前（36行目）:
```ts
export const RECENT_PRODUCTION_MONTHS_LIMIT = 24;
```

修正後:
```ts
const RECENT_PRODUCTION_MONTHS_LIMIT = 24;
```

注意: この定数は同ファイル内の156行目で使っているため、定数自体は残す。

### 5-6: lib/productionRecords.ts

- [ ] **Step 6: `lib/productionRecords.ts` の2定数から `export` を外す**

修正前（19〜20行目）:
```ts
export const PREMIX_BAG_GRAM = 500;
export const THIRTY_KG_BASE_GRAM = 30000;
```

修正後:
```ts
const PREMIX_BAG_GRAM = 500;
const THIRTY_KG_BASE_GRAM = 30000;
```

注意: 両定数は同ファイル内（69、70、105行目）で使っているため、定数自体は残す。

### 5-7: lib/drip-guide/countdownAudio.ts

- [ ] **Step 7: `lib/drip-guide/countdownAudio.ts` の `isDripCountdownAudioReady` から `export` を外す**

修正前（92行目）:
```ts
export function isDripCountdownAudioReady(): boolean {
```

修正後:
```ts
function isDripCountdownAudioReady(): boolean {
```

### 5-8: 検証とコミット

- [ ] **Step 8: typecheckを実行**

```powershell
npm run typecheck
```

Expected: エラーなし

- [ ] **Step 9: lintを実行**

```powershell
npm run lint
```

Expected: エラーなし

- [ ] **Step 10: テストを実行**

```powershell
npm run test:run
```

Expected: 全テスト通過（PASS）

- [ ] **Step 11: コミット**

```powershell
git add lib/constants.ts components/ui/index.ts hooks/useDeveloperMode.ts lib/firestore/index.ts lib/firestore/productionRecords.ts lib/productionRecords.ts lib/drip-guide/countdownAudio.ts
git commit -m "refactor: 未使用exportを削除"
```

---

## Task 6: 最終検証と PR 作成

- [ ] **Step 1: フォーマットチェック（CIのFormatジョブ対策）**

```powershell
npm run format:check
```

Expected: エラーなし。もしエラーが出たら `npm run format` を実行してから再コミット。

- [ ] **Step 2: knip でデッドコードが減ったか確認**

```powershell
npm run deadcode
```

Expected: 今回削除した項目が結果から消えている（完全ゼロにはならない場合あり）

- [ ] **Step 3: PR を作成**

```powershell
gh pr create --title "chore: デッドコード・未使用ファイルの削除" --body "## 概要
knip で検出された未使用ファイル・npm依存・exportを削除。

## 変更内容
- 未使用ファイル7件を削除（brewing スタブ、design-lab、remotion、MarkdownRenderer 等）
- npm依存4件を削除（react-markdown、remark-gfm、ts-fsrs、env-cmd）
- deprecated な router prop を TastingSessionCarousel から削除
- 未使用 export を7ファイルから削除

## 検証
- npm run typecheck: pass
- npm run lint: pass
- npm run test:run: pass
- npm run format:check: pass"
```
