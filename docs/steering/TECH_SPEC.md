# Technical Specification

**最終更新**: 2026-05-28

---

## アーキテクチャ概要

RoastPlusは、**PWA（Progressive Web App）** として設計されたモバイルファーストのコーヒー焙煎・抽出業務支援アプリです。フロントエンドはNext.js 16（App Router）で構築し、バックエンドはFirebase（BaaS）を使用。AI機能はFirebase Cloud Functions v2経由でOpenAI APIを呼び出します。

```
┌─────────────────────────────────────────────────┐
│            クライアント（PWA）                    │
│   Next.js 16 + React 19 + TypeScript 5          │
│   Tailwind CSS v4 + Framer Motion + Lottie      │
│   カスタム Service Worker（public/sw.js）        │
└──────────────────┬──────────────────────────────┘
                   │ Firebase SDK（クライアント直接）
                   ↓
┌─────────────────────────────────────────────────┐
│             Firebase（BaaS）                     │
│   - Authentication（Google, Email/Password）     │
│   - Firestore（NoSQL, リアルタイム同期）         │
│   - Storage（画像アップロード）                  │
│   - Hosting（本番デプロイ先）                    │
└──────────────────┬──────────────────────────────┘
                   │ Cloud Functions v2（サーバーレス）
                   ↓
┌─────────────────────────────────────────────────┐
│             AI Services                          │
│   OpenAI API（Cloud Functions経由のみ）        │
│   - ocrScheduleFromImage（Vision OCR）          │
│   - analyzeTastingSession（テキスト分析）        │
│                                                  │
│   ※ クライアントから直接呼び出さない             │
│   ※ OPENAI_API_KEY は Secret Manager で管理     │
└─────────────────────────────────────────────────┘
```

**重要な設計原則**:
- Next.js API Routesは使用しない（`output: 'export'` による静的エクスポート）
- AI処理はすべてCloud Functions経由（クライアントサイドにAPIキーを持たない）
- 状態管理はReact useState のみ（Zustand/Reduxは不使用）

---

## フロントエンド

### Next.js 16（App Router）
- **バージョン**: `package.json` の指定と `package-lock.json` の解決済みバージョンを正とする
- **ルーティング**: App Router（`app/` ディレクトリ）
- **ビルド**: 静的エクスポート（`output: 'export'`）
- **設定**: `trailingSlash: true`, `images.unoptimized: true`
- **レンダリング**: Client Components中心（`'use client'`）。静的エクスポートのためSSR/RSCは限定的

### React 19
- **バージョン**: `package.json` の `react` / `react-dom` を正とする
- **状態管理**: `useState` のみ使用（外部ライブラリ不使用）
- **機能活用**: Suspense, useTransition

### TypeScript 5
- **バージョン**: ^5
- **設定**: `strict: true`, `target: ES2017`
- **パスエイリアス**: `@/*` = `./*`（プロジェクトルート）
- **型定義方針**: `interface` 優先、ユニオン型は `type`（ADR-006参照）

---

## スタイリング

### Tailwind CSS v4
- **バージョン**: ^4
- **方針**: ユーティリティファーストCSS
- **CSS Modules**: 不使用
- **繰り返しパターン**: 定数化（例: `DIFFICULTY_STYLES`）
- **クラス結合**: `clsx`（必要な箇所で直接使用）

### テーマシステム（next-themes + CSS変数）

7テーマをCSS変数で管理。`data-theme` 属性で切り替え。

| テーマ名 | 明暗 | 説明 |
|---------|------|------|
| `default` | ライト | 標準（デフォルト） |
| `dark-roast` | ダーク | 深煎りイメージ |
| `light-roast` | ライト | 浅煎りイメージ |
| `matcha` | ダーク | 抹茶イメージ |
| `caramel` | ダーク | キャラメルイメージ |
| `christmas` | ダーク | クリスマス限定 |
| `dark` | ダーク | 汎用ダークモード（WCAG AA 14.5:1） |

