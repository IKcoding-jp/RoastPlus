# バックアップ運用手順

**最終更新**: 2026-05-31

Firestore / Storage の最低限のバックアップ・復元手順をまとめる。
小規模・手動運用を前提とし、まずは「迷わず実行・復元できる」ことを優先する。

---

## 前提・運用方針

| 項目 | 内容 |
|---|---|
| 対象 | Firestore（全コレクション） + Storage（アップロード画像など） |
| 方法 | 手動マネージドエクスポート（自動ジョブは作らない） |
| 実行頻度 | **週1回**（曜日を固定して実施。例: 毎週月曜） |
| 保存先 | GCS バックアップ用バケット `gs://roastplus-72fa6-backups` |
| 担当者 | IK |
| プロジェクト | `roastplus-72fa6` |

> このドキュメントは「手順を決める」ことが目的です。
> 実際の本番 export / import や Firebase・Google Cloud の本番設定変更は、**別途ユーザー（IK）の承認のうえで実施**します。コマンドを載せていますが、内容を理解せずそのまま流さないでください。

### やらないこと（このフェーズの範囲外）

- 自動バックアップジョブ（スケジュールバックアップ）の構築
- 本番データの実 export / import の実行
- Firebase / Google Cloud の本番設定変更

---

## 事前準備（初回のみ）

### 1. gcloud CLI のインストールとログイン

```powershell
# インストール済みかの確認
gcloud --version

# Google アカウントでログイン（ブラウザが開く）
gcloud auth login

# 対象プロジェクトを選択
gcloud config set project roastplus-72fa6

# Firebase 側でも対象プロジェクトを確認
firebase use
firebase projects:list
```

### 2. バックアップ用バケットの作成

Firestore のデータと同じリージョンに作るのが安全です（リージョンが異なると export 先に指定できない場合があります）。

```powershell
# 既存バケット一覧の確認（Storage の本番バケット名もここで分かる）
gcloud storage ls

# バックアップ用バケットを作成（リージョンは Firestore に合わせる。例: 東京 asia-northeast1）
gcloud storage buckets create gs://roastplus-72fa6-backups --location=asia-northeast1
```

> Storage の本番バケット名は `roastplus-72fa6.firebasestorage.app` または `roastplus-72fa6.appspot.com` のいずれかです。上記 `gcloud storage ls` の結果で実際の名前を確認してください（以降 `<STORAGE_BUCKET>` と表記）。

### 3. 権限

実行アカウントに以下のロールが必要です（足りない場合は Google Cloud コンソールで付与）。

- `roles/datastore.importExportAdmin`（Firestore の export / import）
- バックアップ用バケットへの書き込み権限（`roles/storage.admin` など）

---

## Firestore のバックアップ手順

全コレクションを日付付きフォルダにエクスポートします。

```powershell
# 日付文字列を用意（例: 20260531）
$date = Get-Date -Format "yyyyMMdd"

# Firestore 全データを GCS へエクスポート
gcloud firestore export "gs://roastplus-72fa6-backups/firestore/$date"
```

- 出力先は `gs://roastplus-72fa6-backups/firestore/<日付>/` 配下に作られます。
- 完了確認:

```powershell
gcloud storage ls "gs://roastplus-72fa6-backups/firestore/"
```

---

## Storage のバックアップ手順

本番 Storage バケットの中身を、バックアップ用バケットへ複製します。

```powershell
$date = Get-Date -Format "yyyyMMdd"

# <STORAGE_BUCKET> は事前準備で確認した本番バケット名に置き換える
gcloud storage rsync -r "gs://<STORAGE_BUCKET>" "gs://roastplus-72fa6-backups/storage/$date"
```

- `-r` はサブフォルダも含めて再帰的にコピーする指定です。
- 完了確認:

```powershell
gcloud storage ls "gs://roastplus-72fa6-backups/storage/"
```

---

## 復元手順と注意

> ⚠️ **復元は本番データを壊しうる操作です。いきなり本番へ import しないでください。**

### 復元の基本方針

1. **まず本番以外で確認する**
   復元したいデータは、別の Firestore データベース（テスト用）や別プロジェクトに import して内容を確認してから判断します。本番への反映はそのあと。
2. **本番への import は都度ユーザー（IK）承認が必須**
   import は既存データへの上書き・追加になり得ます。実行前に「何を・どこへ・なぜ戻すか」を確認してから行います。
3. **作業前に現状をもう一度バックアップ**
   復元前の本番状態も別フォルダに export しておくと、切り戻しできます。

### Firestore の復元（参考コマンド）

```powershell
# 例: 2026-05-31 のバックアップを戻す
gcloud firestore import "gs://roastplus-72fa6-backups/firestore/20260531"
```

### Storage の復元（参考コマンド）

```powershell
# バックアップ用バケットから本番バケットへ戻す（上書きに注意）
gcloud storage rsync -r "gs://roastplus-72fa6-backups/storage/20260531" "gs://<STORAGE_BUCKET>"
```

> コマンドの正確な構文・オプションは実行前に必ず公式ドキュメントで最新版を確認してください。
> - Firestore: <https://firebase.google.com/docs/firestore/manage-data/export-import>
> - Cloud Storage: <https://cloud.google.com/storage/docs/gsutil/commands/rsync>

---

## 実行記録（任意）

実施したら以下に1行残すと、頻度と担当の管理が楽になります。

| 実施日 | 担当 | 対象 | 保存先パス | 備考 |
|---|---|---|---|---|
| 2026-05-31（例） | IK | Firestore + Storage | `.../firestore/20260531`, `.../storage/20260531` | 初回 |

---

## 確認コマンド（本番操作なし）

現状の確認だけ行いたいときに使います。データは変更しません。

```powershell
firebase use
firebase projects:list
gcloud config get-value project
gcloud storage ls
```
