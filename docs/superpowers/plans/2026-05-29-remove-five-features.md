# 5領域の機能削除 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ローストタイマー・焙煎記録・作業進捗・コーヒークイズ・開発秘話＋チェンジログの5領域をコードベースから完全に削除する（Firestore既存データ削除は後工程・スコープ外）。

**Architecture:** 「機能チャンク単位」で削除する。1チャンク = 1機能のディレクトリ/ファイル削除 + その機能を参照する共通ファイルの該当箇所削除。各チャンクの完了時に `npm run build` と `npm run test:run` が緑であることをコミットの条件とする。これにより、各コミット時点で常にビルド可能な状態を保つ。

**Tech Stack:** Next.js (App Router) / TypeScript / Firestore / Vitest / Vitest（`npm run test:run`）/ `npm run build`（tsc型チェック含む）

**削除順序の根拠:** 結合の浅い順に進める。コーヒークイズ（AppData非統合）→ 開発秘話＋チェンジログ → 作業進捗（Firestoreサブコレクション分離あり・最重）→ ローストタイマー＋焙煎記録（AppData/localStorage/通知/サウンドに広く結合）。

**重要な検証ルール:** この計画はTDDの「新規テストを書く」型ではなく「削除型」。各タスクの赤→緑ゲートは「削除前にビルドが通る」→「削除後もビルドとテストが通る」で担保する。各タスク末尾の `npm run build` が、参照漏れ（未削除のimport等）を検出する最強の網。

---

## 事前準備

- [ ] **Step 0-1: ブランチ確認**

すでに `chore/remove-unused-features` ブランチにいる前提（設計ドキュメントをコミット済み）。確認:

Run: `git branch --show-current`
Expected: `chore/remove-unused-features`

- [ ] **Step 0-2: 削除前にビルドとテストが緑であることを確認（ベースライン）**

Run: `npm run build`
Expected: 成功（エラーなし）

Run: `npm run test:run`
Expected: 全テスト成功

> ベースラインが緑でない場合、それは既存の問題。削除作業を始める前にユーザーに報告すること。

---

## Task 1: コーヒークイズの削除

最も独立した機能。AppDataに統合されておらず、独立コレクション `quiz_progress` を使う。

**Files:**
- Delete（ディレクトリ/ファイルごと）:
  - `app/coffee-trivia/`（配下すべて）
  - `components/coffee-quiz/`（配下すべて）
  - `lib/coffee-quiz/`（配下すべて、テスト含む）
  - `hooks/useQuizData.ts`（＋ `hooks/useQuizData.test.ts`）
  - `hooks/useQuizSession.ts`（＋ `hooks/useQuizSession.test.ts`）
  - `hooks/useQuizSound.ts`（＋ あれば `.test.ts`）
- Modify:
  - `lib/localStorage.ts`
  - `app/page.tsx`
  - `lib/homeFeatures.ts`
  - `firestore.rules`

- [ ] **Step 1-1: コーヒークイズのディレクトリ/ファイルを削除**

```bash
git rm -r app/coffee-trivia components/coffee-quiz lib/coffee-quiz
git rm hooks/useQuizData.ts hooks/useQuizData.test.ts hooks/useQuizSession.ts hooks/useQuizSession.test.ts hooks/useQuizSound.ts
```

> `useQuizSound.test.ts` 等が存在しない場合はそのファイル名を除いて実行する。`git rm` がエラーなら `ls` で実ファイル名を確認。

- [ ] **Step 1-2: `lib/localStorage.ts` からクイズ関連を削除**

`lib/localStorage.ts` の冒頭付近にある以下のimportを削除:
```typescript
import type { QuizProgress } from '@/lib/coffee-quiz/types';
```
さらに、クイズ進捗に関する以下のシンボルをすべて削除（定義ブロックごと）:
- 定数 `QUIZ_PROGRESS_KEY`
- interface `StoredQuizProgress`
- interface `ExportedQuizProgress`
- 関数 `setQuizProgress`
- 関数 `getQuizProgress`
- 関数 `exportQuizProgress`
- 関数 `importQuizProgress`

> 削除範囲は概ね現状の200行目付近〜290行目付近。`QuizProgress` を参照する箇所が残っていないか、ファイル内検索で確認すること。

- [ ] **Step 1-3: `app/page.tsx` から coffee-trivia エントリと未使用iconを削除**

`ACTIONS` 配列から以下のオブジェクトを削除:
```typescript
  {
    key: 'coffee-trivia',
    title: 'コーヒークイズ',
    description: '楽しく学ぶコーヒー知識',
    href: '/coffee-trivia',
    icon: IoSparkles,
  },
```
`CHRISTMAS_ICONS` から以下の行を削除:
```typescript
  'coffee-trivia': FaStar,
```
これにより `IoSparkles`（7行目 import）と `FaStar`（25行目 import）が未使用になる。両importを削除する。

