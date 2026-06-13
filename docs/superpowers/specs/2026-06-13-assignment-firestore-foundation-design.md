# assignment データ層移行 (1/4): 共通ヘルパーとエラー通知基盤

- **issue**: #543（親 #542 の最初の子）
- **依存**: #547（dateUtils 集約）完了済み
- **日付**: 2026-06-13

## 目的

`app/assignment/lib/firebase/` はデータ保護ガードレールに違反している（`onSnapshot` のエラーコールバック欠如・`setDoc` 直呼び＋`console.error` のみで保存失敗が無言）。この移行を 4 回に分けて行う。本 issue (#543) はその **土台** を作る。

後続 #544〜#546 が共通して使う「購読エラー通知」「保存エラー通知」のヘルパーをここで確立し、`helpers.ts` の汎用部分を `lib/firestore/` 系へ一本化する。

**スコープ境界**: 本 issue では消費者（settings/masterData/assignment/shuffle の各関数）の移行は **行わない**。土台（ヘルパー＋エラー通知基盤＋単体テスト）の用意までで止める。既存コードは壊さず動かし続ける。

## 完了条件（issue より）

- 移行先モジュールが存在し、汎用ヘルパーが `lib/firestore/` 系に一本化されている
- 購読・保存のエラー通知ヘルパーが用意され、単体テストが付いている
- `typecheck` / `lint` / `test:run` 通過

## アーキテクチャ

新規モジュール `lib/firestore/assignment/` を作る。

```
lib/firestore/assignment/
  index.ts        バレルエクスポート
  references.ts   コレクション参照（common.ts の getUserDocRef を土台に組み立てる）
  helpers.ts      toMillisSafe・DEFAULT_* 定数・純粋関数（normalize/sort/areEqual）
  sync.ts         createSyncedSubscription・runWriteWithSync（エラー通知基盤）
  helpers.test.ts
  sync.test.ts
```

旧 `app/assignment/lib/firebase/helpers.ts` は **再エクスポートの薄いシム** にする（既存 import を壊さない）。中身は新モジュールから re-export するだけ。

### 1. references.ts — コレクション参照（common.ts と重複解消）

旧 `helpers.ts` は `doc(db, 'users', userId)` で自前に住所を組んでいた。これを `common.ts` の `getUserDocRef(userId)` を土台に組み直す（重複解消が #543 の核心）。

```ts
import { collection } from 'firebase/firestore';
import { getUserDocRef } from '../common';

export function getTeamsCollection(userId: string) {
  return collection(getUserDocRef(userId), 'teams');
}
// members / taskLabels / assignmentDays / shuffleEvents /
// shuffleHistory / assignmentSettings / managers / pairExclusions も同様
```

### 2. helpers.ts — 汎用ロジック（移設のみ・挙動不変）

旧 `helpers.ts` から **そのまま** 移す（挙動を変えない）:
- `toMillisSafe`（Firestore 時刻 → ミリ秒。`firestoreUtils.toJSDate` と概念は近いが、`toMillis()` メソッド対応の差があるため挙動維持を優先し本 issue では統合しない）
- `DEFAULT_SHUFFLE_SETTINGS` / `DEFAULT_TABLE_SETTINGS`
- 純粋関数 `normalizeAssignmentsForDate` / `sortAssignmentsStable` / `areAssignmentsEqual`（＋内部の `assignmentKey`）

### 3. sync.ts — エラー通知基盤（本 issue の主成果物）

手本は `lib/firestore/userData/`。assignment は「小さな保存をたくさん」型なので、userData 級の write-queue はオーバースペック（YAGNI）。薄いラッパー 2 つにする。

**購読ラッパー** `createSyncedSubscription` — `subscribeUserData` の再購読ロジックを汎用化。実際の `onSnapshot` 呼び出しは呼び出し側が渡す（doc / query の型差を吸収するため）。

```ts
export function createSyncedSubscription<S>(
  attach: (onNext: (snapshot: S) => void, onError: (error: { code?: string }) => void) => () => void,
  onData: (snapshot: S) => void
): () => void
```

- 成功時: `retryCount` リセット、`clearSyncError()`、`onData(snapshot)`
- 失敗時: `reportSyncError(toSyncErrorType(error))`、指数バックオフ（1s 起点・上限 30s）で再購読
- 解除時: タイマー破棄、`unsubscribe()`、`clearSyncError()`

**保存ラッパー** `runWriteWithSync` — 保存処理を包み、失敗を通知して再 throw。

```ts
export async function runWriteWithSync<T>(operation: () => Promise<T>): Promise<T>
```

- 成功時: `clearSaveError()`（write-queue と同じ挙動）、結果を返す
- 失敗時: `reportSaveError(toSyncErrorType(error))` してから `throw`（呼び出し側にも伝える）

> 補足: `reportSyncError`/`reportSaveError` は userData と同じ単一チャンネル。assignment 保存成功で `clearSaveError()` する挙動は既存 write-queue と一貫させる。

### 4. index.ts — バレル

references / helpers / sync の公開 API を re-export。

## データフロー

```
#544〜#546 の各関数（後続）
  └ 購読: createSyncedSubscription((onNext,onError)=>onSnapshot(ref,onNext,onError), cb)
  └ 保存: runWriteWithSync(() => setDoc(...))
        └ 失敗 → lib/syncStatus（reportSyncError / reportSaveError）→ 同期/保存バナー
```

本 issue ではこのフローの **道具とテスト** までを用意する。

## エラーハンドリング

- 業務データの購読・保存失敗は必ず `lib/syncStatus` 経由でユーザー通知（ガードレール準拠）
- `runWriteWithSync` の `console.error` は `reportSaveError` と必ず併用（「console.error だけ」を新規に書かない）

## テスト

- `helpers.test.ts`: `toMillisSafe`（null/文字列/`toMillis()`/seconds・nanoseconds）、`normalizeAssignmentsForDate`、`sortAssignmentsStable`、`areAssignmentsEqual` の純粋関数テスト
- `sync.test.ts`: `syncStatus` をモックし、
  - 購読成功で `clearSyncError` 呼び出し・`onData` 受け渡し
  - 購読失敗で `reportSyncError` 呼び出し・再購読タイマー発火（fake timers）
  - 解除で `unsubscribe` と `clearSyncError`
  - `runWriteWithSync` 成功で結果返却＋`clearSaveError`、失敗で `reportSaveError`＋再 throw

## 非対象（YAGNI / 後続）

- 消費者関数の移行（#544〜#546）
- `toMillisSafe` と `firestoreUtils.toJSDate` の統合（挙動差リスクのため見送り）
- `FirestoreTimestamp` 型の重複解消（#543 の範囲外）
- write-queue 級の同時書き込み制御（assignment には過剰）
