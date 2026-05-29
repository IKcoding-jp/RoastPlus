# RoastPlus Project Guide

このファイルは、AIエージェントが RoastPlus リポジトリで作業するときのプロジェクト固有ルールです。
グローバルな作業方針より、ここに書かれた RoastPlus 固有の制約を優先してください。

## 最重要方針

RoastPlus は、ドリップパックコーヒー製造業務を支援する現場向けPWAです。
8名程度のチームで日常利用される前提のため、機能追加の速さよりも、壊れにくさ、分かりやすさ、保守しやすさ、データ保護を優先します。

このプロジェクトでは、AIエージェントを単なるコード生成ツールではなく、学習補助者兼レビュー担当として使います。
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

## タスク完了時の必須報告

作業が完了したら、必ず最後に以下の形式で日本語報告してください。
コードをすべて読む前提にせず、非エンジニアでも変更内容と危険度を判断できる粒度にします。

### 1. 変更概要

- 何を変更したか
- なぜ変更したか
- 影響する画面・機能

### 2. 変更ファイル

- 変更したファイル一覧
- 各ファイルの役割を非エンジニア向けに一言で説明

### 3. 危険度チェック

以下に関わる変更があるかを必ず明示してください。
それぞれについて、危険度を「低・中・高」で分類します。
危険度が中以上の場合は、なぜ危険か、どう確認したかを説明してください。

- データ保存
- データ更新
- データ削除
- 上書き処理
- 認証
- 権限
- Firestore Rules / Storage Rules
- 集計ロジック
- CSV出力
- 本番デプロイ設定

### 4. テスト結果

- 実行した確認コマンド
- 成功したか失敗したか
- 失敗した場合、残っている問題

### 5. ユーザーが見るべきポイント

コードを全部読む前提にせず、初心者が確認すべきポイントを3つ以内で示してください。
特に読むべきファイルや関数があれば1〜3個だけ挙げてください。

### 6. 次にやるべきこと

今回の作業で残った課題、別Issueにしたほうがよいこと、注意点を短く示してください。

## Issue単位の作業ルール

- 原則として `1 Issue = 1 PR = 1 Codexスレッド` で進める。
- Issue作業では、Issue本文に加えて `docs/steering/*` を優先して確認する。
- 大きめの機能追加、業務フロー変更、データ構造変更、認証・認可・Firestore Rules・Storage Rules・Cloud Functions に関わる変更では、実装前に `docs/superpowers/specs/` に仕様、`docs/superpowers/plans/` に実装計画を残す。
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
- `docs/superpowers/specs/`: 実装前に合意した仕様・設計
- `docs/superpowers/plans/`: 仕様に基づく実装計画
- `e2e/`: Playwright E2Eテスト
- `scripts/`: 自動化スクリプト

## 参照すべきドキュメント

作業内容に応じて、必要なものだけ読む。

- `README.md`: プロジェクト概要
- `AGENTS.md`: Codex作業ルール（本ファイル）
- `DESIGN.md`: UIデザイン方針
- `docs/steering/PRODUCT.md`: プロダクトの目的とスコープ
- `docs/steering/FEATURES.md`: 機能仕様、UI実装ルール、禁止事項
- `docs/steering/TECH_SPEC.md`: 技術選定、制約、ADR
- `docs/steering/REPOSITORY.md`: ファイル配置、命名、依存方向
- `docs/steering/GUIDELINES.md`: 実装規約、テスト、Git運用
- `docs/steering/UBIQUITOUS_LANGUAGE.md`: ドメイン用語、命名

## Skill活用方針

RoastPlus作業では、依頼内容から必要なskillだけを選び、関係ないskillを同時に使いすぎない。
迷う場合は、まず問題定義・スコープ整理を優先し、実装前に作るものを小さく区切る。

### グローバルskillの使い分け

- 要件定義: `problem-definition` → `working-backwards` → `writing-prds` の順で使う。
- UX具体化: 画面フロー、状態、操作仕様が必要なら `ux-specification` を使う。
- 技術設計: 実装方針、データ構造、テスト方針が必要なら `writing-specs-designs` を使う。
- UI実装: UIを作る時は `frontend-design` と `design-systems` を優先し、既存の `DESIGN.md` と `components/ui` に合わせる。
- UIレビュー: 見た目、コントラスト、アクセシビリティ、操作性の確認には `running-design-reviews`、`web-design-guidelines`、`usability-testing` を使う。
- ユーザー理解: 聞き取りは `conducting-user-interviews`、アンケートは `designing-surveys`、集まった声の整理は `analyzing-user-feedback` を使う。
- 初回利用: 利用者が迷わない導入や新機能説明には `user-onboarding` を使う。
- 計画と判断: 優先順位は `prioritizing-roadmap`、技術順序は `technical-roadmaps`、日程は `managing-timelines`、範囲調整は `scoping-cutting`、案比較は `evaluating-trade-offs` を使う。
- 開発運用: AI開発の進め方は `vibe-coding`、仕事後・休日開発の進め方は `personal-productivity`、技術負債は `managing-tech-debt`、振り返りは `post-mortems-retrospectives` を使う。
- 技術採用: 新しい技術やライブラリの採用判断は `evaluating-new-technology` を使う。
- AI機能: LLM、RAG、AI相談などを設計する時は `building-with-llms` を使う。
- 文章化: Issue、PR、報告文、ChatGPTへの依頼文は `written-communication` を使う。
- skill管理: 新しいskillが必要か迷う時は `find-skills` を使う。

