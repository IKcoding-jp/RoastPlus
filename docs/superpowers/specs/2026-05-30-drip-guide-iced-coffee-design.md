# ドリップガイド：アイスコーヒー（急冷式）レシピ追加 — 設計

- 作成日: 2026-05-30
- 出典レシピ: https://note.com/yuma_lightup/n/nd576301fcd84 （急冷式アイスコーヒー）

## 目的

ドリップガイドに、急冷式アイスコーヒーのデフォルトレシピを1つ追加する。
濃いめに淹れた少量のコーヒーを氷で一気に冷やす淹れ方を、既存のガイド体験のまま提供する。

## 方針（確定した判断）

- **組み込み方**: 既存の `DripRecipe` / `DripStep` の仕組みをそのまま使い、`mockData.ts` の `MOCK_RECIPES` に4つ目のデフォルトレシピとして追加する。アイス専用ページ・専用ロジックは作らない。
- **豆量基準**: 記事に忠実に **1人前 = 粉20g / 湯150g**（ホットより濃いめ配合。氷で薄まる分を見越した配合のため）。
- **人前対応**: 既存の `calculateRecipeForServings` による倍率計算をそのまま利用（1〜8人前）。
- **氷量**: 「1人前あたり60〜80g」の固定文言で表示。倍率計算ロジックには手を入れない。
- **コツの表示**: 既存の `StartHintDialog`（汎用開始ダイアログ）に追記する形で、挽き目・湯温・氷の準備を見せる。4:6のような専用ダイアログは作らない。

## データ構造

`lib/drip-guide/mockData.ts` の `MOCK_RECIPES` に以下を追加する。

```
id: 'recipe-ice-flash'
name: 'アイスコーヒー（急冷式）'
beanName: 'お好みの豆'
beanAmountGram: 20
totalWaterGram: 150
totalDurationSec: 150        // 2:30（最終ステップ=急冷の開始時刻）
purpose: '濃いめに淹れて氷で一気に冷やす急冷式'
description: （記事ベースの要約文。挽き目・湯温・氷の準備を含む）
isDefault: true              // 削除不可
isManualMode: false          // 自動モード（タイマーが進む）
```

型（`lib/drip-guide/types.ts` の `DripRecipe` / `DripStep`）は**変更しない**。

## 注湯ステップ

記事の累計湯量をそのまま `targetTotalWater`（累計）に入れる。最後に湯を注がない「急冷ステップ」を加える（既存の「落ち切り待ち」と同じく `targetTotalWater` なし＋`note` で表現）。

| # | id | startTimeSec | title | targetTotalWater | description / note |
|---|---|---|---|---|---|
| 1 | step-1 | 0 | 蒸らし | 45 | 粉全体にまんべんなく注いで30秒蒸らす |
| 2 | step-2 | 30 | 2投目 | 90 | 中心から「の」の字で注ぐ |
| 3 | step-3 | 60 | 3投目 | 120 | 同様に注ぐ |
| 4 | step-4 | 90 | 4投目 | 150 | ここで注ぎ終わり |
| 5 | step-5 | 150 | 氷で急冷 | （なし） | 落ち切った濃いコーヒーを氷（1人前あたり60〜80g）入りの容器に注ぎ、一気に冷やしてグラスへ |

- 人前を増やすと湯量（45/90/120/150）が倍率計算される。氷量は説明文テキストのため倍率対象外。
- `totalDurationSec = 150`（最終ステップの開始時刻）。記事の「2:00〜2:10で落ち切り」後に急冷へ移る流れに合わせる。

## 開始ダイアログのヒント追加

`components/drip-guide/StartHintDialog.tsx` を拡張する。

- 現状は「湯量は総量表示」「蒸らし後にタイマー開始」「（手動モード時）タップで進む」の固定項目のみ。
- 任意のヒント項目を渡せる `extraHints?: { title: string; body: string }[]` propを追加する。
- アイスレシピのとき（`RecipeList` 側で `recipe.id === 'recipe-ice-flash'` を判定）に、以下を `extraHints` として渡す:
  - 氷を準備（1人前あたり60〜80g）
  - 挽き目はホットより少し細かめ
  - 湯温は90〜91℃（沸かしたては避ける）
- 他レシピは `extraHints` を渡さず、従来どおりの表示を維持する。

## 一覧の並び順

`components/drip-guide/RecipeList.tsx` の `defaultOrder` 配列に新IDを追記する。

```
const defaultOrder = ['recipe-001', 'recipe-003', 'recipe-046', 'recipe-ice-flash'];
```

## Run（実行）経路

`app/drip-guide/run/page.tsx` は変更不要。
新レシピは汎用レシピなので `recipe-046` 専用分岐に当たらず、通常の `calculateRecipeForServings` 経由で `DripGuideRunner` に渡る。

## スコープ外（YAGNI）

- 氷量の動的（人前連動）計算
- アイス専用ページ / 専用ルート
- アイス専用の開始ダイアログ
- `DripRecipe` / `DripStep` 型の変更

## テスト

- `lib/drip-guide/mockData.ts`: 新レシピの主要値（豆量20g・総湯量150g・ステップ数5・各 `targetTotalWater`・最終ステップが湯量なし）を検証するテストを追加（既存のmockData検証パターンがあればそれに合わせる）。
- `components/drip-guide/StartHintDialog.test.tsx`: `extraHints` を渡したとき各項目が表示され、渡さないとき従来表示が壊れないことを検証。
- `npm run build && npm run test:run` でローカル検証。format/lintはHusky・CIが担当。

## 検証観点（手動）

- ドリップガイド一覧にアイスコーヒーが4番目に表示される。
- 人前を2にすると湯量が90/180/240/300、急冷ステップの氷文言は「1人前あたり60〜80g」のまま。
- ガイド開始ダイアログにアイス用ヒント（氷・挽き目・湯温）が出る。
- ガイド実行で蒸らし→3投→急冷の順に進む。
