# ドリップ前モーダル（StartHintDialog / Start46Dialog）デザイン統一改修 設計書

作成日: 2026-06-11
ステータス: ユーザー承認済みデザイン（ビジュアルコンパニオンでのブレスト結果）

## 1. 目的・背景

ドリップガイドの開始前モーダル2種は機能的には十分だが、以下の課題があった。

- 全ヒントが同じ見た目で並び、情報の優先度が読み取れない
- 説明文が長く、現場で毎回読むには負担が大きい
- 見た目が地味で、デザインとしての洗練が足りない

ブレストの結果、**「エディトリアル・ミニマル」**のデザイン言語で両モーダルを統一する。

## 2. スコープ

### 対象

- `components/drip-guide/StartHintDialog.tsx`（4:6以外の全レシピの開始ダイアログ）
- `components/drip-guide/Start46Dialog.tsx` とそのサブコンポーネント
  - `dialogs/46/Dialog46Header.tsx`
  - `dialogs/46/Dialog46Form.tsx`
  - `dialogs/46/Dialog46Preview.tsx`
  - `dialogs/shared/RecipeSummary.tsx`（4:6専用と確認済み）
  - `dialogs/shared/RecipeStepTable.tsx`（4:6専用と確認済み）
- `components/drip-guide/StartHintDialog.test.tsx`（文言期待値の更新）

### 対象外

- `Dialog46DescriptionModal.tsx`（解説モーダルの中身）
- ロジック層すべて（`generateRecipe46`、localStorage、ルーティング、props インターフェース）
- `app/` 配下のページ追加・削除はないため、利用規約・プライバシーポリシーの更新は不要

## 3. 共通デザイン言語（両モーダルで厳守）

### 3.1 原則

1. **無彩色ベース＋オレンジ1色**: 色はアクセント（spot）のみ。文中の部分カラー禁止
2. **面で塗らず罫線で区切る**: 背景色のタイル・カードin カードを使わない。ヘアライン（1px）罫線
3. **絵文字・光沢・グラデーション禁止**: アイコンは線画（stroke系）のみ。ボタンはフラット
4. **数字はOutfitフォント**: 数値表示はすべて等幅数字（tabular-nums）

### 3.2 カラートークン対応表（ハードコード禁止）

モックアップの色は必ず既存テーマトークンに置き換える。全テーマ（christmas等）に自動対応させるため。

| モック色 | 用途 | 使用トークン |
| --- | --- | --- |
| `#1c1917` | 見出し・ヒントタイトル・ビッグナンバー | `text-ink` |
| `#78716c` | 本文サブ | `text-ink-sub` |
| `#a8a29e` | ラベル・説明文・メタ情報 | `text-ink-muted` |
| `#ececeb` / `#e7e5e4` | 罫線・枠線 | `border-edge` |
| `#e48003` | アクセント（数字の単位・アイコン・バッジ） | `text-spot` / `bg-spot` |
| `#fff` | モーダル背景 | `bg-overlay` |
| CTA | ガイド開始ボタン | 既存 `Button` variant="primary" |

### 3.3 タイポグラフィ規定

| 要素 | サイズ / 太さ / 字間 |
| --- | --- |
| 小ラベル（「ドリップ前のヒント」等） | 10.5px相当（text-[11px]目安）/ font-bold / tracking-[.18em] / ink-muted |
| タイトル（レシピ名） | 20px / font-extrabold / ink |
| ビッグナンバー | StartHint: 58px相当、46: 48px相当 / Outfit 700 / tracking-tight / ink。単位「g」はspot色・約半分のサイズ |
| メタ行（総湯量 ・ 1人前） | 12px / ink-muted / tracking-[.08em] |
| ヒントタイトル | 14px / font-bold / ink |
| ヒント説明 | 12.5px / ink-muted / leading-relaxed |
| フィールドラベル（人前・味わい・濃度） | 11px / font-bold / tracking-[.1em] / ink-muted |

### 3.4 アイコン規定

