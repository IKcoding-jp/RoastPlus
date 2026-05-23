# Issue #407 root user doc肥大化 調査メモ

対象Issue: #407 `[P1] root user doc肥大化の調査と第一分離`

作成日: 2026-05-24

## 結論

第一分離候補は `workProgresses` に絞る。

ただし、このPRでは保存形式の変更はまだ入れない。理由は、`saveUserData` が現在 `AppData` 全体を root `users/{uid}` に merge 保存しており、サブコレクション化を入れるには「削除済みデータをroot fallbackで復活させない移行済み判定」と「PR revert時に新形式の最新データをどう戻すか」を先に固定する必要があるため。

このPRの成果物は、現状調査、第一分離候補、移行計画、互換方針、ロールバック方針、rules/test影響の明文化とする。

## 調査対象

- `hooks/useAppData.ts`
- `lib/firestore/common.ts`
- `lib/firestore/userData/crud.ts`
- `lib/firestore/userData/write-queue.ts`
- `lib/firestore/workProgress/*`
- `lib/drip-guide/useRecipes.ts`
- `types/index.ts`
- `types/settings.ts`
- `types/schedule.ts`
- `types/tasting.ts`
- `types/timer.ts`
- `types/work-progress.ts`
- `types/defect-beans.ts`
- `types/notification.ts`
- `firestore.rules`
- `tests/rules/firebase.rules.test.ts`
- `hooks/useAppData.test.ts`
- `lib/firestore/common.test.ts`
- `lib/firestore/workProgress/helpers.test.ts`

## root `users/{uid}` に保存される主な構造

`AppData` として root `users/{uid}` に集約される主なフィールドは以下。

| フィールド | 型 | 増え方 | リスク |
| --- | --- | --- | --- |
| `todaySchedules` | `TodaySchedule[]` | 日付ごとの予定。各要素に `timeLabels[]` を持つ | OCR/日別予定で増える可能性 |
| `roastSchedules` | `RoastSchedule[]` | 日付ごとの焙煎予定 | OCR追加・過去日蓄積で増える可能性 |
| `tastingSessions` | `TastingSession[]` | 試飲セッション | `aiAnalysis` 文字列を含むため肥大化しやすい |
| `tastingRecords` | `TastingRecord[]` | 試飲記録 | セッションに紐づいて継続増加 |
| `notifications` | `Notification[]` | 通知データ | localStorage移行あり。通常は中程度 |
| `userSettings` | `UserSettings` | 設定Map | 小さい |
| `shuffleEvent` | `ShuffleEvent` | 担当表シャッフル中状態 | 現在は担当表側でサブコレクション化済みの領域が多い |
| `encouragementCount` | `number` | カウンタ | 小さい |
| `roastTimerRecords` | `RoastTimerRecord[]` | 焙煎タイマー記録 | 焙煎ごとに線形増加 |
| `roastTimerState` | `RoastTimerState` | 現在状態 | 頻繁に保存されるが、サイズは小さい |
| `defectBeans` | `DefectBean[]` | ユーザー追加の欠点豆 | 画像URLや説明文を含むが件数は限定的と推定 |
| `defectBeanSettings` | map | 欠点豆ごとの設定 | 小から中 |
| `workProgresses` | `WorkProgress[]` | 作業進捗 | 各要素が `progressHistory[]` を持つため二重に増える |
| `dripRecipes` | `DripRecipe[]` | ドリップレシピ | 各レシピが `steps[]` を持つ。localStorage移行あり |
| `changelogEntries` | `ChangelogEntry[]` | レガシー更新履歴 | 型と正規化はあるが、主要保存フローでの利用は限定的 |
| `userConsent` | `UserConsent` | 同意情報 | 小さい |
| `__meta.pingedAt` | server timestamp | 時刻同期用 | `lib/timeSync.ts` が root doc に merge 保存 |

担当表系の `teams`, `members`, `managers`, `taskLabels`, `assignmentDays`, `shuffleEvents`, `shuffleHistory`, `assignmentSettings`, `pairExclusions` は、すでに `users/{uid}/...` 配下のサブコレクションとして扱われている。

## 保存・読み込みフロー

### 読み込み

- `useAppData` はログイン後に `getUserData(user.uid)` を呼び、初期データを読み込む。
- その後 `subscribeUserData(user.uid, callback)` で root `users/{uid}` の `onSnapshot` を購読する。
- `getUserData` と `subscribeUserData` は root doc の `snapshot.data()` を `normalizeAppData` に通して `AppData` に戻す。
- root doc が存在しない場合、`getUserData` は `defaultData` を `setDoc` で新規作成する。

### 保存