> `FaStar` が `CHRISTMAS_ICONS` 内の他キーで使われていないことを確認（現状 coffee-trivia のみ）。`IoSparkles` も同様。未使用import削除はlintエラー回避のため必須。

- [ ] **Step 1-4: `lib/homeFeatures.ts` から coffee-trivia エントリを削除**

`HOME_FEATURES` 配列から以下を削除:
```typescript
  {
    key: 'coffee-trivia',
    title: 'コーヒークイズ',
    description: '楽しく学ぶコーヒー知識',
  },
```

- [ ] **Step 1-5: `firestore.rules` から quiz_progress ルールを削除**

以下のブロックを削除:
```
    // クイズ進捗データ
    match /quiz_progress/{userId} {
      // 認証済みユーザーが自分のデータにのみアクセス可能
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
```

- [ ] **Step 1-6: ビルドとテストで参照漏れを検出**

Run: `npm run build`
Expected: 成功。失敗した場合はエラーが指す未削除の `coffee-quiz` / `useQuiz*` / `QuizProgress` 参照を削除する。

Run: `npm run test:run`
Expected: 全テスト成功（クイズ関連テストは削除済み）

- [ ] **Step 1-7: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: コーヒークイズ機能を削除

app/coffee-trivia, components/coffee-quiz, lib/coffee-quiz, useQuiz系hook,
localStorageのクイズ進捗処理、ホーム登録、firestore.rulesのquiz_progressを削除。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 開発秘話＋チェンジログの削除

開発秘話とチェンジログはデータファイルで結合。`changelogEntries` は AppData のオプションフィールドだが `useAppData` の正規化対象ではなく、`common.ts` の正規化のみ。

**Files:**
- Delete:
  - `app/dev-stories/`（配下すべて）
  - `app/changelog/`（配下すべて）
  - `components/dev-stories/`（配下すべて）
  - `components/changelog/`（配下すべて）
  - `data/dev-stories/`（配下すべて）
  - `types/changelog.ts`
- Modify:
  - `types/index.ts`
  - `types/settings.ts`
  - `lib/firestore/common.ts`
  - `app/settings/page.tsx`
  - `app/page.tsx`
  - `lib/homeFeatures.ts`
  - `e2e/accessibility/a11y.spec.ts`

- [ ] **Step 2-1: ディレクトリ/ファイルを削除**

```bash
git rm -r app/dev-stories app/changelog components/dev-stories components/changelog data/dev-stories
git rm types/changelog.ts
```

- [ ] **Step 2-2: `types/index.ts` から changelog の再エクスポートを削除**

以下の行を削除:
```typescript
export * from './changelog';
```

- [ ] **Step 2-3: `types/settings.ts` から changelogEntries を削除**

import文（44行目付近）を削除:
```typescript
import type { ChangelogEntry } from './changelog';
```
`AppData` インターフェースから以下のフィールドを削除:
```typescript
  changelogEntries?: ChangelogEntry[];
```

- [ ] **Step 2-4: `lib/firestore/common.ts` から changelogEntries 正規化を削除**

以下のブロックを削除:
```typescript
  // changelogEntriesは存在する場合のみ処理
  if (Array.isArray(data?.changelogEntries)) {
    normalized.changelogEntries = data.changelogEntries;
  }
```

- [ ] **Step 2-5: `app/settings/page.tsx` から更新履歴セクションを削除**

import（17行目）を削除:
```typescript
import { VERSION_HISTORY } from '@/data/dev-stories/version-history';
```
さらに、`VERSION_HISTORY` を使用している「更新履歴」セクション（`/changelog` へのLink、`MdHistory` アイコンを含むカード/セクション）をJSXから削除する。削除後 `MdHistory` が未使用になる場合は `react-icons/md` の import（14行目 `import { MdHistory, MdHome } from 'react-icons/md';`）から `MdHistory` を外す（`MdHome` は他で使用していれば残す）。

> このファイルは全文を確認し、`VERSION_HISTORY` と `/changelog` を参照する箇所がゼロになるまで削除する。`Link` import が他で使われていれば残す。

- [ ] **Step 2-6: `app/page.tsx` から dev-stories エントリと未使用iconを削除**

`ACTIONS` 配列から以下を削除:
```typescript
  {
    key: 'dev-stories',
    title: '開発秘話',
    description: '開発の裏話を覗く',
    href: '/dev-stories',
    icon: RiLightbulbFlashFill,
  },
```
`CHRISTMAS_ICONS` から以下の行を削除:
```typescript
  'dev-stories': FaSnowflake,
```
これにより `RiLightbulbFlashFill`（8行目 import）が未使用になるので削除する。

