Part of #407

## 調査した対象ファイル

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

## root `users/{uid}` に保存されている主なデータ構造

- `todaySchedules`
- `roastSchedules`
- `tastingSessions`
- `tastingRecords`
- `notifications`
- `userSettings`
- `shuffleEvent`
- `encouragementCount`
- `roastTimerRecords`
- `roastTimerState`
- `defectBeans`
- `defectBeanSettings`
- `workProgresses`
- `dripRecipes`
- `changelogEntries`
- `userConsent`
- `__meta.pingedAt`

詳細は `docs/working/20260524_407_root-user-doc-first-split/investigation.md` に整理。

## 肥大化しやすいデータ候補

- `workProgresses`: 各作業に `progressHistory[]` があり、作業数と履歴数の両方で増える。
- `tastingSessions` / `tastingRecords`: 記録数が増え、`aiAnalysis` 文字列も大きくなりやすい。
- `roastSchedules`: OCR追加や過去日蓄積で増える。
- `roastTimerRecords`: 焙煎ごとに線形増加。
- `dripRecipes`: 各レシピが `steps[]` を持つが、P1候補としては優先度低め。

## 第一分離候補として選んだ対象

`workProgresses`

## 選定理由

- 配列自体と各要素内の `progressHistory[]` が二重に増える。
- 進捗追加・履歴更新のたびに `workProgresses` 配列全体が root doc に保存される。
- 保存ロジックが `lib/firestore/workProgress/*` に比較的まとまっており、第一分離として段階化しやすい。
- `users/{uid}/workProgresses/{workProgressId}` として owner isolation しやすい。

## 移行計画

- 新パス案: `users/{uid}/workProgresses/{workProgressId}`
- `workProgressId` は既存 `WorkProgress.id` を使う。
- 移行済み判定は `users/{uid}/_meta/dataSplits` に持つ案を第一候補にする。
- 新形式が存在する場合は新形式を優先する。
- 新形式が存在しない場合は旧root `workProgresses` から読む。
- 初回読み込み時の自動移行ではなく、保存時の段階移行を第一候補にする。
- 旧root `workProgresses` は今回削除しない。

## 互換方針

- 既存ユーザーのroot docに旧データが残っていても読み込める。
- 新形式が存在する場合は新形式を優先する。
- 移行済み判定がある場合は、サブコレクションが空でも旧rootを復活させない。
- `AppData.workProgresses` の型は当面維持し、UIの大規模変更を避ける。

## ロールバック方針

- 旧root `workProgresses` は削除しないため、PR適用前から存在する旧データはrevert後も読める。
- 新形式運用開始後の最新変更を単純revert後にも読むには、二重書き込みかcopy-back方針が必要。
- 旧形式削除、本格移行、copy-back用の管理処理は別Issueに分ける。

## Firestore rulesへの影響

このPRでは rules 変更なし。

実装PRでは `users/{uid}/workProgresses/{workProgressId}` の owner-only ルール追加が必要。

## rules testへの影響

このPRでは rules test 変更なし。

実装PRでは以下を追加する。

- owner は `users/{uid}/workProgresses/{workProgressId}` を read/write できる。
- anonymous は read/write できない。
- other user は read/write できない。
- `_meta/dataSplits` を使う場合は owner-only を確認する。

## 実装した内容、または今回は実装しなかった理由

今回は調査・設計PRに留めた。

理由:

- `saveUserData` が現在 `AppData` 全体を root doc に保存しており、`workProgresses` だけを止めるには保存キューの責務変更が必要。
- `subscribeUserData` が root doc だけを購読しているため、サブコレクション購読とのマージ設計が必要。
- 空サブコレクションと未移行状態の区別がないと、削除済みデータが旧root fallbackで復活する。
- rollback時に、二重書き込みを続けるかcopy-back手順を別Issueにするかの判断が必要。

## 確認コマンドと結果

- `git diff --check` - 成功
- `npm run typecheck` - 成功
- `npm run test:run` - 成功（95 files / 1290 tests passed）
- `npm run build` - 成功
- `npm run lint` - 成功（既存の `MODULE_TYPELESS_PACKAGE_JSON` warning は表示）
- `npm run test:rules` - rules未変更のため未実行

## 残リスク

- 実データ量は本番データを直接確認していないため、コード上の構造からの推定を含む。
- 旧rootデータを今回削除していないため、完全な肥大化解消には次段階が必要。
- `workProgresses` を分離しても、個別 `WorkProgress` の `progressHistory[]` が極端に増える場合は追加分離が必要。
- 新旧併存期間では読み込み優先順位と保存タイミングの継続確認が必要。

## 次Issueに分けるべき作業

- `workProgresses` の最小サブコレクション化実装。
- Firestore rules と rules test 追加。
- `_meta/dataSplits` による移行済み判定。
- `getUserData` / `subscribeUserData` の新旧マージテスト追加。
- rootへの二重書き込みを続けるか、copy-back手順を用意するかの決定。
- 旧root `workProgresses` の削除。
