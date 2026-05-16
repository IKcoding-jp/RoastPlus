# Codex Project Guide for RoastPlus

このファイルは、Codex が RoastPlus リポジトリで作業するときのプロジェクト固有ルールです。
グローバルな作業方針より、ここに書かれたリポジトリ固有の制約を優先してください。

## 基本方針

- 回答、作業説明、完了報告は原則として日本語で行う。
- ユーザーはプログラミング学習中のため、専門用語は初出時に短く補足する。
- まず結論を短く述べ、その後に理由、変更点、確認方法を説明する。
- 非自明な作業では、いきなり編集せず関連ファイルを調査してから短い作業計画を示す。
- 変更は小さく、元に戻しやすい差分にする。
- ユーザーから明示依頼がない限り、コミット、push、PR作成はしない。

## プロジェクト概要

RoastPlus は、コーヒー焙煎・抽出業務を支援する現場向けPWAです。
8名程度のチームで日常利用される前提のため、機能追加よりも操作の分かりやすさ、壊れにくさ、現場で迷わないUIを重視します。

主な技術スタック:

- Next.js 16 App Router
- React 19
- TypeScript 5 strict
- Tailwind CSS v4
- Framer Motion
- Firebase Authentication / Firestore / Storage / Cloud Functions
- OpenAI API は Cloud Functions 経由で使用

## 重要なアーキテクチャ制約

- 本番ビルドは静的エクスポートです。`next.config.ts` の production では `output: 'export'` が有効になります。
- Next.js API Routes は使用しない。サーバー処理が必要な場合は Firebase Cloud Functions を使う。
- AI処理は必ず Cloud Functions 経由にする。クライアントに API キーや秘密情報を持たせない。
- Firebase の `NEXT_PUBLIC_*` 値は公開情報として扱い、保護は Firestore Security Rules 側で行う。
- Service Worker は `public/sw.js` の手書き実装です。`next-pwa` は使わない。
- 状態管理は React の state と hooks を基本とする。Zustand / Redux は導入しない。
- モジュール依存方向は `types/ -> lib/ -> hooks/ -> components/ -> app/` を守る。循環依存を作らない。

## 主要ディレクトリ

- `app/`: Next.js App Router のページとルート単位の実装
- `components/`: UIコンポーネント。共通UIは `components/ui/`
- `hooks/`: Reactカスタムフック
- `lib/`: ビジネスロジック、Firebase操作、ユーティリティ
- `types/`: TypeScript型定義
- `functions/`: Firebase Cloud Functions
- `docs/steering/`: 永続的な設計・仕様ドキュメント
- `docs/working/`: Issue単位の作業仕様書
- `e2e/`: Playwright E2Eテスト
- `scripts/`: 自動化スクリプト

## 参照すべきドキュメント

作業内容に応じて、必要なものだけ読む。

- `README.md`: プロジェクト概要
- `CLAUDE.md`: 既存のClaude Code向け運用ルール。Codexでも参考にする
- `DESIGN.md`: UIデザイン方針
- `docs/steering/PRODUCT.md`: プロダクトの目的とスコープ
- `docs/steering/FEATURES.md`: 機能仕様、UI実装ルール、禁止事項
- `docs/steering/TECH_SPEC.md`: 技術選定、制約、ADR
- `docs/steering/REPOSITORY.md`: ファイル配置、命名、依存方向
- `docs/steering/GUIDELINES.md`: 実装規約、テスト、Git運用
- `docs/steering/UBIQUITOUS_LANGUAGE.md`: ドメイン用語、命名

## UI実装ルール

- UI作成・編集時は、まず `components/ui` の共通コンポーネントを確認する。
- ボタン、カード、入力、セレクト、チェックボックス、モーダルなどを生のTailwindだけで新規実装しない。
- 主な共通UI:
  - `Button`, `IconButton`
  - `Input`, `NumberInput`, `InlineInput`, `Textarea`, `Select`, `Checkbox`, `Switch`
  - `Card`, `Modal`, `Dialog`
  - `Badge`, `Tabs`, `Accordion`, `ProgressBar`, `EmptyState`
- モーダル背景は `bg-overlay` を使う。`bg-surface` はダークテーマで半透明になるため避ける。
- テーマ対応は CSS変数と `data-theme` に任せる。コンポーネント側でテーマ名を直接判定しない。
- 色、余白、レイアウトを変える場合は `DESIGN.md` と `docs/steering/FEATURES.md` の共通UIセクションを確認する。
- UIデザイン作業では、実装前に色、サイズ、余白、レイアウト構造を短く説明し、必要ならユーザー確認を取る。

## 実装ルール

- TypeScript の `strict: true` を維持する。
- 型定義は `interface` を優先し、ユニオン型など `type` が自然な場合だけ `type` を使う。
- インポート順は、外部ライブラリ、ローカル、型インポート、定数の順を意識する。
- 既存の命名、ディレクトリ構成、コンポーネント設計に合わせる。
- 大きな設計変更や新しい依存関係の追加は、事前に理由を説明する。
- タスク目的から外れたついで修正や大規模リファクタリングは行わない。
- `.env`、秘密鍵、APIキー、トークン、認証情報を表示、コピー、コミットしない。

## テストと検証

使う主なコマンド:

```powershell
npm run dev
npm run build
npm run lint
npm run test
npm run test:run
npm run test:coverage
npm run test:e2e
```

実装完了時の基本検証:

```powershell
npm run build
npm run test:run
```

補足:

- `npm run dev` と `npm run build` は `scripts/generate-sound-list.ts` を自動実行する。
- Lint は Husky pre-commit でも実行されるが、必要に応じて `npm run lint` を手動実行する。
- ロジック変更では、既存テストを優先して更新・追加する。
- `lib/`, `hooks/`, `components/` のロジック変更はTDDを基本とする。
- 検証できない場合は、未検証の理由とユーザーが実行すべきコマンドを報告する。

## Git運用

- ベースブランチは `main`。
- `main` へ直接コミットしない。
- ブランチ名は既存方針に合わせ、例として `feat/#123-xxx`, `fix/#123-xxx`, `docs/xxx` を使う。
- コミットメッセージはコンベンショナルコミット形式を基本に、日本語で内容が分かる文にする。
- 作業前に必要に応じて `git status --short --branch` を確認する。
- 未コミット変更がある場合、それが自分の変更かユーザーの変更かを区別する。
- 自分が作っていない変更を勝手に戻さない。
- `git reset --hard`, `git clean`, `git push --force`, 履歴書き換えは、明示的な許可なしに実行しない。

## Firebase / Cloud Functions

- Cloud Functions は `functions/` 配下にある。
- フロントエンドからAI機能を呼ぶ場合は `httpsCallable` を使う。
- Cloud Functions のシークレットは Firebase Secret Manager で管理する。
- Firestore Security Rules や Storage Rules を変更する場合は、認証・ユーザースコープ・本番影響を慎重に確認する。
- デプロイ系コマンドは本番環境に影響するため、ユーザーの明示依頼なしに実行しない。

## 作業後の報告

完了報告には、必要に応じて以下を簡潔に含める。

- 変更したファイル
- 変更内容の要約
- 実行した検証
- 未検証の点
- 次にユーザーが確認すべきこと

報告は長くしすぎず、ユーザーが次の判断をしやすい形にする。
