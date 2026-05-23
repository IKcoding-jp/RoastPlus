# Codex Project Guide for RoastPlus

このファイルは、Codex が RoastPlus リポジトリで作業するときのプロジェクト固有ルールです。
グローバルな作業方針より、ここに書かれた RoastPlus 固有の制約を優先してください。

## 最重要方針

RoastPlus は、ドリップパックコーヒー製造業務を支援する現場向けPWAです。
8名程度のチームで日常利用される前提のため、機能追加の速さよりも、壊れにくさ、分かりやすさ、保守しやすさ、データ保護を優先します。

このプロジェクトでは、Codexを単なるコード生成ツールではなく、学習補助者兼レビュー担当として使います。
実装だけでなく、ユーザーが少しずつコードを読めるようになることも目的です。

## ユーザー前提

- ユーザーは非エンジニアで、プログラミング初心者寄りです。
- Next.js、React、TypeScript、Firebase、GitHub、Codexを学習中です。
- コードをすべて自力で書くことより、危ない変更を見抜き、安全に運用できることを重視します。
- 説明は日本語で、結論を先に短く述べてください。
- 専門用語は、初出時に短く補足してください。

## 作業前の必須確認

非自明な作業では、いきなり編集せず、まず以下を短く整理してください。

- 目的
- 前提
- 触る予定のファイル
- 影響する画面・機能
- 影響するデータ
- 認証・認可・Firestore Rules・Storage Rules への影響
- 成功条件
- 検証方法

不明点が仕様、データ、安全性、本番環境、費用に影響する場合は、推測で実装しないでください。
小さな不明点で合理的に判断できる場合は、仮定を明示して進めてください。

## 学習モード

重要な変更では、実装後に以下を簡潔に説明してください。

- 何を変えたか
- なぜその変更が必要だったか
- なぜその設計にしたか
- 初心者が理解すべきポイントを3つ以内
- 今回読むべきファイルまたは関数を1つ

特に以下に関わる変更では、初心者向けの注意点を必ず補足してください。

- 認証
- 認可
- Firestore / Storage
- Cloud Functions
- Service Worker
- 環境変数
- 外部API
- データ移行
- セキュリティルール
- 本番デプロイ

## Issue単位の作業ルール

- 原則として `1 Issue = 1 PR = 1 Codexスレッド` で進める。
- Issue作業では、Issue本文と `docs/working/*_{Issue番号}_*` を優先して確認する。
- Issue外の改善、隣接コードの整理、無関係なリファクタリング、ついでの整形やコメント変更はしない。
- 不明点が作業結果に影響する場合は、推測で実装せず、調査して選択肢とおすすめを示す。
- Issueの目的と違う問題を見つけた場合は、勝手に直さず「別Issue候補」として報告する。

## プロジェクト概要

RoastPlus は、ドリップパックコーヒー製造業務を支援する現場向けPWAです。
現場スタッフが日常的に使うため、派手さよりも、迷わないUI、入力しやすさ、データの安全性、復旧しやすさを重視します。

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
- Firebase Hosting は `out/` を配信する。
- `public/` 配下は本番配信対象の素材置き場です。test、script、private、debug 用ファイルを置かない。
- Next.js API Routes は使用しない。サーバー処理が必要な場合は Firebase Cloud Functions を使う。
- AI処理は必ず Cloud Functions 経由にする。クライアントに API キーや秘密情報を持たせない。
- Firebase の `NEXT_PUBLIC_*` 値は公開情報として扱い、保護は Firestore Security Rules / Storage Rules 側で行う。
- Service Worker は `public/sw.js` の手書き実装です。`next-pwa` は使わない。
- 状態管理は React の state と hooks を基本とする。Zustand / Redux は導入しない。
- モジュール依存方向は `types/ -> lib/ -> hooks/ -> components/ -> app/` を守る。
- 循環依存を作らない。

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
- 現場利用を優先し、見た目の凝りすぎより、読みやすさ、押しやすさ、迷わなさを重視する。

## 実装ルール

- TypeScript の `strict: true` を維持する。
- 型定義は `interface` を優先し、ユニオン型など `type` が自然な場合だけ `type` を使う。
- インポート順は、外部ライブラリ、ローカル、型インポート、定数の順を意識する。
- 既存の命名、ディレクトリ構成、コンポーネント設計に合わせる。
- 大きな設計変更や新しい依存関係の追加は、事前に理由を説明する。
- タスク目的から外れたついで修正や大規模リファクタリングは行わない。
- `.env`、秘密鍵、APIキー、トークン、認証情報を表示、コピー、コミットしない。
- OpenAI APIキー、Firebase Secret、認証情報をクライアントコード、公開ファイル、ログに出さない。
- テストを削る、skipする、期待値を弱める、TypeScript strictやrulesを緩めることでエラーを隠さない。
- 既存の型、関数、コンポーネントを再利用できる場合は、新規作成より再利用を優先する。
- 同じような処理を増やす前に、既存の `lib/`, `hooks/`, `components/` を確認する。

