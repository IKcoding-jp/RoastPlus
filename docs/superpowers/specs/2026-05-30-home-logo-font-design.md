# ホームロゴの改善 ＋ フォント端末差の根治 設計

- 作成日: 2026-05-30
- 対象: ホーム画面ロゴ（`RoastPlus` ワードマーク）とフォント配信の仕組み

> **追記（2026-05-30, 実装中の方針変更）:** 当初「クリスマスモードのロゴはデザイン変更しない」としていたが、通常ロゴ刷新後に実機確認で、クリスマス専用ロゴ（旧: ツリー＋Playfair斜体＋光彩＋金下線）が刷新後の通常ロゴと不釣り合いと判明。ユーザーと数回反復し、最終的に次の形にした:
> - **フォントは通常ロゴと同じ太字 Inter**（Playfair斜体・光彩・金下線は廃止）。
> - **クリスマスモード時のみ**: 先頭「R」を赤(#e23636)、「oast」をクリーム(`text-header-text`)、「Plus」を金(`text-header-accent`)とし、左にクラシックな緑のクリスマスツリー（金の星＋赤/金/白オーナメント）の SVG アイコンを表示。
> - **通常モード**: Roast(`text-header-text`)＋Plus(`text-header-accent`) の太字一体型、アイコンなし。
> - ヘッダー下部の金アクセントラインは維持。
> 経緯は実装計画 Task 6（一旦一本化）→ Task 7（赤R＋ツリー追加）を参照。

## 背景・課題

ホーム画面のロゴが「端末によって違って見える」。原因を調査した結果、**Webフォントが実際には配信されていない**ことが判明した。

- `app/layout.tsx` で `next/font/google`（Inter / Playfair 等の Google Fonts 読み込み）が commit `cb310ca`「build時フォント取得失敗を回避」で無効化されている。
- 代わりに `app/globals.css` の `:root` でフォールバックのみ定義：
  - `--font-inter: 'Inter', 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif`
  - `--font-playfair: 'Georgia', 'Times New Roman', serif`
- 先頭の `Inter` / `Georgia` は「端末にインストールされていれば使われる」ローカルフォント。多くの端末に Inter は無いため、OS ごとに2番手以降（Hiragino / Yu Gothic / 端末標準）へ落ち、**表示が端末依存になる**。これが端末差の正体。

`next/font/google` を再有効化すると、ビルド時に外部取得して失敗した過去の問題が再発しうるため不採用とする。

## 目的・スコープ

- **見た目**: ホーム通常モードのロゴを「太く一体型」のロゴタイプに刷新する。
- **端末差の根治**: Inter と Playfair を**自前配信（`next/font/local`）** に切り替え、全端末で同一表示にする。
- **影響範囲**: `app/layout.tsx`、`app/globals.css`、`components/home/HomeHeader.tsx`、フォントファイル追加（`app/fonts/`）。
- クリスマスモードのロゴ／スプラッシュ／ログイン画面（Playfair 使用）は**デザインを変えず、表示が安定する**効果のみ受ける。

### 非スコープ

- クリスマスロゴ・スプラッシュ・ログインの**デザイン変更**は行わない。
- Inter / Playfair 以外のフォント変数（`--font-oswald` 等）の整理は行わない。

## 設計

### 1. フォント自前配信（中心的変更）

`next/font/local` で woff2 を同梱・自前配信する。ビルド時も実行時も外部取得しないため、過去の取得失敗は再発しない。Inter・Playfair Display はともに OFL ライセンスで同梱可能。

**追加ファイル（可変フォント woff2・ラテンサブセット）:**

- `app/fonts/Inter-latin.woff2` — ウェイト 100–900 を1ファイルでカバー（可変）
- `app/fonts/PlayfairDisplay-latin.woff2` — normal、ウェイト可変
- `app/fonts/PlayfairDisplay-latin-italic.woff2` — italic（クリスマスロゴ用）

woff2 はビルド前にネット経由で取得済みのものをリポジトリにコミットする（ラテンサブセット可変フォントを想定。取得元は fontsource 等の安定 CDN）。

**`app/layout.tsx`:**

```ts
import localFont from 'next/font/local';

const inter = localFont({
  src: './fonts/Inter-latin.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
  fallback: ['Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'sans-serif'],
});

const playfair = localFont({
  src: [
    { path: './fonts/PlayfairDisplay-latin.woff2', style: 'normal', weight: '400 900' },
    { path: './fonts/PlayfairDisplay-latin-italic.woff2', style: 'italic', weight: '400 900' },
  ],
  variable: '--font-playfair',
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});
```

`<html>` の className に `${inter.variable} ${playfair.variable}` を付与する。
これにより `--font-inter` / `--font-playfair` が自前配信フォントを指すよう上書きされる。

**`app/globals.css`:**

- `:root` の `--font-inter` / `--font-playfair` フォールバック定義は**最終保険として残す**（className 未適用時の保険）。削除しない。

### 2. ロゴの見た目（通常モード）

`components/home/HomeHeader.tsx` の通常モード（`isChristmasMode` が false の分岐）を変更：

- 「Roast」「Plus」とも `font-extrabold`（800）。
- 字間 `tracking-[-0.04em]`、`gap` を 0 にして一体型に詰める。
- 色は現状維持：Roast＝`text-header-text`（白）／Plus＝`text-header-accent`（オレンジ）。
- サイズ段階 `text-2xl md:text-3xl`、`font-[var(--font-inter)]`、`leading-none` は維持。

変更イメージ：

```tsx
<div className="flex items-baseline">
  <span className="text-2xl md:text-3xl font-[var(--font-inter)] font-extrabold tracking-[-0.04em] text-header-text leading-none">
    Roast
  </span>
  <span className="text-2xl md:text-3xl font-[var(--font-inter)] font-extrabold tracking-[-0.04em] text-header-accent leading-none">
    Plus
  </span>
</div>
```

クリスマスモードの分岐は変更しない（Playfair italic のまま、自前配信により表示が安定）。

## 検証方法

「コンパニオン → 実機確認」の2段構えの後半（実機確認）を実装後に行う。

1. 実装後 `npm run dev` で**実際のホーム画面**を実機ブラウザ（できれば複数端末）で確認。
   - 端末間で同一表示になっているか。
   - ロゴが「コーヒー・焙煎の温かみ」という雰囲気に合うか。
2. 確定後に `npm run build && npm run test:run`、および format:check を含むローカル検証を通す。

フォント描画自体は単体テストに向かないため、自動テストの追加は最小限とし、既存テスト（`lib/clockSettings.test.ts` が `var(--font-inter), sans-serif` を期待）を壊さないことを確認する。

## リスク・留意点

- woff2 のサブセット選定を誤ると日本語表示に影響しうる。Inter/Playfair はラテン用途のため日本語は `fallback` の Noto Sans JP 等が担う。`--font-inter` は本文でも参照されるため、日本語フォールバックの維持を必ず確認する。
- フォントファイルをリポジトリに追加するため、サイズ（可変 woff2・ラテンサブセットで各数百KB程度）を確認する。
- 初心者向け注意点: `next/font/local` の `src` パスは `layout.tsx` からの相対パス。ファイル配置と綴りを正確に合わせること。