- 既存依存 `phosphor-react` を第一候補とする（weight="regular"の線画。duotone禁止）
- マッピング: スケール→`Scales`系、タイマー→`Timer`、タップ→`HandTap`、追加ヒント→`Coffee`、解説→`BookOpen`、行き先矢印→`CaretRight`、CTA矢印→`ArrowRight`
- phosphor-react に適切なアイコンがない場合のみ、モックアップ準拠のカスタムSVG（stroke-width 1.7〜1.8、round cap）を小コンポーネントとして実装
- ヒントアイコンは裸（背景タイルなし）・20px・`text-ink-muted`系のモノクロ
- アクセント用途（解説リンクのBookOpen）は `text-spot`

### 3.5 ボタン規定

- **幅の狭いStartHintDialog**: 「閉じる」=枠線ボタン（固定幅）＋「ガイド開始 →」=フラットオレンジで残り幅いっぱい
- **幅の広いStart46Dialog**: 右寄せボタンペア。CTAは内容幅＋余白の通常サイズ
- 角丸は16px（rounded-2xl）。光沢・inset shadow禁止。`active:scale-[0.99] touch-manipulation` は踏襲

### 3.6 数字フォント（Outfit）の導入

- `next/font/google` で `Outfit`（weight 600/700、subsets: ['latin']）を導入
- CSS変数（例 `--font-outfit`）として `app/layout.tsx` で公開し、数値表示要素にだけ適用
- 自己ホストされるため PWA オフラインでも動作する。日本語本文は現行フォントのまま

## 4. StartHintDialog 新仕様

### 4.1 構造（上から順）

1. 小ラベル「ドリップ前のヒント」
2. タイトル: `recipeName`（未指定時は従来コピー「一杯をおいしく淹れるために」にフォールバック）
3. ビッグナンバーブロック: `totalWaterGram`g（Outfit・58px相当・単位gはspot色）＋メタ行「総湯量 ・ {servings}人前」
   - `totalWaterGram` 未指定時はブロックごと非表示
   - `servings` 未指定時はメタ行を「総湯量」のみに
4. ヘアライン区切り
5. ヒントリスト（行間に罫線。先頭行の上・最終行の下には引かない）
6. フッター: 閉じる（枠線）＋ガイド開始（フラットオレンジ・残り幅）

### 4.2 ヒント文言（新旧対応）

| 旧 | 新タイトル | 新説明 |
| --- | --- | --- |
| 湯量は総量表示です（＋総湯量注記） | スケールは0に戻さない | 表示される湯量は合計量です |
| 蒸らし後にタイマー開始 | 蒸らし後にタイマー開始 | 蒸らしのお湯を入れてからスタートします |
| 手順はタップで進みます（isManualMode時のみ） | 手順は「次へ」タップで進む | タイマーは経過時間の目安です |
| extraHints（アイス等） | そのまま（title/body） | そのまま。アイコンはCoffee |

- ヒントは「タイトル＋説明」の2行構成（1行への詰め込み禁止。日本語の折り返し崩れ防止）
- 旧仕様の「今回の総湯量: 160g / 1人前」はビッグナンバーへ昇格したため削除

### 4.3 変更しない挙動

- props インターフェース（呼び出し側 `RecipeList.tsx` は無変更）
- Escapeキーで閉じる、オーバーレイクリックで閉じる
- framer-motion の開閉アニメーション
- isManualMode / extraHints の条件分岐ロジック

## 5. Start46Dialog 新仕様

### 5.1 構造

1. 共通ヘッダー文法: 小ラベル「ドリップ前の設定」＋タイトル「4:6メソッド（粕谷）」（Dialog46Header）
2. 2カラムレイアウト（`md:` 以上で左右、狭い画面では縦積み）
   - **左カラム（約58%）**: 解説リンク行 → 人前Select → 味わいセグメント → 濃度セグメント
   - **右カラム（約42%・左罫線で区切る）**: ビッグナンバー（総湯量・48px相当）＋メタ行「総湯量 ・ 豆 {bean}g ・ 約{時間}」→ ステップ表
3. フッター: 右寄せボタンペア（閉じる＋ガイド開始）

