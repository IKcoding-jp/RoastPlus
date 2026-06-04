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

## コミット前の差分レビュー習慣（IK学習用）

git commit を実行する前に、必ず以下を行うこと：

1. `git diff --staged` を実行して差分を確認する
2. 変更内容を日本語で3行以内に要約する
3. 「今回の変更で一番重要な1行」を1つだけ指摘する
4. IKに「ここまで理解できましたか？」と確認してから commit する

目的：AIが書いたコードをそのまま流さず、IKが差分を把握してからコミットする習慣づくり。

## Claude 固有ツール

- **Serena MCP**：コードファイルの読み書きは Serena MCP を優先する（グローバル設定準拠）
- **メモリシステム**：`C:\Users\kensa\.claude\memory\`（グローバル統合済み）
