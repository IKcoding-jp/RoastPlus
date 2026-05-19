---
name: issue-creator
description: 'Use when the user wants to create, draft, or prepare a GitHub Issue for RoastPlus, including feature ideas, bug reports, refactors, docs work, UI improvements, and requests like "Issueを作って", "実装したい", "バグを報告", or "改善したい".'
---

# Issue Creator

RoastPlus用のGitHub Issue起票スキル。目的は、要件を整理し、必要な範囲だけコードベースを調べ、ユーザー確認後にIssue本文と必要なWorking Documentsを作ること。

## 基本原則

- このスキルではコードを修正しない。調査、Issue本文作成、Issue作成、Working Documents作成までに限定する。
- **REQUIRED SUB-SKILL:** Use `superpowers:brainstorming` before finalizing scope for ambiguous feature, UI, refactor, or bug reports.
- `superpowers:writing-plans` は原則使わない。RoastPlusでは `docs/working/` がIssue単位の計画出力先である。
- GitHub Issue作成、ファイル作成、外部コマンド実行はCodexの現在の権限ルールに従う。勝手にpushやPR作成をしない。
- 日本語で説明し、初心者向けに「何をするか」「なぜ必要か」「次に何を確認するか」を短く示す。

## Workflow

1. 要件を聞き取る。
2. Issueタイプと規模を判定する。
3. 必要な範囲だけ関連ファイルを調査する。
4. Issue本文案を作る。
5. ユーザーに確認する。
6. 許可があれば `gh issue create` でIssueを作る。
7. 規模に応じて `docs/working/` にWorking Documentsを作る。

## Issueタイプ

| タイプ | 用途 | GitHub label |
| --- | --- | --- |
| `bug` | 不具合修正 | `bug` |
| `feat` | 機能追加 | `enhancement` |
| `refactor` | 振る舞いを変えない整理 | `refactor` |
| `docs` | ドキュメント | `documentation` |
| `style` | UI/見た目 | `design` |
| `perf` | 性能改善 | `performance` |
| `chore` | 雑務・設定 | `chore` |
| `test` | テスト追加・修正 | `testing` |

迷う場合はユーザーに短く確認する。軽微な分類迷いなら最も近いタイプを選び、本文に背景を書く。

## 規模判定

| 規模 | 基準 | Working Documents |
| --- | --- | --- |
| 小 | 1-2ファイル、単純修正、typo、軽微な設定 | 原則スキップ。バグや複数セッション化しそうなら作る |
| 中 | 3-5ファイル、既存機能改善、UI調整 | 作成推奨 |
| 大 | 6ファイル以上、新機能、複雑な変更 | 必ず作成 |

迷う場合は「中」として扱う。

## 調査方針

- 対象ファイルが明確なら、そのファイルだけ確認する。
- 不明な場合は `rg` で関連語を検索する。
- UI変更では、先に `components/ui` と `DESIGN.md` / `docs/steering/FEATURES.md` の必要箇所を確認する。
- 外部ライブラリやAPIの現在仕様が関係する場合は、Context7または公式ドキュメントを使う。
- Issue本文には、確認できた対象ファイルだけを書く。推測は「推測」と明記する。

## Issue本文テンプレート

```markdown
## 概要
[何をするかを1-2文]

## 理由/背景
[なぜ必要か]

## 対象箇所
- `path/to/file.ts` - [関係する理由]

## 作業内容
- [ ] タスク1
- [ ] タスク2

## 影響範囲
- [関連する画面、機能、データ]

## 検証観点
- [確認すべきbuild/test/手動確認]
```

小規模なdocs/choreでは「対象箇所」「影響範囲」を省略してよい。

## Working Documents

必要な場合は `docs/working/{YYYYMMDD}_{Issue番号}_{短いタイトル}/` を作る。テンプレートは `references/working-documents.md` を読む。

基本構成:

```text
docs/working/{YYYYMMDD}_{Issue番号}_{短いタイトル}/
├── requirement.md
├── tasklist.md
├── design.md
└── testing.md
```

`tasklist.md` は原則必須。docs/choreなどで不要な文書は作らない。

## GitHub Issue作成

PowerShell前提で一時ファイルをリポジトリルートに作る。`/tmp` は使わない。

```powershell
$issueBody = @"
[Issue本文]
"@
$issueBody | Set-Content -Encoding UTF8 .tmp-issue-body.md
gh issue create --title "<type>: <タイトル>" --body-file .tmp-issue-body.md --label "<label>"
Remove-Item -LiteralPath .tmp-issue-body.md
```

Issue作成前に、本文、タイトル、label、Working Documents作成有無をユーザーに確認する。

## 完了報告

- 作成したIssue番号とURL
- 作成したWorking Documentsのパス、またはスキップ理由
- 次に実行するなら `fix-issue` を使うこと
