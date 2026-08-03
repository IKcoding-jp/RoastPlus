# RoastPlus - Claude Code メインガイド

このファイルは、Claude Code が RoastPlus で作業するときの主入口です。毎回このファイルを最優先で守ります。

## プロジェクト概要

RoastPlus は、ドリップパックコーヒー製造現場（約8名・iPad中心）向けの業務PWAです。派手さより、壊れにくさ・分かりやすさ・データ保護を優先します。

- 技術スタック: Next.js (App Router) / React / TypeScript / Tailwind CSS v4 / Firebase (Auth, Firestore, Storage, Functions) / OpenAI（Functions経由のみ）
- 詳細は `docs/steering/PRODUCT.md`（目的・スコープ）と `docs/steering/TECH_SPEC.md`（技術制約）を参照

## 基本方針

- 回答、説明、作業報告は日本語で行います。
- 非自明な作業では、目的、前提、影響範囲、成功条件、検証方法を短く整理してから進めます。
- 自分が作っていない変更を勝手に戻しません。
- コミット、push、PR作成、本番操作、デプロイは、ユーザーの明示依頼がある場合のみ行います。
- 秘密鍵、APIキー、トークン、`.env`、認証情報を表示、コピー、コミットしません。
- 既存機能を壊さないことを最優先にし、大きな変更は小さなPRに分割します。

## 検証コマンド

| コマンド | 用途 | 実行タイミング |
| --- | --- | --- |
| `npm run typecheck` | TypeScript 型チェック | コード変更後は毎回 |
| `npm run lint` | ESLint（カスタムルール含む） | コード変更後は毎回 |
| `npm run test:run` | 単体テスト一括実行（Vitest） | コード変更後は毎回 |
| `npm run test:rules` | Firestore/Storage Rules テスト（Java 21+ 必須） | Rules 変更時は必須 |
| `npm run docs:check` | ドキュメント整合性チェック | `docs/steering/`・`CLAUDE.md`・`README.md`・`DESIGN.md` 更新時、機能追加・削除・名称変更時 |
| `npm run deadcode` | 未使用コード検出（knip） | リファクタ・機能削除後 |
| `npm run test:e2e` | Playwright E2E | 画面フロー変更時 |

コードを変更したら、最低限 `typecheck`・`lint`・`test:run` の3つを通してから完了報告します。テストが失敗したまま「完了」と報告しません。
`docs/superpowers/` は過去の仕様・計画の履歴置き場であり、`docs:check` の対象外です。現行仕様の根拠にしないでください。

## データ保護ガードレール（最重要）

現場の業務データを預かるアプリのため、以下を必ず守ります。

- **保存・購読の失敗を黙って握りつぶさない。** Firestore の保存・購読・トランザクションのエラー処理を新しく書くときは、必ずユーザーへの通知（トースト・バナー等）につなげる。`console.error` だけのエラー処理を新規に書かない。
- **エラー処理は3択から選ぶ**: (1) 業務データの保存・購読の失敗 → `reportSaveError`・トースト等で必ずユーザーに通知する。(2) UI操作（フォーム送信等）の失敗 → トーストまたはローカルの error state で表示する。(3) localStorage キャッシュ・音声再生・ブラウザ通知APIの失敗 → 黙認してよい（graceful degradation）。業務データの読み書きの失敗は黙認しない。
- **ユーザーデータの書き込み・購読は既存のデータ層を経由する。** `lib/firestore/` 配下の関数（write-queue・トランザクションヘルパー）を使い、ページ・コンポーネント・`app/<機能>/lib/` から Firestore SDK（`setDoc` / `onSnapshot` 等）を直接呼ばない。購読には必ずエラーコールバックを渡し、失敗を `lib/syncStatus.ts` の通知につなげる。新規コードで Firestore SDK を直接呼ぶパターンを真似しない。
- **`firestore.rules` / `storage.rules` の変更はテスト駆動で行う。** 先に `tests/rules/` へテストを書き、`npm run test:rules` で検証する。権限を緩める方向の変更は、必ずユーザーに確認してから行う。
- **本番データの変更・削除は、ユーザーの明示依頼なしに絶対に行わない。**

## 設計ガードレール

