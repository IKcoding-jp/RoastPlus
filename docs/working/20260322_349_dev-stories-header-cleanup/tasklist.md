# タスクリスト

## フェーズ1: 一覧ページのヘッダー簡素化
- [x] `app/dev-stories/page.tsx`: FloatingNavの`right` propからキャラクター画像4枚のdivを削除
- [x] `next/image`のimportが不要になれば削除

## フェーズ2: 記事詳細ページのヘッダー統一
- [x] `app/dev-stories/[id]/EpisodeDetailClient.tsx`: 独自`<header>`（54-63行）をFloatingNavコンポーネントに置き換え
- [x] FloatingNavのimportを追加
- [x] BackLinkのimportが不要になれば削除 → 未使用ではない（not-found表示で使用中）

## フェーズ3: アセット削除
- [x] `public/avatars/header_characters.png` 削除
- [x] `public/avatars/header_dori_server.png` 削除
- [x] `public/avatars/header_mill_kettle.png` 削除
- [x] `public/avatars/header_press_siphon.png` 削除

## フェーズ4: 検証
- [x] `npm run build && npm run test:run` 通過確認

**ステータス**: ✅ 完了
**完了日**: 2026-03-22

## 依存関係
- フェーズ1・2は独立実行可能
- フェーズ3はフェーズ1完了後
- フェーズ4はフェーズ1-3完了後

## 見積もり
- フェーズ1: 3分
- フェーズ2: 5分
- フェーズ3: 2分
- フェーズ4: 5分
- **合計**: 約15分
