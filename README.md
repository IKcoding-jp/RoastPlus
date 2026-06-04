# RoastPlus

**ドリップパックコーヒー製造現場向け PWA**

> iPad で現場に置いて使う業務支援ツール

<p>
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Firebase-Firestore%20%7C%20Auth-FFCA28?logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/PWA-Supported-5A0FC8?logo=pwa" alt="PWA" />
</p>

---

## このアプリの立ち位置

RoastPlus は、ドリップパックコーヒーの製造現場で、**実際に使われること**を前提に作った社内ツールです。  
少人数でも迷わず使えることを目指して、使う機能を絞って運用性を上げています。

目的は**属人化の解消**です。障碍のあるスタッフが働く現場のため、担当者が変わっても誰でも:

- 迷わず見える
- 誤操作しにくい
- 作業区切りがその場で分かる

を実現できることを優先しています。

---

## 現在のコア機能

### 時計（メイン）

現場中央の大画面 iPad での利用を想定した表示。  
大きな時間表示の上で、**作業・休憩・掃除の区切り**がひと目で分かるようにしています。

- 現在時間帯の表示（作業中 / 休憩中 / 掃除）
- 次の区切り時刻と残り時間
- 区切り時刻での中央アラート表示（5 秒自動消去）
- Web Audio によるチャイム再生（必要時のみ有効化）
- 作業/休憩/掃除の開始時刻を設定画面から編集

### 既存機能（運用で必要に応じて使う）

- 担当表
- スケジュール
- 試飲感想の記録
- 欠点豆図鑑
- 生産記録
- ドリップガイド

### 運用方針

新機能より、今ある機能を使いやすくすることを優先する。

---

## 事前準備

### 必要環境

- Node.js 24.x 推奨（フロントエンドCIと同じバージョン）
- npm（`package-lock.json` に従って `npm install` / `npm ci` を実行）
- Firebase プロジェクト（Authentication / Firestore / Storage / Cloud Functions / Hosting）

補足: Cloud Functions の実行ランタイムは Node.js 20 です。Functions 側の詳細は `functions/package.json` と `functions/README.md` を参照してください。

### セットアップ

```bash
git clone https://github.com/IKcoding-jp/Roast-Plus.git
cd Roast-Plus
npm install
cp .env.example .env.local
# .env.local を編集して Firebase 設定を入れる
npm run dev
```

ローカルは既定で `http://localhost:3000` を開きます。  
iPad 実機確認がある場合は同一ネットワークからアクセスしてください。

### よく使うコマンド

```bash
npm run dev        # 開発サーバ起動
npm run typecheck  # TypeScript型チェック
npm run lint       # ESLint
npm run test:run   # Vitestを1回実行
npm run test:rules # Firestore Rulesテスト
npm run build      # 本番ビルド（productionではstatic exportでout/を生成）
npm run test:e2e   # Playwright E2E
```

---

## 技術スタック

| カテゴリ | 技術 |
| --- | --- |
| フレームワーク | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, Framer Motion |
| 言語 | TypeScript 5 |
| 認証・DB | Firebase Authentication, Firestore |
| ストレージ | Firebase Storage |
| AI | OpenAI API（Cloud Functions経由。クライアントから直接呼び出さない） |
| 問い合わせ | EmailJS（お問い合わせフォーム） |
| テスト | Vitest, Playwright |
| PWA | Service Worker, Web App Manifest |

---

## ビルドと配信

本番URL: https://roastplus-72fa6.web.app

本番ビルドは Next.js の static export です。`next.config.ts` では production 時のみ `output: 'export'` が有効になり、Firebase Hosting は `firebase.json` の設定どおり `out/` を配信します。

`public/` 配下は本番でそのまま配信される公開素材置き場です。秘密情報、テスト用ファイル、デバッグ用ファイルは置かないでください。

---

## 運用ドキュメント

- [バックアップ運用手順](docs/steering/BACKUP_OPERATIONS.md) — Firestore / Storage の手動バックアップ・復元手順