> `FaSnowflake` は `CHRISTMAS_ICONS` の `progress` でもまだ使用中（Task 3 で削除予定）。**このタスクでは `FaSnowflake` import は残す**こと。

- [ ] **Step 2-7: `lib/homeFeatures.ts` から dev-stories エントリを削除**

`HOME_FEATURES` 配列から以下を削除:
```typescript
  {
    key: 'dev-stories',
    title: '開発秘話',
    description: '開発の裏話を覗く',
  },
```

- [ ] **Step 2-8: `e2e/accessibility/a11y.spec.ts` から /changelog ルートを削除**

以下の行（25行目付近）を削除:
```typescript
  { name: '変更履歴', path: '/changelog', authenticated: true },
```

- [ ] **Step 2-9: ビルドとテストで参照漏れを検出**

Run: `npm run build`
Expected: 成功。失敗時は `dev-stories` / `changelog` / `ChangelogEntry` / `VERSION_HISTORY` の未削除参照を解消。

Run: `npm run test:run`
Expected: 全テスト成功

- [ ] **Step 2-10: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: 開発秘話・チェンジログ機能を削除

app/dev-stories, app/changelog, components配下, data/dev-stories,
types/changelog, AppData.changelogEntries, 設定画面の更新履歴セクション、
ホーム登録、E2Eの/changelogルートを削除。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 作業進捗の削除（最重・Firestoreサブコレクション分離の除去を含む）

`workProgresses` は AppData に統合され、さらに `users/{uid}/workProgresses` サブコレクションへ分離保存するマイグレーションロジック（`crud.ts` / `write-queue.ts` / `workProgress/subcollection.ts`）を持つ。これらを除去し、root doc のみのシンプルな読み書きに戻す。

**Files:**
- Delete:
  - `app/progress/`（配下すべて）
  - `components/work-progress/`（配下すべて）
  - `lib/firestore/workProgress/`（配下すべて、テスト含む）
  - `hooks/useWorkProgressActions.ts`
  - `types/work-progress.ts`
- Modify:
  - `types/index.ts`
  - `types/settings.ts`
  - `lib/firestore/common.ts`
  - `lib/firestore/index.ts`
  - `lib/firestore/userData/crud.ts`
  - `lib/firestore/userData/write-queue.ts`
  - `hooks/useAppData.ts`
  - `firestore.rules`
  - `app/page.tsx`
  - `lib/homeFeatures.ts`
  - 関連テスト: `lib/firestore/userData.test.ts`, `lib/firestore/write-queue.test.ts`, `lib/firestore/common.test.ts`

- [ ] **Step 3-1: ディレクトリ/ファイルを削除**

```bash
git rm -r app/progress components/work-progress lib/firestore/workProgress
git rm hooks/useWorkProgressActions.ts types/work-progress.ts
```

- [ ] **Step 3-2: `types/index.ts` から work-progress の再エクスポートを削除**

```typescript
export * from './work-progress';
```
を削除。

- [ ] **Step 3-3: `types/settings.ts` から workProgresses を削除**

import文（42行目付近）を削除:
```typescript
import type { WorkProgress } from './work-progress';
```
`AppData` から削除:
```typescript
  workProgresses: WorkProgress[];
```

- [ ] **Step 3-4: `lib/firestore/common.ts` から workProgresses を削除**

`defaultData` から削除:
```typescript
  workProgresses: [],
```
`normalizeAppData` の `normalized` オブジェクトから以下のブロックを削除:
```typescript
    workProgresses: Array.isArray(data?.workProgresses)
      ? data.workProgresses.map((wp) => ({
          ...wp,
          completedCount: typeof wp.completedCount === 'number' ? wp.completedCount : undefined,
        }))
      : [],
```

- [ ] **Step 3-5: `lib/firestore/index.ts` から workProgress エクスポートを削除**

以下のブロック全体を削除（`extractTargetAmount` / `extractUnitFromWeight` も `./workProgress` 由来のため、本当に他で使われていないか確認。grep で `extractTargetAmount` `extractUnitFromWeight` の参照を確認し、作業進捗専用なら削除、他機能で使われていれば該当関数のみ別モジュールへ退避は不要＝そのまま削除）:
```typescript
export {
  extractTargetAmount,
  extractUnitFromWeight,
  addWorkProgress,
  updateWorkProgress,
  updateWorkProgresses,
  deleteWorkProgress,
  addCompletedCountToWorkProgress,
  addProgressToWorkProgress,
  archiveWorkProgress,
  unarchiveWorkProgress,
  updateProgressHistoryEntry,
  deleteProgressHistoryEntry,
} from './workProgress';
```