- **ライブラリ**: `next-themes`（^0.4.6）
- **テーマ定義**: `@layer theme` + CSS変数（`globals.css`）
- **切替属性**: `data-theme` 属性（`<html>` 要素）
- **ストレージキー**: `roastplus_theme`（localStorage）
- **SSR対応**: フラッシュ防止、タブ間同期

#### セマンティックCSS変数トークン

| カテゴリ | トークン | 用途 |
|---------|---------|------|
| 背景 | `--page`, `--surface`, `--overlay`, `--ground`, `--field` | ページ / カード / モーダル / セクション / 入力欄 |
| テキスト | `--ink`, `--ink-sub`, `--ink-muted` | 本文 / 補足 / ヒント |
| ボーダー | `--edge`, `--edge-strong` | 通常 / 強調 |
| アクセント | `--spot`, `--spot-hover`, `--spot-subtle`, `--spot-surface` | ハイライト / ホバー / 淡い背景 / 表面 |

#### Tailwindユーティリティ

CSS変数は `@theme inline` でTailwindユーティリティとして自動登録される:
- `bg-page`, `bg-surface`, `bg-overlay`, `bg-ground`, `bg-field`
- `text-ink`, `text-ink-sub`, `text-ink-muted`
- `border-edge`, `border-edge-strong`
- `bg-spot`, `bg-spot-hover`, `bg-spot-subtle`, `bg-spot-surface`

CSS変数の使い分け（`bg-surface` vs `bg-overlay` 等）は `docs/steering/FEATURES.md`「テーマシステム」セクション参照。

### Framer Motion
- **バージョン**: `package.json` の `framer-motion` を正とする
- **用途**: ページトランジション、コンポーネントアニメーション、ジェスチャー
- **テーマ連動**: 7テーマのアンビエントアニメーション（湯気/炎/粒子/葉/光波/雪/星）+ `useReducedMotion` 対応

### Lottie
- **ライブラリ**: `lottie-react`（^2.4.1）
- **用途**: 複雑なアニメーション（JSON形式）
- **配置**: `public/animations/`

---

## バックエンド・データベース

### Firebase

**バージョン**: `package.json` の `firebase` を正とする

#### Authentication
- **認証方法**: Google, Email/Password
- **ユーザー管理**: Firebase Auth
- **セッション**: Firebase Auth トークン（クライアント管理）

#### Firestore（NoSQL）

- **データモデル**: ドキュメント指向
- **リアルタイム同期**: `onSnapshot` リスナー
- **オフライン対応**: ローカルキャッシュ（IndexedDB）
- **トランザクション**: `runTransaction` で整合性保証

**データモデル構造**:

```
Firestore
├── users/{userId}                          # ユーザードキュメント
│   ├── (document fields)
│   │   ├── todaySchedules                  # 本日のスケジュール
│   │   ├── roastSchedules                  # 焙煎スケジュール
│   │   ├── tastingSessions                 # テイスティングセッション
│   │   ├── tastingRecords                  # テイスティング記録
│   │   └── dripRecipes                     # ドリップレシピ
│   ├── (subcollections)
│   │   ├── teams/{teamId}                  # チーム
│   │   ├── members/{memberId}              # メンバー
│   │   ├── taskLabels/{labelId}            # タスクラベル
│   │   ├── assignmentDays/{dayId}          # 担当日
│   │   ├── shuffleEvents/{eventId}         # シャッフルイベント
│   │   ├── shuffleHistory/{historyId}      # シャッフル履歴
│   │   ├── assignmentSettings/{settingId}  # 担当設定
│   │   ├── managers/{managerId}            # 管理者
│   │   ├── pairExclusions/{exclusionId}    # ペア除外設定
│   │   └── _meta/{document}                # 分割データ移行メタ情報
│
├── defectBeans/{beanId}                    # 欠点豆データ
│
└── _meta/                                  # メタデータ
```

#### Storage
- **用途**: 欠点豆画像アップロード、マスター画像参照
- **ユーザー追加画像**: `defect-beans/{userId}/{defectBeanId}/{fileName}`
- **マスター画像**: `defect-beans-master/{fileName}`（クライアントから編集不可）
- **OCR画像**: Cloud FunctionsへBase64で渡し、Storageへ保存しない

