# Working Documents Templates

Use these templates only when the Issue is medium/large, bug-related, or likely to span multiple sessions.

## requirement.md

```markdown
# Requirement: Issue #<number> <title>

## 目的
[このIssueで達成すること]

## 背景
[なぜ必要か]

## スコープ

### 含む

- [含める作業]

### 含まない

- [今回は扱わない作業]

## 受け入れ条件

- [ ] [ユーザー視点で確認できる条件]
```

## tasklist.md

```markdown
# Tasklist: Issue #<number> <title>

## Phase 1: 調査

- [ ] [関連ファイル確認]

## Phase 2: 実装

- [ ] [変更1]
- [ ] [変更2]

## Phase 3: 検証

- [ ] [build/test/手動確認]
```

## design.md

```markdown
# Design: Issue #<number> <title>

## 方針
[実装方針]

## 変更対象

- `path/to/file.ts` - [変更内容]

## 影響範囲

- [影響する機能]

## リスク

- [注意点]
```

## testing.md

```markdown
# Testing: Issue #<number> <title>

## 自動検証

- [ ] `npm run build`
- [ ] `npm run test:run`

## 手動確認

- [ ] [画面や操作の確認]

## 未検証になり得る点

- [制約があれば記載]
```