> 確認: `npm run build` で `extractTargetAmount` 等が他から参照されていればエラーになる。その場合のみ対応を再検討。現状の調査では作業進捗専用。

- [ ] **Step 3-6: `lib/firestore/userData/crud.ts` を root doc のみの読み書きに簡素化**

`workProgress/subcollection` への依存を全削除し、サブコレクション分離ロジックを除去する。`getUserData` / `subscribeUserData` を以下の形に置き換える。

import（7-14行目のブロック）を削除:
```typescript
import {
  getDataSplitsDocRef,
  getWorkProgressesCollectionRef,
  isWorkProgressesMigrated,
  loadWorkProgressSplitState,
  normalizeWorkProgressQuerySnapshot,
  resolveWorkProgresses,
} from '../workProgress/subcollection';
```

`getUserData` を以下に置き換え:
```typescript
export async function getUserData(userId: string): Promise<AppData> {
  if (isE2EMode()) {
    return loadE2EAppData(defaultData);
  }

  try {
    const userDocRef = getUserDocRef(userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      return normalizeAppData(data);
    }

    // ドキュメントが存在しない場合はデフォルトデータを作成
    const cleanedDefaultData = removeUndefinedFields(defaultData) as unknown as Record<string, unknown>;
    await setDoc(userDocRef, cleanedDefaultData);
    return defaultData;
  } catch (error) {
    console.error('Failed to load data from Firestore:', error);
    throw error;
  }
}
```

`subscribeUserData` を以下に置き換え（workProgresses/dataSplits の購読を削除し、root docのみ購読）:
```typescript
export function subscribeUserData(userId: string, callback: (data: AppData) => void): () => void {
  if (isE2EMode()) {
    queueMicrotask(() => callback(loadE2EAppData(defaultData)));
    return () => {};
  }

  const userDocRef = getUserDocRef(userId);

  return onSnapshot(
    userDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(normalizeAppData(snapshot.data()));
      } else {
        callback(defaultData);
      }
    },
    (error) => {
      console.error('Error in Firestore subscription:', error);
      // エラー時はcallbackを呼ばない（既存データを保持する）
    }
  );
}
```

> `saveUserData` 本体（59-115行目）と `mergeSaveUserDataOptions`（117-140行目）は残すが、`syncWorkProgresses` への依存は write-queue 側で除去する（Step 3-7）。`mergeSaveUserDataOptions` 内の `syncWorkProgresses` 関連行は Step 3-7 の型変更後に未参照となるため、ここで合わせて削除しておく:
> - `const syncWorkProgresses = ...` 行
> - 戻り値オブジェクト内の `syncWorkProgresses,` 各行
> 結果、`mergeSaveUserDataOptions` は `updatedFields` のマージのみを行う形になる。

- [ ] **Step 3-7: `lib/firestore/userData/write-queue.ts` から workProgresses 分離ロジックを削除**

import（6-7行目）を修正/削除:
```typescript
import { getDataSplitsDocRef, getWorkProgressesCollectionRef } from '../workProgress/subcollection';
import type { AppData, WorkProgress } from '@/types';
```
→ 上の subcollection import は削除。型は `import type { AppData } from '@/types';`（`WorkProgress` を除去）に変更。`deleteField, doc, getDocs, writeBatch` のうち、削除後に未使用になるもの（`getDocs`, `doc`）は import から外す。`writeBatch` `deleteField` は残る。

削除するシンボル:
- `const workProgressesSyncSignatures = new Map<string, string>();`
- `clearWriteQueueStateForTests` 内の `workProgressesSyncSignatures.clear();`
- `SaveUserDataOptions` から `syncWorkProgresses?: boolean;`
- 関数 `removeRootWorkProgresses`
- 関数 `applyWorkProgressSplitWrites`

`performWrite` 内の修正:
- `const batchWriter = createBatchWriter();` 以降の root 書き込み部分で、`removeRootWorkProgresses(...)` のラップを外す:
  ```typescript
    const rootWriteData = pickUpdatedFields(cleanedData, options.updatedFields);
  ```
- 以下の workProgresses 同期ブロックを削除:
  ```typescript
    let syncedWorkProgressesSignature: string | null = null;
    if (options.syncWorkProgresses === true) {
      const nextSyncSignature = stableStringify(data.workProgresses);
      const previousSyncSignature = workProgressesSyncSignatures.get(userId);
      if (previousSyncSignature !== nextSyncSignature) {
        await applyWorkProgressSplitWrites(userId, batchWriter, data.workProgresses);
        syncedWorkProgressesSignature = nextSyncSignature;
      }
    }
  ```
  および commit 後の:
  ```typescript
    if (syncedWorkProgressesSignature !== null) {
      workProgressesSyncSignatures.set(userId, syncedWorkProgressesSignature);
    }
  ```