- モーダル幅は現行 `max-w-2xl` を維持
- 人前・味わい・濃度の変更でビッグナンバーとステップ表がライブ更新される（既存の `useMemo` プレビューをそのまま利用）

### 5.2 解説リンク行（A案で確定）

- 枠線（edge）・角丸16pxの行。BookOpenアイコンのみ `text-spot`
- 文字は「4:6メソッドのポイント（必読）」を**全部ink色・font-bold**（部分カラー禁止）
- 右端に CaretRight（ink-muted）

### 5.3 フォームコントロール

- **人前**: 既存 `Select` コンポーネントを使い、枠線・角丸16pxのスタイルに寄せる。選択肢ラベルは現行の `${s}人前 (${s * 10}g / ${s * 150}g)` を維持
- **味わい・濃度**: セグメントコントロール化
  - 外枠: `border-edge`・角丸14px・padding 3px
  - 選択中: `bg-spot text-on-spot` font-bold・角丸11px
  - 非選択: 背景なし・`text-ink-sub`
  - ラベルは既存 `TASTE_LABELS` / `STRENGTH_LABELS` を使用。`white-space: nowrap`
- タップターゲットは44px以上を確保（iPad現場利用）

### 5.4 プレビュー（RecipeSummary / RecipeStepTable の改修）

- RecipeSummary: アイコン並びのグリッド → **ビッグナンバー＋メタ行**へ全面変更
- RecipeStepTable: ヘアライン罫線スタイルの4列表「時間・ステップ・注湯・累計」
  - 時間・注湯・累計は Outfit の tabular-nums で右揃え（桁が縦に揃う）
  - ヘッダー行は小ラベル様式（11px・tracking・ink-muted）
  - 累計列はコンポーネント内で注湯量の累積から算出

### 5.5 変更しない挙動

- servings / taste / strength の状態管理、localStorage への前回値保存
- `generateRecipe46` の計算、`router.push` の遷移
- `useDialogKeyboard`、Dialog46DescriptionModal の開閉

## 6. テスト計画

- `StartHintDialog.test.tsx`: 新文言（「スケールは0に戻さない」等）への期待値更新。既存の観点（isManualMode 分岐・extraHints 表示・onStart/onClose 呼び出し）は維持
- 追加観点:
  - `totalWaterGram` 未指定時にビッグナンバーが表示されないこと
  - `recipeName` 未指定時にフォールバックタイトルが出ること
- 4:6側: 既存テストなし（確認済み）。見た目のみの変更でありロジック不変のため、検証は第7節の目視確認とテーマ切替確認でカバーする。累計列の算出ロジックを関数に切り出す場合のみ単体テストを追加する

## 7. 検証手順（実装完了の条件）

1. `npm run test` パス
2. `npm run format:check` / lint パス
3. chrome-devtools MCP で iPad 幅をエミュレートし、両モーダルのスクリーンショットを撮って目視確認
4. テーマ切り替え（少なくとも default と christmas）で配色が破綻しないこと
5. ヒント件数が多いケース（アイスフラッシュ: extraHints 3件）でレイアウトが崩れないこと
6. `npm run docs:check`（FEATURES.md の StartHintDialog 記述との整合確認）

## 8. リスク・備考

- `RecipeSummary` / `RecipeStepTable` は Dialog46Preview のみが使用（grep確認済み）。改修の影響は4:6ダイアログに閉じる
- `phosphor-react` のアイコン名は実装時に存在確認する（パッケージが古い場合、HandTap 等がない可能性 → その場合はカスタムSVG）
- Outfit導入は `app/layout.tsx` に触れるが、適用は数値要素に限定するため既存画面への影響なし
- モックアップ（最終版）はブレストセッションの `.superpowers/brainstorm/823-1781122908/content/` にあり（gitignore対象のため、本書のスタイル規定が正）
  - StartHintDialog: `design-m1-final.html`
  - Start46Dialog: `design-46-b-v2.html` ＋解説リンク行は `design-46-hint-row.html` のA案
