# Tasting Data Loss Recovery Spec

## 目的

Issue #458 のため、本番環境の試飲感想記録データ消失について、現状確認、復旧可否判断、再発防止を行う。

## 背景となる問題

本番環境の「試飲感想記録」でテイスティングセッションが全消失した可能性がある。`users/{uid}` ドキュメント内の `tastingSessions` / `tastingRecords` が対象であり、本番データを扱うため読み取り確認と書き込み復旧を分けて進める必要がある。

## 対象ユーザー

- RoastPlus の本番利用者
- 試飲感想記録を登録・確認する現場スタッフ

## 現在の挙動

- `tastingSessions` と `tastingRecords` は `users/{uid}` ドキュメントの root フィールドとして保存される。
- `useAppData.updateData` は変更されたキーを把握できるが、従来は `saveUserData` に正規化済み `AppData` 全体を渡していた。
- 古いタブや古いクライアント状態が別フィールドを保存すると、触っていない `tastingSessions` / `tastingRecords` も古い空配列として root ドキュメントへ送られる可能性がある。

## 期待する挙動

- 本番Firestoreの対象ユーザーについて、現在の `tastingSessions` / `tastingRecords` 件数を読み取り専用で確認できる。
- Firestore PITR または backup から復旧可能か判断できる。
- 復旧が必要な場合、復旧対象、復旧方法、ロールバック方法を提示し、明示承認後にだけ書き込む。
- 通常のアプリ保存では、変更していない root フィールドを古い値や空配列で上書きしない。
- `useAppData` を経由しない直接保存経路でも、変更していない root フィールドを古い値や空配列で上書きしない。

## 受け入れ条件

- 本番の `tastingSessions` / `tastingRecords` の現状件数を説明できる。
- Firestore PITR または backup の利用可否を説明できる。
- 復旧できる場合、対象データと手順、戻し方を説明してから復旧できる。
- 復旧できない場合、理由と代替案を説明できる。
- `updateData` 経由の保存では、変更対象外の `tastingSessions` / `tastingRecords` を空配列でFirestoreへ送らない。
- 作業進捗や同意保存など、`saveUserData` を直接呼ぶ経路でも変更対象フィールドを明示する。
- 上記の再発防止を自動テストで確認できる。

## 具体例

### 例1: 古い画面状態で通知だけを保存する

- 前提: ローカル状態の `tastingSessions` / `tastingRecords` が古い空配列。
- 操作: `encouragementCount` だけを変更して保存する。
- 期待: Firestore root へ送る payload は `encouragementCount` のみ。`tastingSessions: []` と `tastingRecords: []` は送らない。

### 例2: 作業進捗だけを保存する

- 前提: `workProgresses` はサブコレクション同期対象。
- 操作: `workProgresses` だけを変更して保存する。
- 期待: root の `workProgresses` を増やさず、必要なサブコレクション同期だけを行う。

### 例3: 利用規約への同意だけを保存する

- 前提: `getUserData` で取得した `AppData` に古い tasting 配列が含まれている可能性がある。
- 操作: `userConsent` だけを変更して保存する。
- 期待: Firestore root へ送る payload は `userConsent` のみ。`tastingSessions` / `tastingRecords` は送らない。

## 影響する画面

- `/tasting`
- `/tasting/sessions/new`
- `/tasting/sessions/[id]`
- 試飲感想記録の関連フォーム・一覧

## 影響するデータ

- `users/{uid}.tastingSessions`
- `users/{uid}.tastingRecords`
- 変更対象外フィールドを送らない保存制御として、同じ root ドキュメント内の他フィールドにも影響する。

## 認証・認可・Firestore Rules・Storage Rules への影響

- 認証・認可の仕様変更はしない。
- Firestore Rules / Storage Rules は変更しない。
- 本番読み取り・復旧は管理者権限のCLIまたはFirebase Consoleで実施する。

## Cloud Functions への影響

- なし。

## やらないこと

- 対象ユーザー未確定のまま、本番 `users` コレクションを広く列挙しない。
- 明示承認なしに本番Firestoreへ復旧、上書き、削除、一括更新を行わない。
- `tastingSessions` / `tastingRecords` の保存場所を今回のIssueでサブコレクションへ移行しない。

## 未決事項

- ユーザー本人の画面で `/tasting`、スケジュール、ドリップガイドが復旧後の内容を表示できるか確認する。

## 本番読み取り確認結果

- 対象 `uid`: ユーザーから提示された対象ユーザー
- 現在の `users/{uid}` updateTime: `2026-05-28T05:56:33.182292Z`
- 現在の `tastingSessions`: 0件
- 現在の `tastingRecords`: 0件
- PITR `2026-05-28T05:56:00Z` 時点の `tastingSessions`: 4件
- PITR `2026-05-28T05:56:00Z` 時点の `tastingRecords`: 16件
- PITR `2026-05-28T05:57:00Z` 時点の `tastingSessions`: 0件
- PITR `2026-05-28T05:57:00Z` 時点の `tastingRecords`: 0件

同じ更新で以下の配列フィールドも空になっている。

| field | `2026-05-28T05:56:00Z` | current |
| --- | ---: | ---: |
| `todaySchedules` | 6 | 0 |
| `roastSchedules` | 12 | 0 |
| `tastingSessions` | 4 | 0 |
| `tastingRecords` | 16 | 0 |
| `dripRecipes` | 2 | 0 |

推定原因: 古いクライアント状態または初期空状態を含む root `AppData` 全体保存により、未変更の配列フィールドが空配列で上書きされた可能性が高い。

## 復旧結果

ユーザー承認後、PITR `2026-05-28T05:56:00Z` から以下5フィールドだけを本番 `users/{uid}` へ書き戻した。

| field | 復旧前 | 復旧後 |
| --- | ---: | ---: |
| `todaySchedules` | 0 | 6 |
| `roastSchedules` | 0 | 12 |
| `tastingSessions` | 0 | 4 |
| `tastingRecords` | 0 | 16 |
| `dripRecipes` | 0 | 2 |

- 復旧前 updateTime: `2026-05-28T05:56:33.182292Z`
- 復旧後 updateTime: `2026-05-28T09:22:44.847631Z`
- 書き込み方式: REST PATCH + `updateMask` で5フィールドのみ更新
- 安全策: 復旧前 updateTime を `currentDocument.updateTime` の前提条件に指定

## 検証方法

- `npm run test:run`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:rules`
- `git diff --check`
- 本番データ確認は、対象ユーザーの `users/{uid}` の件数のみ確認する。