- `stableStringify` / `areFirestorePayloadsEqual` が他で未使用になれば削除（`areFirestorePayloadsEqual` は `applyWorkProgressSplitWrites` 専用なので削除。`stableStringify` も同様に削除可だが、念のため未参照を確認してから削除）。

> このタスク完了後、`performWrite` は「root doc に merge 保存するだけ」になる。`roastTimerState` の `deleteField` 処理・`roastTimerSettings` 処理はここでは**残す**（Task 4 で削除）。

- [ ] **Step 3-8: `hooks/useAppData.ts` から workProgresses を削除**

- `INITIAL_APP_DATA` から `workProgresses: [],` を削除
- `applyIncomingSnapshot` の `localHasData` 判定から `localData.workProgresses.length > 0 ||` を削除
- 同 `incomingIsEmpty` 判定から `incomingData.workProgresses.length === 0 &&` を削除
- `updateData` 内 `normalizedData` から以下を削除:
  ```typescript
        workProgresses: Array.isArray(newData.workProgresses) ? newData.workProgresses : currentData.workProgresses,
  ```
- `saveUserData` 呼び出しのオプションから `syncWorkProgresses: mutatedKeys.includes('workProgresses'),` を削除:
  ```typescript
        await saveUserData(user.uid, normalizedData, {
          updatedFields: mutatedKeys,
        });
  ```

- [ ] **Step 3-9: `firestore.rules` から workProgresses ルールを削除**

以下を削除:
```
    match /users/{userId}/workProgresses/{workProgressId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
```

- [ ] **Step 3-10: `app/page.tsx` から progress エントリと未使用iconを削除**

`ACTIONS` から削除:
```typescript
  {
    key: 'progress',
    title: '作業進捗',
    description: '進捗を可視化',
    href: '/progress',
    icon: MdTimeline,
  },
```
`CHRISTMAS_ICONS` から削除:
```typescript
  progress: FaSnowflake,
```
これにより `MdTimeline`（9行目 import の一部）が未使用に → import から外す。`FaSnowflake`（25行目）も `CHRISTMAS_ICONS` で未使用になったので import から外す。

> 9行目は `import { MdCoffeeMaker, MdInventory2, MdTimer, MdTimeline } from 'react-icons/md';`。`MdTimeline` のみ外す（`MdTimer` は Task 4 まで残す）。

- [ ] **Step 3-11: `lib/homeFeatures.ts` から progress エントリを削除**

`HOME_FEATURES` から削除:
```typescript
  {
    key: 'progress',
    title: '作業進捗',
    description: '進捗を可視化',
  },
```

- [ ] **Step 3-12: workProgresses 関連テストを削除/修正**

- `lib/firestore/userData.test.ts`: workProgresses 分離互換の describe（`getUserData workProgresses split compatibility`, `subscribeUserData workProgresses split merge`）が中心。ファイルがこれらだけならファイルごと `git rm`。他の有効テストを含む場合は該当 describe ブロックのみ削除。
- `lib/firestore/write-queue.test.ts`: `saveUserData workProgresses split writes` の describe を削除。`WorkProgress` import・関連フィクスチャ（`keepProgress` 等）も削除。他テストが残ればファイルは保持。
- `lib/firestore/common.test.ts`: `workProgresses` を参照する assertion（`result.workProgresses` 系、`workProgressesのcompletedCount補完` テスト）を削除。`roastTimerSettings` 系テストは Task 4 で扱うため**ここでは残す**。

> 方針: テストは「弱める」のではなく「削除した機能の分だけ消す」。残すテストの意図は壊さない。

- [ ] **Step 3-13: ビルドとテストで参照漏れを検出**

Run: `npm run build`
Expected: 成功。失敗時は `workProgress` / `WorkProgress` の未削除参照、`subcollection` import 残り、`syncWorkProgresses` 残りを解消。

Run: `npm run test:run`
Expected: 全テスト成功

- [ ] **Step 3-14: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: 作業進捗機能を削除

app/progress, components/work-progress, lib/firestore/workProgress,
useWorkProgressActions, types/work-progress を削除。AppData.workProgresses と
Firestoreサブコレクション分離ロジック(crud/write-queue)を除去し、
root docのみの読み書きに簡素化。ホーム登録・firestore.rules・関連テストも整理。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: ローストタイマー＋焙煎記録の削除