#### Hosting
- **本番**: Firebase Hosting（`firebase.json` の `hosting.public` は `out`）
- **ビルド**: productionでは `next.config.ts` の `output: 'export'` により静的エクスポート
- **開発専用Route**: `page.dev.tsx` は `next.config.ts` の `pageExtensions` で開発環境だけ有効化し、production build には含めない
- **環境**: default（本番）, development（開発）

### Cloud Functions v2

**ディレクトリ**: `functions/`
**ランタイム**: Node.js 20（`firebase.json` と `functions/package.json`）
**SDK**: `firebase-functions` / `firebase-admin` は `functions/package.json` を正とする
**実装**: Callable Functions v2（`firebase-functions/v2/https`）

| 関数名 | 用途 | AIモデル |
|--------|------|---------|
| `ocrScheduleFromImage` | ホワイトボード画像のOCR（スケジュール読み取り） | GPT-4o Vision |
| `analyzeTastingSession` | テイスティングセッションのAI分析 | gpt-4o-mini |

**重要**: AI処理はすべてCloud Functions経由。クライアントからOpenAI APIを直接呼び出さない。`OPENAI_API_KEY` は Firebase Secret Manager で管理し、値はドキュメントやログに出さない。

---

## PWA（Progressive Web App）

### Service Worker
- **実装**: カスタム手書きService Worker（`public/sw.js`）
- **next-pwa**: 不使用（ADR-007参照）
- **キャッシュ名**: 最新値は `public/sw.js` の `CACHE_NAME` / `RUNTIME_CACHE` を参照
- **キャッシュ戦略**: Network First

### オフライン対応
- Firestoreローカルキャッシュ（IndexedDB）
- Service Workerによる静的ファイルキャッシュ

### マニフェスト
- **ファイル**: `public/site.webmanifest`
- **アイコン**: 各サイズのPNG（36x36 ~ 192x192）
- **iOS対応**: `apple-touch-icon.png`

---

## AI機能

### 実装方式

AI機能はFirebase Cloud Functions v2経由でOpenAI APIを呼び出す。

- **モデル**: OCRは `gpt-4o`、テイスティング分析は `gpt-4o-mini`
- **APIキー管理**: Firebase Secret Manager（`OPENAI_API_KEY`）
- **クライアント側**: Cloud Functionsの `httpsCallable` で呼び出し
- **パッケージ**: `functions/package.json` の `openai` を正とする（Cloud Functions内のみ）

### OCR（スケジュール画像解析）

- **関数**: `ocrScheduleFromImage`
- **入力**: ホワイトボード写真（Base64）
- **処理**: GPT-4o Visionで画像解析 → 構造化データ抽出
- **出力**: スケジュールデータ（時間、担当者、作業内容）

### テイスティング分析

- **関数**: `analyzeTastingSession`
- **入力**: テイスティングセッションの評価データ
- **処理**: gpt-4o-miniでフレーバー分析 → テキスト生成
- **出力**: 分析結果テキスト（フレーバーノート、改善提案）
- **トリガー**: セッション保存時に自動実行（ADR-005参照）

---

## テスト

### ユニットテスト・コンポーネントテスト（Vitest）

- **バージョン**: `package.json` の `vitest` を正とする
- **環境**: jsdom（ブラウザ環境シミュレーション）
- **カバレッジ**: `@vitest/coverage-v8`（text, html形式。バージョンは `package.json` を正とする）
- **設定**: `vitest.config.ts`（パスエイリアス `@/`）
- **UIテスト**: `@testing-library/react`, `@testing-library/jest-dom`（バージョンは `package.json` を正とする）
- **Reactプラグイン**: `@vitejs/plugin-react` は `package.json` を正とする

### テストファイル構成

| カテゴリ | 内容 |
|---------|------|
| `lib/` テスト | ビジネスロジックのユニットテスト |
| `hooks/` テスト | カスタムフックのテスト |
| `components/` テスト | UIコンポーネントテスト |
| `app/` テスト | ページ・機能単位のテスト |
| `functions/src/` テスト | Cloud Functionsの補助ロジック・制限処理のテスト |
| `tests/rules/` テスト | Firestore Security Rulesテスト |