- **依存方向は一方向のみ**: `types/ → lib/ → hooks/ → components/ → app/`。特に `lib/` から `@/components/*` を import しない。循環依存禁止（詳細は `docs/steering/REPOSITORY.md`）。
- **業務ロジックは `lib/` の純粋関数に置く**: 計算・集計・フィルタ・ソート・日付処理は `lib/`（または `app/<機能>/lib/`）に置き、単体テストを付ける。`page.tsx` やコンポーネントに直書きしない。
- **ファイル肥大を防ぐ**: `page.tsx` は表示とイベント結線に徹する。1ファイルが約300行を超えそうなら、先にフック・コンポーネント・`lib/` への分割を検討する。
- **日付・時刻は日本時間のローカルタイム前提**: `getMonth()` は0始まりなので、文字列化するときは必ず `+1` する。日付キーの生成に `toISOString()` を使わない（UTCにずれて日付がまたがる）。
- **日付・時刻のフォーマット/パースは `lib/dateUtils.ts` に集約する**: 新しいフォーマット処理が必要になったら、まず `lib/dateUtils.ts` を確認し、なければそこに追加してテストを書く。ページ・フック・コンポーネント内にローカルの日付フォーマット関数を定義しない。曜日名などの定数は `lib/constants.ts` に置く。
- **集計・CSV は `lib/productionRecords.ts` に一元化されている**: 数式・CSVフォーマットを変更するときは、`lib/productionRecords.test.ts` を同じPRで更新する。
- **Service Worker（`public/sw.js`）を変更したら `SW_VERSION` を +1 する**: 上げ忘れは古い画面が配信され続ける事故につながる（`CACHE_NAME` / `RUNTIME_CACHE` は `SW_VERSION` から導出される）。プリキャッシュ対象を変える場合は、`docs/steering/TECH_SPEC.md` の「プリキャッシュ方針」と `lib/pwa/sw.test.ts` を同時に更新する。
- **共通UIは `components/ui/` を使う**: 生の `<button>`・`<select>`・checkbox はESLintカスタムルールで禁止。デザインルールは `DESIGN.md`、実装規約は `docs/steering/GUIDELINES.md` に従う。
- **try/catch は「実際に例外を投げうる処理」だけを包む**: 同期の純粋計算や例外を投げない API（`new Date()` 等）を try/catch で包まない。防御が必要なら値の検証（`isNaN` 等）で行う。
- **ドメイン型（Firestore に保存されるデータの型）は `types/` 配下に置く**: コンポーネントの Props 型や export しないローカル型はファイル内定義でよい。
- **同名で目的の異なるユーティリティ関数を作らない**: 既存と名前が衝突する場合は、目的が分かる名前を付ける（例: `formatTime` ではなく `formatSecondsAsTimer`）。

## 変更種別ごとの必須チェック

| 変更内容 | 必須作業 |
| --- | --- |
| `app/` 配下のページ追加・削除 | 下記「法的ドキュメント更新」を実施し、マイナーバージョン（x.**Y**.0）を上げる |
| Firestore のデータ構造・Rules 変更 | `tests/rules/` 更新 + `npm run test:rules`、`docs/steering/` の更新要否を確認 |
| 集計・CSV の変更 | `lib/productionRecords.test.ts` を同時更新 |
| ドキュメント更新・機能の追加・削除・名称変更 | `npm run docs:check` を実行し、不整合を解消 |
| UI に変化がある実装 | chrome-devtools MCP で iPad 幅のスクリーンショットを撮り目視確認（ロジック／テスト／ドキュメントのみの変更は対象外） |

### ページ追加・削除時の法的ドキュメント更新

`app/` 配下のページ（`page.tsx`）を追加・削除したときは、必ず以下の3ファイルも合わせて更新する：

1. `data/legal/privacy-policy.ts` — 収集する業務データの一覧を更新し、`PRIVACY_POLICY_LAST_UPDATED` の日付と `lib/consent.ts` の `PRIVACY_POLICY_VERSION` をインクリメント
2. `data/legal/terms.ts` — 第2条のサービス機能一覧を更新し、`TERMS_LAST_UPDATED` の日付と `lib/consent.ts` の `TERMS_VERSION` をインクリメント
3. `lib/consent.test.ts` — バージョン定数のテスト期待値を更新