タイマーは AppData (`roastTimerRecords`/`roastTimerState`)、UserSettings (`roastTimerSettings`)、localStorage、通知、サウンド、アプリライフサイクルに広く結合。焙煎記録（roast-record）はタイマーの記録を表示する機能で同時に削除。

**Files:**
- Delete:
  - `app/roast-timer/`, `app/roast-record/`（配下すべて）
  - `components/roast-timer/`（配下すべて）
  - `components/RoastTimer.tsx`, `components/RoastTimerSettings.tsx`, `components/RoastRecordForm.tsx`
  - `components/roast-record-list/`（配下すべて）
  - `hooks/roast-timer/`（配下すべて）
  - `hooks/useRoastTimer.ts`（＋ `hooks/useRoastTimer.test.ts`）
  - `lib/roastTimerSettings.ts`（＋ `.test.ts`）, `lib/roastTimerUtils.ts`（＋ `.test.ts`）
  - `types/timer.ts`
- Modify:
  - `types/index.ts`, `types/settings.ts`
  - `lib/firestore/common.ts`, `lib/firestore/userData/write-queue.ts`
  - `hooks/useAppData.ts`, `hooks/useAppLifecycle.ts`
  - `lib/localStorage.ts`, `lib/notifications.ts`, `lib/soundFiles.ts`
  - `scripts/generate-sound-list.ts`
  - `app/page.tsx`, `lib/homeFeatures.ts`
  - `lib/firestore/common.test.ts`（roastTimerSettings テスト）

- [ ] **Step 4-1: roast-record と roast-record-list の利用範囲を確認**

Run: `git grep -n "RoastRecordForm\|roast-record-list\|RoastRecordList\|RoastRecordCard"`
Expected: 参照が `app/roast-record`, `app/roast-timer`, `components/roast-timer`, `components/RoastTimer*`, 削除対象内のみであること。削除対象外（schedule等）からの参照があれば、その箇所を報告し、削除方針を再確認する。

> `roastSchedules`（スケジュール機能）は別物。`RoastTimerRecord` とは無関係なので触らない。

- [ ] **Step 4-2: ディレクトリ/ファイルを削除**

```bash
git rm -r app/roast-timer app/roast-record components/roast-timer components/roast-record-list hooks/roast-timer
git rm components/RoastTimer.tsx components/RoastTimerSettings.tsx components/RoastRecordForm.tsx
git rm hooks/useRoastTimer.ts hooks/useRoastTimer.test.ts
git rm lib/roastTimerSettings.ts lib/roastTimerUtils.ts types/timer.ts
```

> 対応する `.test.ts`（`lib/roastTimerSettings.test.ts`, `lib/roastTimerUtils.test.ts` 等）が存在すれば併せて削除。存在しないファイル名はコマンドから除く。

- [ ] **Step 4-3: `types/index.ts` から timer の再エクスポートを削除**

```typescript
export * from './timer';
```
を削除。

- [ ] **Step 4-4: `types/settings.ts` から roastTimer 関連を削除**

- 3行目 import 削除: `import type { RoastTimerSettings } from './timer';`
- `UserSettings` から削除: `roastTimerSettings?: RoastTimerSettings;`
- 40行目 import 削除: `import type { RoastTimerRecord, RoastTimerState } from './timer';`
- `AppData` から削除: `roastTimerRecords: RoastTimerRecord[];` と `roastTimerState?: RoastTimerState;`

- [ ] **Step 4-5: `lib/firestore/common.ts` から roastTimer 関連を削除**

- `defaultData` から `roastTimerRecords: [],` を削除
- `normalizeAppData` の `normalized` から `roastTimerRecords` ブロックを削除:
  ```typescript
    roastTimerRecords: Array.isArray(data?.roastTimerRecords)
      ? data.roastTimerRecords.map((record) => ({
          ...record,
          roastDate:
            record.roastDate ||
            (record.createdAt ? record.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
        }))
      : [],
  ```
- `userSettings` 正規化内の `roastTimerSettings` ブロック（134-160行目付近、`// roastTimerSettingsを正規化` コメントから `cleanedUserSettings.roastTimerSettings = {...};` まで）を削除
- `roastTimerState` ブロックを削除:
  ```typescript
    // roastTimerStateは存在する場合のみ処理
    if (data?.roastTimerState && typeof data.roastTimerState === 'object') {
      normalized.roastTimerState = data.roastTimerState;
    }
  ```

- [ ] **Step 4-6: `lib/firestore/userData/write-queue.ts` から roastTimer 関連を削除**

`performWrite` 内:
- `userSettingsUpdate` 構築後の以下を削除:
  ```typescript
      if (data.userSettings.roastTimerSettings !== undefined) {
        userSettingsUpdate.roastTimerSettings = data.userSettings.roastTimerSettings;
      }
  ```
