# 要件定義

**Issue**: #349
**作成日**: 2026-03-22
**ラベル**: ui

## ユーザーストーリー

ユーザー「開発秘話の一覧ヘッダーにあるキャラクター画像は不要になった。記事詳細ページのヘッダーも他のページと統一してほしい」
アプリ「一覧ページのキャラクター画像を削除し、記事詳細ページのヘッダーをFloatingNavに統一する」

## 要件一覧

### 必須要件
- [ ] 一覧ページ: FloatingNavの`right` propからキャラクター画像群（4枚）を削除
- [ ] 記事ページ: 独自`<header>`をFloatingNavコンポーネントに置き換え
- [ ] 不要になったキャラクター画像アセット（`header_*.png` 4ファイル）を削除

### オプション要件
- なし

## 非機能要件
- ビルド成功: `npm run build` が通ること
- 既存テスト: すべてパスすること

## 受け入れ基準
- [ ] 一覧ページのFloatingNavにキャラクター画像が表示されない
- [ ] 記事詳細ページがFloatingNavを使用している
- [ ] 記事詳細ページで戻るボタンが機能する（`/dev-stories`へ遷移）
- [ ] `public/avatars/header_*.png` 4ファイルが削除されている
- [ ] `npm run build && npm run test:run` が通る

## 参照
- FloatingNav: `components/ui/FloatingNav.tsx`（`backHref`, `right`, `className` props）
- 現在の記事ヘッダー: `app/dev-stories/[id]/EpisodeDetailClient.tsx:54-63`
