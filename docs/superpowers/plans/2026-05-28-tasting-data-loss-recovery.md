# Tasting Data Loss Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Issue #458 の本番試飲データ消失について、復旧可否を判断し、古いクライアント状態による再消失を防ぐ。

**Architecture:** 本番復旧は読み取り調査、復旧案提示、承認後の書き込みに分ける。アプリ側は `useAppData` が把握した変更キーを `saveUserData` へ渡し、Firestore root 書き込み payload を変更対象フィールドだけに絞る。

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase Firestore, Vitest, gcloud/Firebase CLI

---

### Task 1: 本番復旧調査の安全境界

**Files:**
- Reference: `docs/superpowers/specs/2026-05-28-tasting-data-loss-recovery.md`

- [x] **Step 1: Issue本文を確認する**

Run: `gh issue view 458 --json number,title,body,labels,state,assignees,comments`

Expected: Issue #458 の対象データ、受け入れ条件、注意点が確認できる。

- [x] **Step 2: 本番Firestore設定を読み取り確認する**

Run: `gcloud firestore databases describe --database="(default)" --project=roastplus-72fa6`

Expected: PITR や backup 設定が確認できる。

- [x] **Step 3: Firestore backups を読み取り確認する**

Run: `gcloud firestore backups list --project=roastplus-72fa6`

Expected: `READY` 状態の backup があるか確認できる。

- [x] **Step 4: 対象uidを確認する**

User input required: 消失が報告された対象ユーザーの Firebase Auth `uid`。

- [x] **Step 5: 対象uidだけを読み取り確認する**

Run after approval: `users/{uid}` の `tastingSessions.length` / `tastingRecords.length` と最終更新に関係するフィールドだけを確認する。

Expected: 本番の現状件数を説明できる。秘密情報や個人情報はログに出さない。

- [x] **Step 6: PITRで消失直前の件数を確認する**

Run: Firestore REST `documents:batchGet` with `readTime`.

Expected:
- current `tastingSessions`: 0
- current `tastingRecords`: 0
- `2026-05-28T05:56:00Z` `tastingSessions`: 4
- `2026-05-28T05:56:00Z` `tastingRecords`: 16
- `2026-05-28T05:57:00Z` `tastingSessions`: 0
- `2026-05-28T05:57:00Z` `tastingRecords`: 0

### Task 2: 古いクライアント状態による上書き防止

**Files:**
- Modify: `hooks/useAppData.ts`
- Modify: `app/consent/page.tsx`
- Modify: `lib/firestore/userData/crud.ts`
- Modify: `lib/firestore/userData/write-queue.ts`
- Modify: `lib/firestore/workProgress/crud.ts`
- Modify: `lib/firestore/workProgress/progress.ts`
- Test: `hooks/useAppData.test.ts`
- Test: `lib/firestore/write-queue.test.ts`
- Test: `lib/firestore/workProgress/crud.test.ts`
- Test: `app/consent/page.test.tsx`

- [x] **Step 1: 失敗テストを書く**

Add a write queue test that calls `saveUserData` with `updatedFields: ['encouragementCount']` and stale empty `tastingSessions` / `tastingRecords`.

Expected before implementation: root write payload still contains empty tasting arrays and the test fails.

- [x] **Step 2: useAppData の保存オプションをテストする**

Add a hook test that updates only `encouragementCount` and expects `saveUserData` options to include `updatedFields: ['encouragementCount']`.

Expected before implementation: options do not include `updatedFields` and the test fails.

- [x] **Step 3: updateData から変更キーを渡す**

Modify `hooks/useAppData.ts` so `saveUserData` receives:

```ts
{
  syncWorkProgresses: mutatedKeys.includes('workProgresses'),
  updatedFields: mutatedKeys,
}
```

- [x] **Step 4: 書き込みpayloadを変更キーに絞る**

Modify `lib/firestore/userData/write-queue.ts` so root document writes use only `options.updatedFields` when provided, while keeping full writes backward compatible when the option is omitted.

- [x] **Step 5: キュー内の保存オプションをマージする**

Modify `lib/firestore/userData/crud.ts` so debounced writes merge `updatedFields` by union. If either pending write is a legacy full write, keep full-write behavior.

- [x] **Step 6: saveUserData直接呼び出しにも更新キーを渡す**

Modify `lib/firestore/workProgress/crud.ts`, `lib/firestore/workProgress/progress.ts`, and `app/consent/page.tsx` so direct `saveUserData` calls pass the intended `updatedFields`.

- [x] **Step 7: 関連テストを実行する**

Run: `npm run test:run -- hooks/useAppData.test.ts lib/firestore/write-queue.test.ts lib/firestore/userData.test.ts lib/firestore/workProgress/crud.test.ts app/consent/page.test.tsx`

Expected: all selected tests pass.

### Task 3: 復旧判断と書き戻し

**Files:**
- No code changes until restoration method is approved.

- [x] **Step 1: 復旧候補を比較する**

Compare current `users/{uid}` counts with PITR/backup candidates. Do not import or write to production in this step.

- [x] **Step 2: 復旧案を提示する**

Document target fields, source backup/time, expected record counts, rollback method, and manual screen check.

Recommended restore source: PITR `2026-05-28T05:56:00Z`.

Recommended restore target fields:
- `todaySchedules`
- `roastSchedules`
- `tastingSessions`
- `tastingRecords`
- `dripRecipes`

Reason: the same `2026-05-28T05:56:33.182292Z` update emptied all five array fields.

Rollback method: Before patching, use the current `updateTime` as a precondition. If restoration is wrong, use PITR at the pre-patch current time to restore the five fields back to the current empty state or apply the explicitly saved before-patch field snapshot.

- [x] **Step 3: 明示承認後にだけ復旧する**

Run only after user approval. Prefer minimal field-level write-back for `users/{uid}.tastingSessions` and `users/{uid}.tastingRecords` over full database import.

Executed after explicit user approval: restored `todaySchedules`, `roastSchedules`, `tastingSessions`, `tastingRecords`, and `dripRecipes` from PITR `2026-05-28T05:56:00Z` with an updateTime precondition.

- [x] **Step 4: 復旧後確認**

Record before/after counts and verify `/tasting` shows the expected sessions.

Post-restore counts:
- `todaySchedules`: 6
- `roastSchedules`: 12
- `tastingSessions`: 4
- `tastingRecords`: 16
- `dripRecipes`: 2

Remaining manual check: user should open the production app and confirm the restored tasting sessions and related screens render as expected.