- 以下を削除:
  ```typescript
    if (data.roastTimerState === undefined) {
      cleanedData.roastTimerState = deleteField();
    }
  ```
- これにより `deleteField` の使用箇所が他に残るか確認。`setOrDelete` ヘルパー（`deleteField` を使用）が `userSettingsUpdate` でまだ使われているため `deleteField` import は残る想定。未使用になったら import から外す。

- [ ] **Step 4-7: `hooks/useAppData.ts` から roastTimer 関連を削除**

- `INITIAL_APP_DATA` から `roastTimerRecords: [],` を削除
- `applyIncomingSnapshot` の `localHasData` から `localData.roastTimerRecords.length > 0 ||` を削除
- 同 `incomingIsEmpty` から `incomingData.roastTimerRecords.length === 0 &&` を削除
- `updateData` 内 `const hasRoastTimerStateOverride = hasOwn(newData, 'roastTimerState');` を削除
- `normalizedData` から以下2行を削除:
  ```typescript
        roastTimerRecords: Array.isArray(newData.roastTimerRecords)
          ? newData.roastTimerRecords
          : currentData.roastTimerRecords,
        roastTimerState: hasRoastTimerStateOverride ? newData.roastTimerState : currentData.roastTimerState,
  ```

- [ ] **Step 4-8: `hooks/useAppLifecycle.ts` から roastTimer 関連を削除**

`isRoastTimerPageRef`、`pathname === '/roast-timer'` 判定、`data.roastTimerState?.status === 'completed'` のチェックロジック、依存配列の `data.roastTimerState` を削除する。ファイル全体を確認し、roastTimer に関係する処理がすべて消えても他のライフサイクル処理（あれば）が成立するようにする。roastTimer 専用フックであればファイルごと削除し、`hooks/useAppLifecycle.ts` を import している箇所（layout等）も外す。

> まず全文を Read して、roastTimer 以外の役割があるか判断すること。`git grep -n "useAppLifecycle"` で利用箇所を確認。

- [ ] **Step 4-9: `lib/localStorage.ts` から roastTimer 関連を削除**

- 1行目 import から `RoastTimerSettings, RoastTimerState` を削除（`import type { RoastTimerSettings, RoastTimerState } from '@/types';` → 他にこのファイルで `@/types` 由来の型を使っていなければ行ごと削除）
- 以下のシンボルを削除: `StoredRoastTimerState`, `StoredRoastTimerSettings`, `setRoastTimerState`, `getRoastTimerState`, `setRoastTimerSettings`, `getRoastTimerSettings`、および対応する localStorage キー定数。

- [ ] **Step 4-10: `lib/notifications.ts` から notifyRoastTimerComplete を削除**

`export async function notifyRoastTimerComplete()` を削除。`git grep -n "notifyRoastTimerComplete"` で参照が削除対象内のみだったことを確認（呼び出し元は roast-timer フック群＝削除済み）。

- [ ] **Step 4-11: `lib/soundFiles.ts` と `scripts/generate-sound-list.ts` から roastTimerSoundFiles を削除**

- `lib/soundFiles.ts`: `export const roastTimerSoundFiles: SoundFile[] = [...]` を削除。`git grep -n "roastTimerSoundFiles"` で他参照が無いことを確認（参照元は RoastTimerSettings＝削除済み）。
- `scripts/generate-sound-list.ts`: `roastTimerFiles` の取得・出力（82-124行目付近の roasttimer 関連）を削除し、生成出力に `roastTimerSoundFiles` を含めないようにする。

> サウンド本体（`public/sounds/roasttimer/`）の物理削除は任意。コード参照が消えれば未使用アセットになるだけ。今回はコード参照削除のみで可。アセット削除を行う場合はこのステップに追記。

- [ ] **Step 4-12: `app/page.tsx` から roast-timer エントリと未使用iconを削除**

`ACTIONS` から削除:
```typescript
  {
    key: 'roast-timer',
    title: 'ローストタイマー',
    description: '最適なタイマーで焙煎',
    href: '/roast-timer',
    icon: MdTimer,
  },
```
`CHRISTMAS_ICONS` から削除:
```typescript
  'roast-timer': PiBellFill,
```
これにより `MdTimer`（9行目）と `PiBellFill`（26行目 import）が未使用に → 両方 import から外す。

- [ ] **Step 4-13: `lib/homeFeatures.ts` から roast-timer エントリを削除**

`HOME_FEATURES` から削除:
```typescript
  {
    key: 'roast-timer',
    title: 'ローストタイマー',
    description: '最適なタイマーで焙煎',
  },
```

- [ ] **Step 4-14: roastTimerSettings 関連テストを削除**