### カバレッジ目標・実績

固定値は古くなりやすいため、最新のテスト数・カバレッジは以下で確認する。

```bash
npm run test:run
npm run test:coverage
```

### E2Eテスト（Playwright）

- **バージョン**: `package.json` の `@playwright/test` を正とする
- **ブラウザ**: Chromium
- **設定**: `playwright.config.ts`
- **ローカル起動**: 既定では `localhost:3100` を使う。`scripts/run-e2e.ts` が既存E2Eサーバーを再利用し、なければ起動する。

| カテゴリ | ディレクトリ | 内容 |
|---------|------------|------|
| ページ統合 | `e2e/pages/` | home, schedule, tasting |
| ユーザーフロー | `e2e/flows/` | data-management-flow |
| レスポンシブ | `e2e/responsive/` | 各ビューポートでの表示確認 |
| アクセシビリティ | `e2e/accessibility/` | axe-coreによる自動検査 |
| パフォーマンス | `e2e/performance/` | ページロード速度等 |
| フィクスチャ | `e2e/fixtures/` | mockFirebase, テストデータ |

---

## CI/CD

### 現在の構成

#### Husky + lint-staged
- **Husky**: ^9.1.7（Git pre-commit hook）
- **lint-staged**: コミット前にESLintを自動実行
- **対象**: `*.ts`, `*.tsx`, `*.js`, `*.jsx`
- **シークレット検出**: pre-commitで `npm run secrets:scan:staged` を実行。Gitleaks CLIが必要

#### ESLint
- **バージョン**: `package.json` の `eslint` を正とする
- **設定**: `eslint-config-next`（core-web-vitals + typescript）
- **ポリシー**: Lintエラー・warningは常にゼロを維持
- **カスタムルール**: `eslint-rules/` ディレクトリに独自ルールを実装
  - `no-raw-button`: 生の `<button>` 要素の使用を検出（`Button` / `IconButton` を使用すべき）
  - `no-raw-checkbox`: 生の `<input type="checkbox">` の使用を検出（`Checkbox` を使用すべき）
  - `no-raw-select`: 生の `<select>` 要素の使用を検出（`Select` を使用すべき）

#### Knip
- **バージョン**: `package.json` を正とする
- **用途**: デッドコード・未使用依存関係の検出

### デプロイ

| デプロイ先 | コマンド | 備考 |
|-----------|---------|------|
| Firebase Hosting | `npm run build && firebase deploy --only hosting` | 手動デプロイ時。通常はworkflow経由 |
| Cloud Functions | `cd functions && npm run build` → `firebase deploy --only functions` | 本番影響があるため明示確認後のみ |
| Firestore Rules | `npm run test:rules` → `firebase deploy --only firestore:rules` | workflowではrules変更時だけテスト後にdeploy |

### GitHub Actions（実装済）

| ワークフロー | トリガー | 内容 |
|------------|---------|------|
| `ci.yml` | main向けPR | secrets-scan、typecheck、lint、format、unit tests、rules tests、E2E、build |
| `firebase-hosting-merge.yml` | main向けPRのmerge / 手動実行 | 変更ファイルからHosting、Functions、Firestore Rulesのdeploy対象を判定。Firestore Rulesはテスト後にdeploy |

---

## 運用監視・バックアップ・復元

RoastPlusは小規模運用のため、Sentry等の外部エラー監視サービスは導入していない。障害時はFirebase / Google Cloudの標準ログ、GitHub Actions、Firebase Consoleを一次情報として確認する。

### 環境と扱う情報

| 区分 | 正とする場所 | 扱う情報 |
|------|--------------|----------|
| 本番Firebaseプロジェクト | `.firebaserc` の `default`（現在は `roastplus-72fa6`） | Authentication、Firestore、Storage、Cloud Functions、Hosting |
| ローカル開発 | `.env.local` と Firebase Emulator | `NEXT_PUBLIC_*` は公開情報。秘密情報は置かない |
| GitHub Actions | `.github/workflows/ci.yml`, `.github/workflows/firebase-hosting-merge.yml` | CI結果、merge後のHosting / Rules / Functions deploy判定 |
| Cloud Functions Secret | Firebase Secret Manager | `OPENAI_API_KEY` 等。値をログ・PR・Issueに書かない |

