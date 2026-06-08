---
description: コード実装時の Steering 参照ルールと作業開始チェック（関連ファイル編集時に自動適用）
paths:
  - "app/**"
  - "components/**"
  - "lib/**"
  - "hooks/**"
  - "data/**"
  - "types/**"
  - "functions/**"
  - "scripts/**"
  - "e2e/**"
  - "tests/**"
  - "firestore.rules"
  - "storage.rules"
  - "firebase.json"
  - "next.config.ts"
---

# 開発ワークフロー（コード実装時）

## Steering Documents 参照ルール

非自明な作業では、実装前に関連する `docs/steering/` を確認します。

| 場面                   | 参照するドキュメント                   |
| ---------------------- | -------------------------------------- |
| 目的・スコープ確認     | `docs/steering/PRODUCT.md`             |
| 機能仕様・禁止事項     | `docs/steering/FEATURES.md`            |
| 技術制約・ADR          | `docs/steering/TECH_SPEC.md`           |
| ファイル配置・依存方向 | `docs/steering/REPOSITORY.md`          |
| 実装・テスト・Git運用  | `docs/steering/GUIDELINES.md`          |
| 命名・用語             | `docs/steering/UBIQUITOUS_LANGUAGE.md` |

機能追加・削除、データ構造変更、認証・認可・Rules・Functions変更では、実装後に `docs/steering/` の更新要否も確認します。

## 作業開始チェック

非自明な作業では、必要に応じて以下を確認します。

1. `git status --short --branch` で未コミット変更を確認する。
2. 関連する `docs/steering/` と対象ファイルを読む。
3. 影響する画面、データ、認証・認可、Firestore Rules / Storage Rules、Cloud Functions を確認する。
4. 既存テスト、手動確認手順、実行すべき検証コマンドを決める。
