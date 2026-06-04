# RoastPlus - Claude Code メインガイド

このファイルは、Claude Code が RoastPlus で作業するときの主入口です。
Claude Code では本ファイルを最優先し、`AGENTS.md` は Codex との共通詳細ルール・補助参照として扱います。

## 基本方針

- 回答、説明、作業報告は日本語で行います。
- RoastPlus は現場 iPad 中心の業務PWAです。派手さより、壊れにくさ、分かりやすさ、データ保護を優先します。
- 非自明な作業では、目的、前提、影響範囲、成功条件、検証方法を短く整理してから進めます。
- 自分が作っていない変更を勝手に戻しません。
- コミット、push、PR作成、本番操作、デプロイは、ユーザーの明示依頼がある場合のみ行います。
- 秘密鍵、APIキー、トークン、`.env`、認証情報を表示、コピー、コミットしません。

## AGENTS.md の扱い

`AGENTS.md` は、Claude Code ではサブ参照です。常に全文を読み込む前提にはせず、詳細確認が必要なときに参照します。

- コーディング規約、Firebase / セキュリティ、Git運用、完了報告の詳細が必要なときに読む。
- Codex で作業する場合は、従来どおり `AGENTS.md` を主入口として扱う。
- `CLAUDE.md` と `AGENTS.md` が矛盾する場合、Claude Code では `CLAUDE.md` を優先する。

## CLAUDE.md 運用ルール

- このファイルには、毎回 Claude Code に守ってほしい恒久ルールだけを書く。
- 詳細な仕様、長い手順、個別機能の説明は `docs/steering/` や仕様書に置き、ここには参照ルールだけを書く。
- 新しいルールを追加するときは、既存の `AGENTS.md` / `docs/steering/` と重複・矛盾しないか確認する。
- 一時的なメモや個人環境だけの内容は、リポジトリ共有の `CLAUDE.md` には書かない。

## Steering Documents 参照ルール

非自明な作業では、実装前に関連する `docs/steering/` を確認します。

| 場面 | 参照するドキュメント |
|---|---|
| 目的・スコープ確認 | `docs/steering/PRODUCT.md` |
| 機能仕様・禁止事項 | `docs/steering/FEATURES.md` |
| 技術制約・ADR | `docs/steering/TECH_SPEC.md` |
| ファイル配置・依存方向 | `docs/steering/REPOSITORY.md` |
| 実装・テスト・Git運用 | `docs/steering/GUIDELINES.md` |
| 命名・用語 | `docs/steering/UBIQUITOUS_LANGUAGE.md` |

機能追加・削除、データ構造変更、認証・認可・Rules・Functions変更では、実装後に `docs/steering/` の更新要否も確認します。

## 作業開始チェック

非自明な作業では、必要に応じて以下を確認します。

1. `git status --short --branch` で未コミット変更を確認する。
2. 関連する `docs/steering/` と対象ファイルを読む。
3. 影響する画面、データ、認証・認可、Firestore Rules / Storage Rules、Cloud Functions を確認する。
4. 既存テスト、手動確認手順、実行すべき検証コマンドを決める。

## ドキュメント整合性チェック

`docs/steering/`、`CLAUDE.md`、`AGENTS.md`、`README.md`、`DESIGN.md` を更新したとき、または機能追加・削除・名称変更を行ったときは、完了前に以下を実行します。

```powershell
npm run docs:check
```

失敗した場合は、出力された不整合候補を見て、現行仕様に合わせてドキュメントを更新します。
過去の仕様・計画を残す `docs/superpowers/` は履歴扱いのため、この自動チェックの対象外です。

## Superpowers スキルの使い方

`AGENTS.md` の「Skill活用方針」は Codex 向けの説明を多く含むため、Claude Code では必要な場面だけ以下を使います。

| 場面 | 使うスキル |
|---|---|
| 新機能・設計 | `superpowers:brainstorming` → `superpowers:writing-plans` |
| バグ修正 | `superpowers:systematic-debugging` |
| 実装 | `superpowers:test-driven-development` |
| 完了前の確認 | `superpowers:verification-before-completion` |
| PR前のレビュー | `superpowers:requesting-code-review` |

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