### RoastPlus専用skillの使い分け

- `building-team-culture`: 8人規模の現場チーム運用、属人化防止、ルール定着。
- `dogfooding`: RoastPlusを現場で使いながら改善する運用設計。
- `having-difficult-conversations`: 注意、衝突、言いにくい改善提案、配慮が必要な話し合い。
- `managing-up`: 管理者や本社へ相談、報告、承認依頼をする時。
- `onboarding-new-hires`: 新メンバーへの引き継ぎ、教育、業務マニュアル運用。
- `running-effective-1-1s`: 管理者や本社の人との1対1面談、相談内容の整理。
- `running-effective-meetings`: 会議や打ち合わせを自分が進行する時。
- `stakeholder-alignment`: 現場、管理者、本社の認識合わせや合意形成。
- `team-rituals`: 定例、振り返り、日々の確認、マニュアル更新習慣。

### 今後使わない方針

- RoastPlus専用の `issue-creator`、`fix-issue`、`create-spec` は削除済み。Issue作成や修正は通常のCodex作業、AGENTS.md、必要なSuperpowers系skillで進める。
- 汎用デザインDB型の `ui-ux-pro-max` は削除済み。RoastPlusのUIは `DESIGN.md`、`components/ui`、`frontend-design`、`design-systems`、`web-design-guidelines` を優先する。

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
npm run test:rules
npm run test:coverage
npm run test:e2e
npm run secrets:scan
```

### SDD の運用方針

大きめの機能追加、業務フロー変更、データ構造変更、認証・認可・Firestore Rules・Storage Rules・Cloud Functions に関わる変更では、実装前に Spec-Driven Development を行う。

RoastPlus における SDD は、GitHub Spec Kit 型の Spec-Driven Development と、Gojko Adzic の Specification by Example を参照点とする。

実装前に、以下を仕様として短く整理する。

- 目的
- 背景となる問題
- 対象ユーザー
- 現在の挙動
- 期待する挙動
- 受け入れ条件
- 具体例
- 影響する画面
- 影響するデータ
- 認証・認可・Firestore Rules・Storage Rules への影響
- Cloud Functions への影響
- やらないこと
- 未決事項
- 検証方法

未決事項が仕様、データ、安全性、本番環境、費用に影響する場合は、実装に進まない。ユーザーが仕様を確認し、「この仕様で実装してよい」と明示した後に、実装計画へ進む。

TDD が必要な変更では、受け入れ条件をテストに対応づけてから実装する。

### TDD の運用方針

ロジック変更、バグ修正、Firestore Rules、Cloud Functions、データ変換・集計処理では、原則として Kent Beck の Test-Driven Development に準拠し、Red / Green / Refactor の順で進める。

- Red: まず失敗するテストで、期待する振る舞いを表現する。
- Green: 最小限の実装で、そのテストを通す。
- Refactor: テストが通った状態を保ちながら、命名、重複、責務分担を整える。
- テストを後付けの確認作業だけにしない。
- 実装詳細を過度に固定するテストや、意味の薄いカバレッジ稼ぎは避ける。
- UIだけの微修正、文言修正、設定変更などTDDが不自然な場合は、理由を明示し、代わりの検証方法を示す。

特に `lib/`, `hooks/`, `functions/`, `tests/rules/` に関わる変更では、既存テストを確認し、必要に応じて先にテストを追加・更新する。

補足:

- npm run dev と npm run build は scripts/generate-sound-list.ts を自動実行する。
- UI/E2E変更では必要に応じて npm run test:e2e を実行する。
- functions/ を変更した場合は、Functions側の build/test も確認する。
- Lint は Husky pre-commit でも実行されるが、必要に応じて npm run lint を手動実行する。
- 秘密情報の混入確認には Gitleaks を使い、手動確認では npm run secrets:scan を実行する。
- pre-commit では Husky 経由で npm run secrets:scan:staged が実行される。
- ロジック変更では、既存テストを優先して更新・追加する。
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

完了報告は、基本的に「タスク完了時の必須報告」の形式を使う。
そのうえで、必要に応じて以下も簡潔に含める。

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
