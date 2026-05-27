# Firebase Functions

RoastPlus のAI処理は Firebase Cloud Functions v2 経由で実行します。クライアントから OpenAI API を直接呼び出しません。

## 現在の構成

| 項目 | 内容 |
| --- | --- |
| ランタイム | Node.js 20（`firebase.json` / `functions/package.json`） |
| 言語 | TypeScript |
| エントリーポイント | `functions/src/index.ts` |
| 公開関数 | `ocrScheduleFromImage`, `analyzeTastingSession` |
| OpenAI SDK | `functions/package.json` の `openai` を正とする |
| Secrets | `OPENAI_API_KEY` を Firebase Secret Manager で管理 |

## シークレット

本番用の OpenAI APIキーは Firebase Secret Manager に設定します。値はドキュメント、ログ、PR本文に書かないでください。

```powershell
firebase use default
firebase functions:secrets:set OPENAI_API_KEY
```

ローカルエミュレータでAI機能を確認する場合は、`functions/.secret.local` を使います。ファイル自体は `.gitignore` 対象です。ここにも実際の値は記載しません。

## ローカル開発

フロントエンドからFunctionsエミュレータを呼ぶ場合は、フロントエンド側のローカル環境変数でエミュレータ接続を有効にします。

```env
NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR=true
NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST=127.0.0.1
NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT=5001
```

PowerShellを2つ開いて起動します。

```powershell
# PowerShell 1: Functionsエミュレータ
cd functions
npm ci
npm run serve
```

```powershell
# PowerShell 2: Next.js開発サーバー（リポジトリルート）
npm run dev
```

AI関数は認証と App Check を前提にしています。ローカル確認時も、画面でログインしてから呼び出してください。

## build / test

```powershell
# Functions単体のTypeScriptビルド
cd functions
npm run build
```

Functions配下の `*.test.ts` は、リポジトリルートのVitest対象です。

```powershell
# リポジトリルートで実行
npm run test:run
```

## デプロイ

デプロイは本番環境に影響するため、明示的な確認後に実行します。

```powershell
cd functions
npm ci
npm run build
firebase deploy --only functions
```
