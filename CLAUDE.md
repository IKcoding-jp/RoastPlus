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

## Claude 固有ツール

- **Serena MCP**：コードファイルの読み書きは Serena MCP を優先する（グローバル設定準拠）
- **メモリシステム**：`C:\Users\kensa\.claude\projects\D--Dev-roastplus\memory\`