## セキュリティ重点ルール

RoastPlusは業務データを扱うため、以下を特に重視する。

- 認証済みユーザーだけが必要なデータへアクセスできることを確認する。
- Firestore / Storage 変更では、認証済み本人だけが自分のデータへアクセスできる owner isolation を守る。
- クライアント側の条件分岐だけでアクセス制御を完結させない。
- Firestore Security Rules / Storage Rules への影響を確認する。
- `NEXT_PUBLIC_*` は公開情報として扱う。
- APIキー、Firebase Secret、OpenAI APIキー、認証情報をクライアント、ログ、公開ファイルに出さない。
- 入力値は保存前・送信前に妥当性を確認する。
- データ削除・上書き・移行は、実装前にロールバック方針を示す。
- 本番データ、外部サービス、課金に影響する操作は、明示依頼なしに実行しない。

## Firebase / Cloud Functions

- Cloud Functions は `functions/` 配下にある。
- フロントエンドからAI機能を呼ぶ場合は `httpsCallable` を使う。
- Cloud Functions のシークレットは Firebase Secret Manager で管理する。
- Firestore / Storage 変更では、認証済み本人だけが自分のデータへアクセスできる owner isolation を守る。
- root `users/{uid}` を肥大化させない。増え続ける機能データは原則サブコレクションに分ける。
- データ構造変更や移行が絡む場合は、実装前に移行計画、互換方針、ロールバック方針を出す。
- Firestore Security Rules や Storage Rules を変更する場合は、認証・ユーザースコープ・本番影響を慎重に確認する。
- デプロイ系コマンドは本番環境に影響するため、ユーザーの明示依頼なしに実行しない。
- Functions側を変更した場合は、フロントエンド側だけでなく `functions/` 側の build/test も確認する。

## データ設計・移行ルール

- 既存データとの互換性を壊さない。
- Firestoreのコレクション構造を変える場合は、移行計画を先に出す。
- データ形式を変更する場合は、旧データの読み取り方、移行方法、失敗時の戻し方を説明する。
- 削除処理や一括更新処理では、対象範囲を明示する。
- 可能な場合は、先に読み取り専用の確認処理や dry-run を検討する。
- ユーザーが手動確認できる画面・手順を示す。

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

補足:

- npm run dev と npm run build は scripts/generate-sound-list.ts を自動実行する。
- UI/E2E変更では必要に応じて npm run test:e2e を実行する。
- functions/ を変更した場合は、Functions側の build/test も確認する。
- Lint は Husky pre-commit でも実行されるが、必要に応じて npm run lint を手動実行する。
- ロジック変更では、既存テストを優先して更新・追加する。
- lib/, hooks/, components/ のロジック変更はTDDを基本とする。
- 検証できない場合は、未検証の理由とユーザーが実行すべきコマンドを報告する。

## Git運用

- ベースブランチは main。
- main へ直接コミットしない。
- ブランチ名は既存方針に合わせ、例として feat/#123-xxx, fix/#123-xxx, docs/xxx を使う。
- コミットメッセージはコンベンショナルコミット形式を基本に、日本語で内容が分かる文にする。
- 作業前に必要に応じて git status --short --branch を確認する。
- 未コミット変更がある場合、それが自分の変更かユーザーの変更かを区別する。
- 自分が作っていない変更を勝手に戻さない。
- git reset --hard, git clean, git push --force, 履歴書き換えは、明示的な許可なしに実行しない。
- ユーザーから明示依頼がない限り、コミット、push、PR作成はしない。

## 実装前レビュー必須項目

実装前に、必要に応じて以下を確認する。

- この変更で触るデータ
- 影響する画面
- 影響する既存機能
- 影響する権限・認証・認可
- Firestore Rules / Storage Rules への影響
- Cloud Functions への影響
- Service Worker / キャッシュへの影響
- 本番ビルドへの影響
- 必要なテスト
- 手動確認手順

## 作業後の報告

完了報告には、必要に応じて以下を簡潔に含める。

- 変更したファイル
- 変更内容の要約
- 実行した検証
- 未検証の点
- 残っているリスク
- 次にユーザーが確認すべきこと
- 今回の学習ポイント
- 今回読むべきファイルまたは関数

報告は長くしすぎず、ユーザーが次の判断をしやすい形にする。
問題が残っている場合は、隠さず明記する。