開発環境と本番環境で確認する情報を混ぜない。Firebase Console / Google Cloud Console / CLIを使う前に、対象プロジェクトを確認する。

```powershell
firebase use
firebase projects:list
```

### 障害時に最初に見る場所

| 症状 | 最初に見る場所 | 確認内容 |
|------|----------------|----------|
| アプリが開かない / 404 / 古い画面が出る | Firebase Hosting Console、GitHub Actions | 最新PRのmerge後deploy、Hosting release履歴、`out/` 配信設定 |
| ログインできない | Firebase Authentication Console | 対象ユーザーの有効状態、プロバイダ設定、最近の設定変更 |
| データが表示されない / 保存できない | Firestore Console、Firestore Rulesテスト、ブラウザConsole | 対象ユーザーの `users/{uid}` データ、権限エラー、Rules変更履歴 |
| 画像が表示されない / アップロードできない | Firebase Storage Console、Storage Rules | バケット、パス、Rules、ファイル有無 |
| OCR / AI分析が失敗する | Cloud Functions Logs、Secret Manager | `ocrScheduleFromImage` / `analyzeTastingSession` のエラー、Secret設定、OpenAI側の失敗 |
| merge後に本番反映されない | GitHub Actions、Firebase Hosting release履歴 | CI失敗、deploy対象判定、Hosting release作成有無 |

### Firebase運用確認コマンド

これらは確認用コマンドであり、データや本番設定を変更しない。

```powershell
# 対象プロジェクト確認
firebase use

# Hostingのサイト / チャネル / リリース確認
firebase hosting:sites:list
firebase hosting:channel:list
firebase hosting:releases:list

# Cloud Functionsの一覧とログ確認
firebase functions:list
firebase functions:log
firebase functions:log --only ocrScheduleFromImage
firebase functions:log --only analyzeTastingSession

# 使えるCLIオプション確認
firebase help hosting:releases:list
firebase help functions:log
```

Cloud Functionsのログは Firebase CLI、Google Cloud Console、Cloud Logging UI のいずれでも確認できる。外部監視を入れていない間は、Cloud Loggingで `ERROR` / `WARNING`、関数名、実行時刻、対象ユーザーの問い合わせ時刻を照合する。

### Firestoreバックアップ

Firestoreの管理エクスポート / インポートは、Firebase CLIではなく `gcloud` または Google Cloud Console の Import/Export を使う。エクスポート先はCloud Storage bucketで、実行にはFirestore Import/Export権限とbucketアクセス権限が必要。エクスポートはドキュメント読み取り課金が発生するため、頻度と対象範囲を決めてから実行する。

```powershell
# 例: 全ドキュメントをCloud Storageへエクスポート
gcloud firestore export gs://<backup-bucket>/<yyyy-mm-dd>/<export-name> --database="(default)"

# 例: 特定collection groupだけをエクスポート
gcloud firestore export gs://<backup-bucket>/<yyyy-mm-dd>/<export-name> --database="(default)" --collection-ids=users
```

RoastPlusで定期バックアップジョブは未実装。Issue #415時点では、バックアップは手動運用またはGoogle Cloud Consoleからの手動エクスポートを前提とする。バックアップbucket名、保存期間、実行担当者はコードだけでは確認できないため、運用開始時にFirebase管理者が別途決める。

### 復元方針

Firestore importは本番データに影響するため、即時に本番へimportしない。原則として以下の順で進める。

1. 障害内容を記録する: 発生時刻、影響ユーザー、影響collection、直前のPR / deploy、ユーザー操作。
2. 既存データを保全する: 可能なら復元前に現在の本番Firestoreを別prefixへexportする。
3. 検証用Firebaseプロジェクトまたは別データベースへimportし、復元対象データを確認する。
4. 復元対象を最小化する: 全体復元ではなく、可能なら対象collection / 対象ユーザー単位で復旧する。
5. 本番importが必要な場合は、影響範囲、ロールバック方針、作業時間、担当者をIssueまたは作業メモに残し、ユーザー承認後に実行する。

