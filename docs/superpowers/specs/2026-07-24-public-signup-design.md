# 誰でも新規アカウント作成可能にする（ポートフォリオ公開用）

- **背景**: 開発者（IK）は2026-06-30付けで現場業務から退職済み。本アプリは実業務では使われなくなり、ポートフォリオとして面接官に見てもらう用途に転換する。
- **日付**: 2026-07-24

## 目的

RoastPlus は元々「現場8名が共有アカウントでログインする業務PWA」として設計されており、新規アカウント作成機能（サインアップ）が存在しない。誰でも新規登録して自分専用のデータでアプリを試せるようにする。

## 前提の変更点

- 実業務データは現存しない（本人が退職済み・機能は使われなくなった）ため、既存の共有データ保護は最優先事項ではない。
- ただし、新規登録者どうしのデータが混ざる・他人のデータが見える状態は避ける（アカウントごとにデータを分離する）。

## 現状の課題

`firestore.rules` を確認した結果、`users/{userId}` 配下のデータ（生産記録・担当表・試飲記録など）はすでに `isOwner(userId)` で分離されているが、**`inventory/{itemId}` だけがルート直下の共有コレクション**になっている（「チーム共有・シングルテナント前提」の意図的な例外）。認証済みなら誰でも読み書きできるため、このまま新規登録を開放すると、新規登録者全員が同じ在庫データを共有・書き換えてしまう。

## 方針

1. サインアップ機能を追加する。
2. `inventory` を `users/{userId}/inventory/{itemId}` に構造変更し、全データをアカウント単位に統一する。
3. ログイン画面の文言を「共有アカウント」前提から「個人アカウント」前提に修正する。
4. 法的ドキュメント（プライバシーポリシー・利用規約）を新しい前提に合わせて更新する。

既存の共有 inventory データは移行せず破棄する。既存の共有ログインアカウントはそのまま残し、特別扱いしない（今後は他の新規アカウントと同様、在庫は空から始まる）。

## アーキテクチャ

### 1. 認証（新規実装）

- `lib/auth.ts` に `signUpWithEmail(email, password)` を追加。`createUserWithEmailAndPassword`（Firebase Auth）を呼ぶだけの薄い関数とし、既存の `useAuth` パターンに合わせる。
- `app/signup/page.tsx` を新設。`app/login/page.tsx` と同じフォーム構成（メールアドレス・パスワード入力）を踏襲し、送信時に `signUpWithEmail` を呼ぶ。成功後はログイン後と同じ遷移先へ。
- `app/login/page.tsx`:
  - 「共有アカウントでログインしてください」の文言を、個人アカウント前提の文言に修正。
  - 「アカウントをお持ちでない方はこちら」のリンクを追加し `app/signup` へ遷移。
- スコープ外: メールアドレス確認、パスワードリセット、Googleログイン（`TECH_SPEC.md` に記載はあるが未実装のため今回も対象外とする）。

### 2. データモデル変更（inventory のアカウント分離）

**Firestore パス変更**: `inventory/{itemId}` → `users/{userId}/inventory/{itemId}`

**`firestore.rules`**:
- 146〜151行目の `match /inventory/{itemId}` ブロックを、他の廃止済みルート直下コレクション（`teams`/`members`等、154〜181行目）と同じパターンで `allow read, write: if false;` に変更する。
- `match /users/{userId}/inventory/{itemId}` を新設し、`allow read, write: if isOwner(userId);` を設定する（担当表系サブコレクションと同じ形）。

**`lib/firestore/inventory.ts`**:
- `getInventoryCollectionRef()` を `getInventoryCollectionRef(userId: string)` に変更し、`collection(getUserDocRef(userId), 'inventory')` を返すようにする（`common.ts` の `getUserDocRef` を利用。担当表系モジュールと同じ組み方）。
- `subscribeInventoryItems` / `addInventoryItem` / `updateInventoryItem` / `setInventoryItemStatus` / `deleteInventoryItem` の全関数に `userId` 引数を追加する。

**呼び出し側**:
- `hooks/useInventory.ts`: `userId: string | null` を引数に取り、`userId` が確定するまで購読を開始しない（`useAuth()` の `user.uid` を渡す形に変更）。
- `app/inventory/page.tsx`: `useAuth()` からすでに取得している `user` の `uid` を `useInventory(user?.uid ?? null)` および各書き込み関数呼び出しに渡す。

**既存データ**: 旧 `inventory` コレクションのドキュメントは移行しない（破棄）。

## エラーハンドリング

- 在庫の保存・購読エラー通知は既存のガードレール（`reportSaveError` 等によるユーザー通知）を維持する。`userId` 引数追加に伴う変更のみで、通知の仕組み自体は変えない。
- 備考（本設計のスコープ外）: `hooks/useInventory.ts` の購読エラーハンドラは現状 `console.error` のみで `lib/syncStatus` への通知がない。今回の変更では踏襲するに留め、直すかどうかは別途相談する。

## 法的ドキュメント更新

- `data/legal/privacy-policy.ts`: 「在庫・不足品（品目名、在庫状態など。チーム内で共有されます）」の記述を「アカウントごとに保存されます」に修正。`PRIVACY_POLICY_LAST_UPDATED` を更新。
- `data/legal/terms.ts`: 第2条のサービス機能一覧に新規登録機能を反映（必要な場合のみ文言追加）。`TERMS_LAST_UPDATED` を更新。
- `lib/consent.ts`: `PRIVACY_POLICY_VERSION` / `TERMS_VERSION` をインクリメント。
- `lib/consent.test.ts`: バージョン定数の期待値を更新。

## テスト

- `tests/rules/`: 新規テストケースを追加し `npm run test:rules` で検証する。
  - あるユーザーが自分の `users/{uid}/inventory` に読み書きできる
  - 別ユーザーの `users/{otherUid}/inventory` には読み書きできない
  - 旧ルート直下 `inventory/{itemId}` への読み書きが拒否される
- `lib/auth.test.ts`: `signUpWithEmail` の単体テストを追加。
- `lib/firestore/inventory.test.ts`: `userId` 引数を使った Firestore パス組み立てのテスト更新。
- `hooks/useInventory.ts` 用のテストがあれば `userId` 対応を反映。
- `app/inventory/page.test.tsx`: 呼び出し引数に `userId` が渡ることを反映。
- `lib/consent.test.ts`: バージョン更新反映。
- 全体検証: `npm run typecheck` / `npm run lint` / `npm run test:run` / `npm run test:rules` / `npm run docs:check`。
- UIに変化があるため、chrome-devtools MCP で iPad 幅のスクリーンショットを撮り、ログイン画面・サインアップ画面を目視確認する。

## 非対象（YAGNI / 今回はやらない）

- 不正登録対策（reCAPTCHA・レート制限・メール確認など）。公開ポートフォリオ用途のため見送り、悪用が問題になった場合に別途相談する。
- 既存の共有 inventory データの移行。
- 既存の共有ログインアカウントの削除・特別扱い。
- Googleログインなど他の認証方式の追加。
- `hooks/useInventory.ts` の購読エラー通知（`lib/syncStatus` 未連携）の是正。
