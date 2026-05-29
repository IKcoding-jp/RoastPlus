# Claude Code + Codex 併用セットアップ 設計書

## 概要

Claude CodeとCodex CLIを同一プロジェクトで併用するための設定を整備する。
両ツールが同じプロジェクトルールを参照しつつ、各ツール固有の機能は専用ファイルで管理する。

## 現状

| ファイル | 状態 | 役割 |
|---|---|---|
| `~/.claude/CLAUDE.md` | 存在する | Claude グローバル設定 |
| `~/.codex/AGENTS.md` | 存在する | Codex グローバル設定 |
| `roastplus/AGENTS.md` | 存在する（Codex専用と明記） | プロジェクトルール（両ツールが読む） |
| `roastplus/CLAUDE.md` | **なし** | Claude専用プロジェクト設定（要作成） |

重要な前提：Claude CodeはプロジェクトのAGENTS.mdも読む。

## 変更内容

### 変更① `roastplus/AGENTS.md` の冒頭修正

現在の冒頭「このファイルは、Codex が RoastPlus リポジトリで作業するときのプロジェクト固有ルールです。」を、AIエージェント全般向けの表現に書き換える。内容は変更しない。

### 変更② `roastplus/CLAUDE.md` を新規作成

3セクション構成：

#### セクション1：AGENTS.md の上書き宣言

AGENTS.md の以下セクションは Codex 向けのため Claude Code では無効とする：
- **学習モード**：実装後に要点3つ説明する挙動。Claude Codeはグローバル設定のバイブコーディング方針（説明は判断に必要な時だけ）を優先する。
- **タスク完了時の必須報告**：6セクション形式の詳細報告。Claude Codeは短い結論報告のみ行う。

#### セクション2：Superpowers スキルのマッピング

AGENTS.md の「Skill活用方針」はCodex向けスキル名で書かれているため、Claude Code用にスキルを対応付ける。

| 場面 | 使うスキル |
|---|---|
| 新機能・設計 | `superpowers:brainstorming` → `superpowers:writing-plans` |
| バグ修正 | `superpowers:systematic-debugging` |
| 実装 | `superpowers:test-driven-development` |
| 完了前の確認 | `superpowers:verification-before-completion` |
| PR前のレビュー | `superpowers:requesting-code-review` |

#### セクション3：Claude固有ツールの参照

- Serena MCP優先使用（グローバル `~/.claude/CLAUDE.md` の設定に準拠）
- メモリシステム：`C:\Users\kensa\.claude\projects\D--Dev-roastplus\memory\`

## 変更しないもの

- `~/.claude/CLAUDE.md`（グローバルClaude設定）
- `~/.codex/AGENTS.md`（グローバルCodex設定）
- `roastplus/AGENTS.md` の本文（コーディング規約・セキュリティ・Firebase・Git等）

## 成功条件

- Claude CodeがAGENTS.mdの共通ルール＋CLAUDE.mdのClaude固有ルールで動作する
- CodexがAGENTS.mdの共通ルールで動作する（CLAUDE.mdは読まない）
- 両ツールで重複管理するファイルがない