```powershell
# 例: exportデータをFirestoreへimport
gcloud firestore import gs://<backup-bucket>/<yyyy-mm-dd>/<export-name> --database="(default)"
```

Firestore import/exportの正式手順はFirebase公式ドキュメント「データのエクスポートとインポート」を正とする。

### Storageバックアップと復元

StorageはFirestore exportに含まれない。欠点豆画像などのユーザー追加ファイルを復旧対象にする場合は、Firestoreドキュメントの参照パスとStorageオブジェクトを両方確認する。

確認観点:

- `defect-beans/{userId}/{defectBeanId}/{fileName}` に対象ファイルがあるか
- Storage Rulesで本人以外の読み書きが許可されていないか
- マスター画像 `defect-beans-master/{fileName}` を誤って編集・削除していないか
- 画像復元時にFirestore側の参照URL / path と不整合がないか

Storageの一括コピーや削除は本番データに直結するため、実行前に対象prefix、件数、復元先、戻し方を明示する。

---

## セキュリティ

### 依存関係監査
- `npm audit`: 脆弱性検出

### Firestore Security Rules
- ユーザー認証必須
- ドキュメント所有者のみ編集可能
- 読み取りは認証済みユーザーに限定

### 環境変数

| 変数 | 用途 | 管理場所 |
|------|------|---------|
| `NEXT_PUBLIC_FIREBASE_*`（6個） | Firebase設定 | `.env.local` |
| `NEXT_PUBLIC_EMAILJS_*`（3個） | EmailJS設定 | `.env.local` |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Firebase App Check | `.env.local` / GitHub Secrets |
| `NEXT_PUBLIC_APP_VERSION` | アプリバージョン | `package.json` から自動取得 |
| `OPENAI_API_KEY` | OpenAI APIキー | Firebase Secret Manager（Cloud Functions専用） |

**重要**: `OPENAI_API_KEY` はクライアントに公開しない。Cloud Functions内でのみ使用する。

---

## パフォーマンス最適化

### コード分割
- Next.js動的インポート（`next/dynamic`）
- React.lazy（コンポーネント遅延ロード）

### 画像
- `images.unoptimized: true`（静的エクスポートのため`next/image`最適化は無効）
- 手動での画像最適化が必要

### バンドルサイズ削減
- Tree Shaking（未使用コード除去）
- Knip（デッドコード検出ツール）

### Service Worker
- Network Firstキャッシュ戦略でオフライン時の表示速度を確保

---

## 技術的な制約

### 静的エクスポートの制約
- `output: 'export'` のため、Next.js API Routesは使用不可
- サーバーサイドの処理はすべてFirebase Cloud Functionsで実装
- `next/image` の自動最適化は無効（`images.unoptimized: true`）

### Firestoreの制約
- **書き込み制限**: 1ドキュメントあたり1秒間に1回
- **クエリ制限**: 複合クエリはインデックス必要
- **トランザクション制限**: 500ドキュメントまで
- **ドキュメントサイズ**: 1MB上限

### PWAの制約
- **iOSの制約**: Service Workerの一部機能が制限（Push通知等）
- **ストレージ制限**: IndexedDBは50MB程度（デバイス依存）

### AI機能の制約
- Cloud Functions経由のため、レスポンスにレイテンシがある
- OpenAI APIの利用料金が発生

---

## ADR（Architecture Decision Records）

技術選定の意思決定記録。各ADRは「背景 → 選択肢 → 決定 → 理由」の形式で記録。

### ADR-001: Next.js + Firebase PWA構成

- **決定**: Next.js（App Router）+ Firebase（BaaS）でPWAを構築
- **理由**:
  - PWA対応でモバイルアプリ不要
  - Firestoreのリアルタイム同期で複数端末対応
  - オフラインサポート（IndexedDB + Service Worker）
  - サーバーレス運用でインフラ管理コストゼロ
  - 小規模チーム（8名）に最適なスケール

### ADR-002: Tailwind CSS v4 採用

