# Firebase Functions

## 環境変数の設定

Firebase Functions v2 では、OpenAI APIキーは Secret Manager で管理します。

```powershell
# Firebaseプロジェクトを確認
firebase use default

# OpenAI APIキーを設定
firebase functions:secrets:set OPENAI_API_KEY
```

## ローカル開発時の環境変数

ローカルでOCRを試す場合は、Functionsエミュレータを起動し、フロントエンドをエミュレータへ向けます。

### 1. Functions用のシークレット

`functions/.secret.local` を作成し、OpenAI APIキーを設定してください。

```env
# functions/.secret.local
OPENAI_API_KEY=your_openai_api_key
```

補足: `ocrScheduleFromImage` は `secrets: ['OPENAI_API_KEY']` を使っているため、ローカルエミュレータでは `.secret.local` で値を上書きします。

### 2. フロントエンド用の環境変数

`.env.development.local` に以下を追加してください。

```env
NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR=true
NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST=127.0.0.1
NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT=5001
```

### 3. 起動方法

PowerShellを2つ開いて、順番に起動してください。

```powershell
# PowerShell 1: Functionsエミュレータ
cd functions
npm run serve
```

```powershell
# PowerShell 2: Next.js開発サーバー
npm run dev
```

注意: OCRはログイン状態が必要です。画面でログインしてから画像を読み取ってください。

## デプロイ

```powershell
# Functionsをビルド
cd functions
npm install
npm run build

# デプロイ
firebase deploy --only functions
```