## 開発ワークフロー

コード実装時の Steering 参照ルールと作業開始チェックは `.claude/rules/development-workflow.md` に定義し、関連ファイル（`app/`、`lib/`、`functions/`、Rules など）の編集時に自動適用します。

## PR作成後のCI監視

ユーザーがPR作成まで依頼した場合、PR作成で作業完了にしません。

1. PR作成後、GitHub MCP でCIステータスを監視する（MCP が使えない場合は `gh pr checks --watch` を使う）。
2. CIが失敗した場合は、失敗jobとログを確認し、原因を説明する。
3. 修正できる失敗は修正し、コミット、push、再監視を行う。
4. すべての必須チェックが通り、マージ可能な状態になるまで繰り返す。
5. マージはユーザーが行う。AIエージェントは明示依頼なしにマージしない。

## Superpowers スキルの使い方

作業内容に応じて、以下のスキルを必要な場面だけ使います。

| 場面           | 使うスキル                                                |
| -------------- | --------------------------------------------------------- |
| 新機能・設計   | `superpowers:brainstorming` → `superpowers:writing-plans` |
| バグ修正       | `superpowers:systematic-debugging`                        |
| 実装           | `superpowers:test-driven-development`                     |
| 完了前の確認   | `superpowers:verification-before-completion`              |
| PR前のレビュー | `superpowers:requesting-code-review`                      |

関係ないスキルを同時に使いすぎず、作業内容に必要なものだけ選びます。

## MCP / ツールの使い分け

- **firebase MCP**：Firestore の構造・Rules・Functions ログの**調査**に積極活用する。`firestore_*_document`（書込・削除）系は不可逆なため、ユーザーの明示依頼があるときだけ実行し、本番データの変更は原則行わない。
- **chrome-devtools MCP**：実装画面のライブ確認・パフォーマンス計測・アクセシビリティ確認に使う。現場 iPad 中心のため `emulate` で iPad 幅を再現し、必要に応じ `lighthouse_audit` で PWA 品質を確認する。E2E は playwright と役割を分ける。
- **playwright MCP**：E2E が失敗したときにブラウザを実際に操作して原因を特定する。新規 E2E を書く前に、セレクタ・操作手順を MCP で試してからコードに落とす。
- **GitHub MCP**：Issue の内容確認・PR の作成・状態確認・CI ステータス取得・PR コメント投稿に使う。ローカルブランチのプッシュ（`git push`）のみ Bash で行い、それ以外の GitHub 操作は MCP を優先する。`gh` CLI との混在を避け、同じ操作を両方で実行しない。
- **context7**：Next.js / Firebase / Tailwind など更新の速いライブラリの API・設定・移行を扱うときは、自分の記憶で書く前に最新ドキュメントを確認する（特に Tailwind v4 と Next.js App Router）。
- **/code-review**：まとまった実装（機能追加・ロジック変更）を終えたら、コミット／PR 前に**毎回自動で実行**する（typo・ドキュメント・軽微なテスト修正のみは対象外）。要件充足の確認は `superpowers:requesting-code-review` と役割を分け、指摘は機械的に直さず**なぜその指摘かをユーザーと確認してから反映**する。
- **frontend-design**：新しい UI のモック・実装に使う。ただし業務 PWA の方針（白背景・クリーン・iPad で操作しやすい・装飾過多を避ける）に合わせて創造性を抑制する。
- **skills**：critique（UI 批評）、micro-interactions（細かい操作フィードバック設計）、web-quality-audit（品質総点検）、spec-driven-development（曖昧な要望を要件→設計→タスクに整理）、find-skills（新しい能力探し）を、それぞれの場面で呼ぶ。

## CLAUDE.md 運用ルール

- このファイルには、毎回 Claude Code に守ってほしい恒久ルールだけを書く。
- 詳細な仕様、長い手順、個別機能の説明は `docs/steering/` や仕様書に置き、ここには参照ルールだけを書く。
- 新しいルールを追加するときは、既存の `docs/steering/` と重複・矛盾しないか確認する。
- 一時的なメモ、個人環境だけの内容（ローカルパス等）、クローズされうるIssue番号は、リポジトリ共有の `CLAUDE.md` には書かない。