- **決定**: Tailwind CSS v4をスタイリング基盤として採用
- **理由**:
  - 高速なプロトタイピング（ユーティリティファースト）
  - コンポーネントとスタイルの密結合による可読性
  - v4の`@theme inline`によるCSS変数のネイティブ統合
  - CSS Modulesより保守性が高い

### ADR-003: Vitest 採用（Jest → Vitest）

- **決定**: JestからVitestに移行
- **理由**:
  - Vite互換の高速テスト実行
  - ESMネイティブサポート
  - Next.jsとの親和性が高い
  - Jest互換APIで移行コストが低い
  - `@vitejs/plugin-react` との統合

### ADR-004: OCR処理のOpenAI統一（Google Vision API → OpenAI）

- **決定**: OCR処理をGoogle Vision APIからOpenAI GPT-4o Visionに統一
- **理由**:
  - Google Vision APIキーの認証エラー問題を解消
  - OpenAI一本化によるコードの簡潔化（APIクライアントが1つに）
  - GPT-4o Visionの精度がホワイトボードOCRに十分
  - APIキー管理の一元化

### ADR-005: AI分析を自動実行パターンに変更

- **決定**: テイスティングAI分析を保存時に自動実行するパターンに変更
- **理由**:
  - UX改善: 分析結果がない場合にユーザーがボタンを探す手間を削減
  - セッション保存と同時に分析を開始し、結果を非同期で表示
  - 手動実行ボタンは残しつつ、基本は自動実行

### ADR-006: 型定義はinterface優先

- **決定**: TypeScript型定義は`interface`を優先的に使用
- **理由**:
  - `extends`による拡張性が高い
  - エラーメッセージが読みやすい（型名が表示される）
  - ユニオン型など`interface`で表現できないケースのみ`type`を使用

### ADR-007: カスタムService Worker採用（next-pwaを使わない）

- **決定**: `next-pwa`パッケージを使わず、カスタム手書きのService Worker（`public/sw.js`）を採用
- **理由**:
  - 静的エクスポート（`output: 'export'`）との互換性
  - キャッシュ戦略の完全な制御（Network First）
  - `next-pwa`の依存関係・メンテナンスリスクを回避
  - シンプルな要件に対して軽量。現在のキャッシュ名は `public/sw.js` を参照

### ADR-008: ロゴを画像からテキストベースに変更

- **決定**: アプリロゴを画像ファイルからテキストベース（CSS）に変更
- **理由**:
  - テーマ切替時にロゴ色を動的に変更可能
  - 画像ファイルの管理が不要
  - レスポンシブ対応が容易

### ADR-009: （予約）

### ADR-010: 機能別モジュール分割パターン

- **決定**: lib/, hooks/, components/ を機能単位でサブディレクトリに分割
- **理由**:
  - 機能の凝集度を高め、変更影響範囲を限定
  - 例: `lib/drip-guide/`, `hooks/drip-guide/`
  - 依存方向: `types/` → `lib/` → `hooks/` → `components/` → `app/`（循環依存禁止）

### ADR-011: next-themes + Tailwind v4 CSS変数によるテーマシステム

- **決定**: `next-themes` + Tailwind CSS v4のCSS変数でマルチテーマシステムを構築
- **背景**: クリスマスモードの追加を契機に、2テーマから6テーマに拡張。その後、目の疲れ防止の要望を受け汎用ダークモード（`dark`）を追加して7テーマへ
- **理由**:
  - `data-theme`属性 + CSS変数で、コンポーネント側のテーマ判定が不要
  - Tailwind v4の`@theme inline`でCSS変数をユーティリティとして直接使用可能
  - `next-themes`でSSRフラッシュ防止、タブ間同期、localStorage永続化を実現
  - セマンティックトークン（`--page`, `--ink`, `--edge`等）で意味的な色指定

---

## 新しいADRの追加プロセス

新しい技術選定が必要な場合:

1. **調査**: 複数の選択肢を比較検討
2. **ADR作成**: 本ファイルに `ADR-XXX` として追記
3. **検証**: PoC（Proof of Concept）で実現性を確認
4. **承認**: ユーザーの承認を得る
5. **実装**: プロダクションに適用
