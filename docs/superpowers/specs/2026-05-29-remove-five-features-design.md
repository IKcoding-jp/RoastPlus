# 設計: 5領域の機能削除（ロースト系・作業進捗・コーヒークイズ・開発秘話）

- 作成日: 2026-05-29
- ステータス: 承認待ち
- 種別: 機能削除（コードベースのスリム化）

## 背景と目的

以下の機能は実態として使われておらず、今後の有用性も低いとオーナーが判断した。保守コストを下げ、コードベースを軽くするために削除する。

- **ローストタイマー**: キッチンタイマーで代用可能。
- **焙煎記録（roast-record）**: ローストタイマーと連携するが、記録機能自体も使われていない。
- **作業進捗**: 追加入力が現場の負担になり、本末転倒。
- **コーヒークイズ**: 業務に無関係で誰も使っていない。最大規模（約51ファイル）で保守コストが高い。
- **開発秘話＋チェンジログ**: オーナーの自己満足コンテンツ。

### 前提・判断の根拠

- 本番稼働中で複数ユーザーが利用しているアプリである。
- 「使われていない」判断はアクセス解析ではなくオーナーの確信に基づく。リスクは認識した上で、オーナーの判断（即完全削除）を採用する。
- データも含めて削除する方針。ただしデータ削除はコードPRより後の別作業とする（切り戻し余地を残すため）。

## スコープ

### このタスクで行うこと（コードPR）

1. 5領域のディレクトリ・ファイルを削除
2. 5領域を参照している共通ファイル7点を修正
3. `firestore.rules` から該当コレクションのルールを削除
4. 5領域に紐づくテストを削除し、残テストが緑であることを確認

### このタスクで行わないこと（後工程）

- **Firestore上の既存データ削除**は別作業とする。コードPRをマージ・動作確認した後に、Firebase Admin の一回限りスクリプトまたはコンソールで実施する。本ドキュメントの「Firestoreデータ削除（後工程）」に手順方針のみ記載する。
- 上記5領域以外の機能には一切手を加えない。

## 削除対象

### まるごと削除するディレクトリ・ファイル（約130ファイル）

**app層**
- `app/roast-timer/`
- `app/roast-record/`
- `app/progress/`
- `app/coffee-trivia/`
- `app/changelog/`
- `app/dev-stories/`

**components層**
- `components/roast-timer/`
- `components/coffee-quiz/`
- `components/work-progress/`
- `components/RoastTimer.tsx`
- `components/RoastTimerSettings.tsx`

**hooks層**
- `hooks/roast-timer/`（フォルダ全体）
- `hooks/useRoastTimer.ts`（＋ `.test.ts`）
- `hooks/useQuizData.ts`（＋ `.test.ts`）
- `hooks/useQuizSession.ts`（＋ `.test.ts`）
- `hooks/useQuizSound.ts`（存在する場合）
- `hooks/useWorkProgressActions.ts`

**lib層**
- `lib/coffee-quiz/`（フォルダ全体）
- `lib/firestore/workProgress/`（フォルダ全体）
- `lib/roastTimerSettings.ts`（＋ `.test.ts`）
- `lib/roastTimerUtils.ts`（＋ `.test.ts`）

**types層**
- `types/timer.ts`
- `types/work-progress.ts`
- `types/changelog.ts`

**data層**
- `data/dev-stories/`（フォルダ全体）

> ⚠️ `hooks/useWorkChime`（clock画面で使用）は**削除しない**。作業進捗とは別物。

### 修正する共通ファイル（7点）

| ファイル | 修正内容 |
|---|---|
| `app/page.tsx` | `ACTIONS` 配列と `CHRISTMAS_ICONS` から4エントリ（roast-timer, progress, coffee-trivia, dev-stories）と関連 import を削除 |
| `lib/homeFeatures.ts` | `HOME_FEATURES` 配列から4エントリ削除（`CONFIGURABLE_HOME_FEATURES` にも自動反映） |
| `types/index.ts` | `export * from './timer'` / `'./work-progress'` / `'./changelog'` の3行削除 |
| `types/settings.ts` | `AppData` から `roastTimerRecords` / `roastTimerState` / `roastTimerSettings` / `workProgresses` / `changelogEntries` を削除。`RoastTimerSettings` の import も削除 |
| `hooks/useAppData.ts` | `INITIAL_APP_DATA` と `applyIncomingSnapshot` から該当フィールドを削除 |
| `app/settings/page.tsx` | `VERSION_HISTORY` の import と「更新履歴」セクション（`/changelog` へのリンク含む）を削除 |
| `firestore.rules` | `quiz_progress/{userId}` と `users/{userId}/workProgresses/{...}` のルールブロックを削除 |

### 修正するテスト

- `app/page.test.tsx` … 削除機能に関連するケースを削除
- `app/settings/home/page.test.tsx` … 関連ケースを削除
- `lib/firestore/common.test.ts` … `roastTimerRecords` / `workProgresses` 関連を削除
- その他、削除対象に紐づくテストファイルは本体と一緒に削除

## データフローへの影響

`AppData` 型から5フィールドを削除することで、Firestore同期（`useAppData` の snapshot 処理）から該当データが外れる。これによりアプリは該当データを読み書きしなくなる。Firestore上の既存ドキュメント/フィールドは残るが、参照されなくなる（後工程で削除）。

`quiz_progress` と `workProgresses` は独立コレクション/サブコレクションのため、ルール削除後はクライアントからアクセス不可になる。

## 検証方法

1. **`npm run build`** — TypeScript型チェックで参照漏れを検出（これが最も確実な網）
2. **`npm run test:run`** — 削除機能のテストを除いた残テストが全て緑であることを確認
3. **手動確認** — ホーム画面・設定画面・clock画面が壊れず表示されること、削除した機能へのリンクが残っていないこと

## Firestoreデータ削除（後工程・このタスク外）

コードPRのマージ・動作確認後に、別作業として実施する。

- **独立コレクション**: `quiz_progress/{userId}`、`users/{userId}/workProgresses`（＋ `progressHistory` サブコレクション）→ 全ユーザー分のドキュメントを削除
- **AppDataドキュメント内フィールド**: `roastTimerRecords` / `roastTimerState` / `roastTimerSettings` / `changelogEntries` → 各ユーザーのドキュメントから該当フィールドを削除

実行手段は Firebase Admin SDK の一回限りスクリプト、または Firebase コンソールでの手動削除。**不可逆操作のため、実行前に Firestore のバックアップ（エクスポート）を取ることを強く推奨**。

## リスクと対応

| リスク | 対応 |
|---|---|
| 実は使っていたユーザーがいた | オーナーの確信を採用。データ削除を後工程に分けることで、コードのみ切り戻し可能な状態を一定期間維持 |
| 参照漏れによるビルド失敗 | `npm run build` の型チェックで全て検出可能 |
| Firestoreデータ削除の不可逆性 | コードPRと分離。実行前にバックアップ取得 |
| 削除対象外（useWorkChime等）の巻き込み | 削除対象から明示的に除外済み |

## 想定コミット/PR

- 1 PR で完結（コード削除＋共通ファイル修正＋ルール削除＋テスト整理）
- データ削除スクリプトは含めない（後工程）
