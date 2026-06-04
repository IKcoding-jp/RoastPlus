# RoastPlus - Claude Code 固有設定

このファイルは Claude Code 専用の追加設定です。
`AGENTS.md` の共通プロジェクトルールをすべて継承します。

## Superpowers スキルの使い方

AGENTS.md の「Skill活用方針」は Codex 向けのため、Claude Code では以下のスキルを使います：

| 場面 | 使うスキル |
|---|---|
| 新機能・設計 | `superpowers:brainstorming` → `superpowers:writing-plans` |
| バグ修正 | `superpowers:systematic-debugging` |
| 実装 | `superpowers:test-driven-development` |
| 完了前の確認 | `superpowers:verification-before-completion` |
| PR前のレビュー | `superpowers:requesting-code-review` |

## 機能追加・削除時のルール

`app/` 配下のページ（`page.tsx`）を追加・削除したときは、必ず以下の3ファイルも合わせて更新する：

1. `data/legal/privacy-policy.ts` — 収集する業務データの一覧を更新し、`PRIVACY_POLICY_LAST_UPDATED` の日付と `lib/consent.ts` の `PRIVACY_POLICY_VERSION` をインクリメント
2. `data/legal/terms.ts` — 第2条のサービス機能一覧を更新し、`TERMS_LAST_UPDATED` の日付と `lib/consent.ts` の `TERMS_VERSION` をインクリメント
3. `lib/consent.test.ts` — バージョン定数のテスト期待値を更新

バージョンのインクリメントルール：機能の追加・削除はマイナーバージョン（x.**Y**.0）を上げる。

## Claude 固有ツール

- **Serena MCP**：コードファイルの読み書きは Serena MCP を優先する（グローバル設定準拠）
- **メモリシステム**：`C:\Users\kensa\.claude\projects\D--Dev-roastplus\memory\`