`lib/firestore/common.test.ts` の `roastTimerSettings` を参照するテスト（`roastTimerSettingsの音声ファイルパスマイグレーション`、`result.roastTimerRecords` の assertion など）を削除。

- [ ] **Step 4-15: ビルドとテストで参照漏れを検出**

Run: `npm run build`
Expected: 成功。失敗時は `roastTimer` / `RoastTimer` / `RoastRecord` の未削除参照を解消。

Run: `npm run test:run`
Expected: 全テスト成功

- [ ] **Step 4-16: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: ローストタイマー・焙煎記録機能を削除

app/roast-timer, app/roast-record, components/roast-timer系, RoastRecord系,
hooks/roast-timer, useRoastTimer, lib/roastTimer*, types/timer を削除。
AppDataのroastTimer系フィールド、UserSettings.roastTimerSettings、localStorage、
通知、サウンド、ライフサイクル連携、ホーム登録を除去。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 最終クリーンアップと全体検証

**Files:**
- Modify（必要に応じて）: `docs/steering/FEATURES.md`, `docs/steering/REPOSITORY.md`, `docs/steering/UBIQUITOUS_LANGUAGE.md`, `docs/steering/TECH_SPEC.md`, `docs/steering/GUIDELINES.md`

- [ ] **Step 5-1: 残存参照の全文検索**

Run: `git grep -ni "roastTimer\|RoastTimer\|workProgress\|WorkProgress\|coffee-quiz\|coffee-trivia\|quiz_progress\|quizProgress\|dev-stories\|devStories\|changelog\|ChangelogEntry\|VERSION_HISTORY\|RoastRecord"`
Expected: コード（`app/`, `components/`, `hooks/`, `lib/`, `types/`, `scripts/`, `e2e/`）にヒットが無いこと。`docs/` のみヒットは Step 5-2 で対応。

> ヒットがあれば、それは削除漏れ。該当箇所を削除してから次へ。

- [ ] **Step 5-2: steering ドキュメントの更新**

`docs/steering/` 配下で5機能に言及している記述（機能一覧、リポジトリ構成、用語集など）を、現状（削除済み）に合わせて更新する。各ファイルを Read し、削除した機能の記述を除去。事実と異なる記述を残さない。

- [ ] **Step 5-3: 全体ビルド・全テスト・lint**

Run: `npm run build`
Expected: 成功

Run: `npm run test:run`
Expected: 全テスト成功

Run: `npm run lint`（プロジェクトにlintスクリプトがある場合）
Expected: エラー・warning ゼロ（プロジェクト方針: lintは常にゼロ）

- [ ] **Step 5-4: 手動確認（開発サーバー）**

Run: `npm run dev`
確認項目:
- ホーム画面に削除した5機能のカードが表示されない（担当表・スケジュール・試飲・欠点豆・パッケージ記録・ドリップガイド・その他のみ）
- 設定画面が正常に開き、「更新履歴」セクションが消えている
- clock画面（`useWorkChime` 使用）が正常に動作する
- コンソールにエラーが出ない

- [ ] **Step 5-5: steering 更新分をコミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
docs: 機能削除に伴いsteeringドキュメントを更新

削除した5領域(ローストタイマー/焙煎記録/作業進捗/コーヒークイズ/開発秘話)の
記述をsteeringから除去。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

> steering に変更が無ければこのコミットは不要。

---

## 完了後の扱い（このタスクのスコープ外・参考）

- **PR作成**: ユーザーの明示的な許可を得てから `gh pr create`。PR本文に削除範囲・検証結果・「Firestoreデータ削除は後工程」を明記。
- **Firestoreデータ削除（後工程）**: コードPRマージ・本番動作確認後に、別作業で `quiz_progress/{uid}`、`users/{uid}/workProgresses`（＋`progressHistory`）の削除、および各ユーザーdocの `roastTimerRecords`/`roastTimerState`/`roastTimerSettings`/`changelogEntries` フィールド削除を実施。**実行前にFirestoreバックアップ（エクスポート）必須**。

## Self-Review メモ

- スペック5領域すべてにタスクを割当（Task1=クイズ, Task2=開発秘話+チェンジログ, Task3=作業進捗, Task4=タイマー+焙煎記録, Task5=検証）。
- `FaSnowflake` import の削除タイミングを Task 3 に明示（progress と dev-stories で共用のため Task 2 では残す）。
- `MdTimer` は Task 4、`MdTimeline` は Task 3 で削除と明示（同一import行 `react-icons/md` のため取り違え注意）。
- `workProgresses` のサブコレクション除去（crud.ts/write-queue.ts）は具体的な置換後コードを提示。
- データ削除はスコープ外として明確化。