- `useAppData.updateData` は現在の `AppData` と新しい `AppData` を比較し、変更された top-level key を `lockedKeys` に入れる。
- 実保存は `saveUserData(user.uid, normalizedData)`。
- `saveUserData` はユーザーごとの debounce queue に `AppData` 全体を保持する。
- `executeWrite` -> `performWrite` で `setDoc(userDocRef, cleanedData, { merge: true })` を実行する。
- `merge: true` ではあるが、`cleanedData` には多くの場合 `AppData` の配列フィールド全体が入るため、1フィールド変更でも root doc の大きな配列を丸ごと上書きする。
- 例外的に `userSettings`, `shuffleEvent`, `roastTimerState` は `deleteField()` で削除扱いを補助している。

### オフライン・復元・同期で注意が必要な点

- `useAppData` は「ローカルに実データがあるのに incoming snapshot が全空配列ならスキップ」するデータ消失防止を持つ。
- 保存中は `lockedKeys` 単位でローカル値を優先し、Firestore ackが返るまで incoming snapshot とマージする。
- ロック単位は top-level field で、配列要素単位ではない。
- サブコレクション化すると root doc snapshot だけでは新形式の変更を検知できないため、対象サブコレクションの購読も必要になる。

## 肥大化しやすい候補

| 候補 | 肥大化しやすさ | 実装影響 | 互換性 | 評価 |
| --- | --- | --- | --- | --- |
| `workProgresses` | 高。配列内に `progressHistory[]` があり、作業ごと・履歴ごとに増える | 中。`lib/firestore/workProgress/*` に保存ロジックがまとまっているが、`saveUserData` 全体保存の影響あり | root fallbackしやすいが、空配列と未移行の区別が必要 | 第一候補 |
| `tastingSessions` + `tastingRecords` | 高。記録数に加え `aiAnalysis` 文字列が大きくなりやすい | 高。セッション/記録の整合性、AI分析、複数画面に影響 | 新旧併存は可能だが対象が2種類 | 次候補 |
| `roastSchedules` | 高。OCR追加・過去日蓄積で増える | 中から高。日付別分離が自然だが、既存UIは全配列前提 | 日付単位にすると互換設計が必要 | 次候補 |
| `roastTimerRecords` | 中から高。焙煎ごとに線形増加 | 小から中。関連画面は比較的少ない | root fallbackしやすい | 実装はしやすいが、`workProgresses` より肥大化の質が単純 |
| `dripRecipes` | 中。`steps[]` を持つが件数は限定的 | 小。利用箇所は `useRecipes` 中心 | localStorage移行済みフローとの整合が必要 | 最小実装候補だがP1の肥大化対策としては優先度低 |
| `defectBeans` | 中。説明文・画像URLを持つ | 中。Storage画像と合わせた整合が必要 | master collection と user custom の整理が必要 | 別Issue向き |
| `notifications` | 中。localStorage移行あり | 小から中 | 既読IDはlocalStorage | P1候補としては弱い |

## 第一分離候補

`workProgresses` を第一分離候補にする。

理由:

1. `WorkProgress` は `progressHistory[]` を持ち、root配列の要素数と各要素内履歴の両方で増える。
2. 進捗追加・履歴更新のたびに `workProgresses` 配列全体が `saveUserData` 経由で root doc に保存される。
3. 保存ロジックが `lib/firestore/workProgress/crud.ts` と `lib/firestore/workProgress/progress.ts` に比較的まとまっており、UI全面改修なしで段階分離しやすい。
4. `users/{uid}/workProgresses/{workProgressId}` という owner isolation しやすいパスに分けられる。
5. rules変更は `users/{uid}/workProgresses/{workProgressId}` の owner-only 追加で済む見込み。

## 移行計画案

### 新しいパス案

- `users/{uid}/workProgresses/{workProgressId}`
- `workProgressId` は既存 `WorkProgress.id` を使う。
- 移行済み判定は `users/{uid}/_meta/dataSplits` に持つ案が安全。
  - 例: `{ workProgressesMigrated: true, workProgressesMigratedAt: <timestamp> }`
  - `firestore.rules` では `users/{uid}/_meta/{document=**}` がすでに owner-only 許可済み。

### 読み込み優先順位

1. `_meta/dataSplits.workProgressesMigrated` が true の場合は、`users/{uid}/workProgresses/*` を正とする。
2. サブコレクションにドキュメントが存在する場合も、新形式を優先する。
3. 移行済み判定がなく、サブコレクションも空の場合だけ、旧root `workProgresses` を fallback として読む。

この判定がないと、ユーザーが全作業進捗を削除した状態と、まだ移行していない状態を区別できない。区別できないまま root fallback すると、削除済みの旧rootデータが復活する危険がある。

### 保存タイミング

第一実装では、初回読み込み時の自動移行より、保存時の段階移行を優先する。

- 初回読み込みだけでは root doc から新形式への書き込みが発生しないため、本番データへの影響が小さい。
- `workProgresses` が更新されたタイミングで、サブコレクションへ upsert/delete する。
- サブコレクションへの保存成功後に移行済み判定を保存する。
- 旧root `workProgresses` は今回削除しない。

