# RoastPlus - Claude Code メインガイド

このファイルは、Claude Code が RoastPlus で作業するときの主入口です。毎回このファイルを最優先で守ります。

## 基本方針

- 回答、説明、作業報告は日本語で行います。
- RoastPlus は現場 iPad 中心の業務PWAです。派手さより、壊れにくさ、分かりやすさ、データ保護を優先します。
- 非自明な作業では、目的、前提、影響範囲、成功条件、検証方法を短く整理してから進めます。
- 自分が作っていない変更を勝手に戻しません。
- コミット、push、PR作成、本番操作、デプロイは、ユーザーの明示依頼がある場合のみ行います。
- 秘密鍵、APIキー、トークン、`.env`、認証情報を表示、コピー、コミットしません。

## CLAUDE.md 運用ルール

- このファイルには、毎回 Claude Code に守ってほしい恒久ルールだけを書く。
- 詳細な仕様、長い手順、個別機能の説明は `docs/steering/` や仕様書に置き、ここには参照ルールだけを書く。
- 新しいルールを追加するときは、既存の `docs/steering/` と重複・矛盾しないか確認する。
- 一時的なメモや個人環境だけの内容は、リポジトリ共有の `CLAUDE.md` には書かない。

## 開発ワークフロー

コード実装時の Steering 参照ルールと作業開始チェックは `.claude/rules/development-workflow.md` に定義し、関連ファイル（`app/`、`lib/`、`functions/`、Rules など）の編集時に自動適用します。

## ドキュメント整合性チェック

`docs/steering/`、`CLAUDE.md`、`README.md`、`DESIGN.md` を更新したとき、または機能追加・削除・名称変更を行ったときは、完了前に以下を実行します。

```powershell
npm run docs:check
```

失敗した場合は、出力された不整合候補を見て、現行仕様に合わせてドキュメントを更新します。
過去の仕様・計画を残す `docs/superpowers/` は履歴扱いのため、この自動チェックの対象外です。

## PR作成後のCI監視

ユーザーがPR作成まで依頼した場合、PR作成で作業完了にしません。

1. PR作成後、`gh pr checks --watch` または GitHubコネクタでCIを監視する。
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

## 機能追加・削除時のルール

`app/` 配下のページ（`page.tsx`）を追加・削除したときは、必ず以下の3ファイルも合わせて更新する：

1. `data/legal/privacy-policy.ts` — 収集する業務データの一覧を更新し、`PRIVACY_POLICY_LAST_UPDATED` の日付と `lib/consent.ts` の `PRIVACY_POLICY_VERSION` をインクリメント
2. `data/legal/terms.ts` — 第2条のサービス機能一覧を更新し、`TERMS_LAST_UPDATED` の日付と `lib/consent.ts` の `TERMS_VERSION` をインクリメント
3. `lib/consent.test.ts` — バージョン定数のテスト期待値を更新

バージョンのインクリメントルール：機能の追加・削除はマイナーバージョン（x.**Y**.0）を上げる。

## Claude 固有ツール

- **Serena MCP**：コードファイルの読み書きは Serena MCP を優先する（グローバル設定準拠）
- **メモリシステム**：`C:\Users\kensa\.claude\projects\D--Dev-roastplus\memory\`

### MCP / ツールの使い分け

- **firebase MCP**：Firestore の構造・Rules・Functions ログの**調査**に積極活用する。`firestore_*_document`（書込・削除）系は不可逆なため、ユーザーの明示依頼があるときだけ実行し、本番データの変更は原則行わない。
- **chrome-devtools MCP**：実装画面のライブ確認・パフォーマンス計測・アクセシビリティ確認に使う。**UI に変化がある実装をしたら、毎回その画面を開いてスクリーンショットを撮り、目視確認まで自動で行う**（ロジック／テスト／ドキュメントのみの変更は対象外）。現場 iPad 中心のため `emulate` で iPad 幅を再現し、必要に応じ `lighthouse_audit` で PWA 品質を確認する。E2E は playwright と役割を分ける。
- **playwright MCP**：E2E が失敗したときにブラウザを実際に操作して原因を特定する。新規 E2E を書く前に、セレクタ・操作手順を MCP で試してからコードに落とす。
- **context7**：Next.js / Firebase / Tailwind など更新の速いライブラリの API・設定・移行を扱うときは、自分の記憶で書く前に最新ドキュメントを確認する（特に Tailwind v4 と Next.js App Router）。
- **/code-review**：まとまった実装（機能追加・ロジック変更）を終えたら、コミット／PR 前に**毎回自動で実行**する（typo・ドキュメント・軽微なテスト修正のみは対象外）。要件充足の確認は `superpowers:requesting-code-review` と役割を分け、指摘は機械的に直さず**なぜその指摘かをユーザーと確認してから反映**する。
- **frontend-design**：新しい UI のモック・実装に使う。ただし業務 PWA の方針（白背景・クリーン・iPad で操作しやすい・装飾過多を避ける）に合わせて創造性を抑制する。
- **skills**：critique（UI 批評）、micro-interactions（細かい操作フィードバック設計）、web-quality-audit（品質総点検）、spec-driven-development（曖昧な要望を要件→設計→タスクに整理）、find-skills（新しい能力探し）を、それぞれの場面で呼ぶ。