### 削除同期

サブコレクション保存時には、現在の `workProgresses` に存在しない `workProgressId` の旧サブコレクションdocを削除する必要がある。

ただし、未移行状態では旧root fallbackがあるため、削除同期は移行済み判定後にだけ行う。

## 互換方針

- 既存ユーザーの root `workProgresses` は今回削除しない。
- 新形式が存在する場合は新形式を優先する。
- 新形式が存在しない場合は旧root `workProgresses` から復元する。
- 移行済み判定がある場合は、サブコレクションが空でも「作業進捗なし」と扱い、旧rootを復活させない。
- `AppData.workProgresses` の型は当面維持し、UI側の大規模変更を避ける。
- root `users/{uid}` へ新しい大きな配列フィールドは追加しない。

## ロールバック方針

- 旧root `workProgresses` は今回削除しないため、PRをrevertしてもPR適用前から存在した旧データは読み込める。
- ただし、新形式運用開始後にサブコレクションへだけ保存された最新変更は、単純revert後の旧コードからは読めない。
- 実装PRに進む前に、次のどちらを採用するかを決める必要がある。
  - rootへの二重書き込みを一時的に続ける。rollbackは簡単だが、root肥大化解消が遅れる。
  - rootへは二重書き込みしない。root肥大化は止まるが、rollback時はサブコレクションからrootへ戻す手順が必要。
- 旧形式削除、本格移行、copy-back用の管理スクリプトは今回入れない。必要なら別Issueに分ける。

## Firestore rules / rules test への影響

現在の rules:

- `users/{uid}` は owner-only read/write。
- `users/{uid}/assignmentDays/{date}` など担当表系サブコレクションは owner-only。
- `users/{uid}/_meta/{document=**}` は owner-only。
- `workProgresses` 用サブコレクションの明示ルールはまだない。

実装する場合の最小rules追加:

```text
match /users/{userId}/workProgresses/{workProgressId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

rules testで追加すべき範囲:

- owner が `users/{uid}/workProgresses/{workProgressId}` を read/write できる。
- anonymous は read/write できない。
- other user は read/write できない。
- `_meta/dataSplits` の owner-only は既存 `_meta/{document=**}` ルールで通るが、移行済み判定を使うなら明示テストを追加する。

## 実装判断

このPRでは実装しない。

理由:

1. 現在の `saveUserData` は `AppData` 全体を root doc に保存するため、`workProgresses` だけを本当に root から止めるには保存キューの責務変更が必要。
2. `subscribeUserData` は root doc だけを購読しているため、サブコレクション化後は対象コレクションの購読と root snapshot のマージ順を設計する必要がある。
3. 空サブコレクションと未移行状態を区別する移行済み判定がないと、削除済みデータが旧root fallbackで復活する。
4. rollback方針で、二重書き込みを続けるか、copy-back手順を別Issueにするかを決める必要がある。
5. 既存rules testは root `users/{uid}` と `assignmentDays` のowner isolationだけを確認しており、今回候補のサブコレクション用テストは未作成。

## 今回やらないこと

- `workProgresses` のサブコレクション化実装。
- `saveUserData` / `getUserData` / `subscribeUserData` の保存・購読フロー変更。
- `firestore.rules` / `storage.rules` の変更。
- Firestore rules test の追加・更新。
- root `users/{uid}` から旧 `workProgresses` を削除する処理。
- 全データの一括移行。
- Cloud Functions、Next.js API Routes、外部サービス設定の追加。

## 次Issueに分けるべき作業

1. `workProgresses` の最小サブコレクション化実装。
2. `users/{uid}/workProgresses/{workProgressId}` の rules と rules test 追加。
3. `_meta/dataSplits` を使った移行済み判定の追加。
4. `getUserData` / `subscribeUserData` の新旧マージテスト追加。
5. `saveUserData` が rootへ保存するフィールドから `workProgresses` を除外するか、二重書き込み期間を設けるかの決定。
6. 旧root `workProgresses` の削除はさらに別Issueで扱う。

## 残リスク

- 実データ量は本番データを直接確認していないため、コード上の構造からの推定を含む。
- `workProgresses` をサブコレクション化しても、1つの `WorkProgress` 内の `progressHistory[]` が極端に増える場合は、個別doc肥大化の追加対策が必要。
- 旧rootデータを今回削除しないため、完全なroot doc縮小には次段階が必要。
- 新旧併存期間では、読み込み優先順位と保存タイミングのテストが重要になる。

## 確認結果

- `git diff --check` - 成功
- `npm run typecheck` - 成功
- `npm run test:run` - 成功（95 files / 1290 tests passed）
- `npm run build` - 成功
- `npm run lint` - 成功（既存の `MODULE_TYPELESS_PACKAGE_JSON` warning は表示）
- `npm run test:rules` - rules未変更のため未実行
