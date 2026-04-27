# DESIGN.md — RoastPlus デザインシステムリファレンス

コードベース分析（2026-04-27）から抽出した、実際に使われているデザインパターンの完全まとめ。
実装時は必ず `.claude/skills/roastplus-ui/` の詳細ドキュメントも参照すること。

---

## 目次

1. [デザインシステム概要](#1-デザインシステム概要)
2. [カラーシステム](#2-カラーシステム)
3. [タイポグラフィ](#3-タイポグラフィ)
4. [スペーシング](#4-スペーシング)
5. [ボーダー・角丸](#5-ボーダー角丸)
6. [コンポーネントライブラリ](#6-コンポーネントライブラリ)
7. [UIライブラリ・依存関係](#7-uiライブラリ依存関係)
8. [アニメーション](#8-アニメーション)
9. [レイアウトパターン](#9-レイアウトパターン)
10. [やってはいけないパターン](#10-やってはいけないパターン)

---

## 1. デザインシステム概要

| 項目 | 内容 |
|------|------|
| テーマ数 | 7テーマ（`default`, `christmas`, `dark-roast`, `light-roast`, `matcha`, `caramel`, `dark`） |
| テーマ切替方法 | `<html data-theme="christmas">` — CSS変数が自動切替 |
| カラー方針 | セマンティックトークン必須。ハードコードカラー（`bg-white` 等）禁止 |
| コンポーネント | `@/components/ui` のカスタム実装（shadcn/ui・Radix UI 不使用） |
| スタイリング | Tailwind CSS v4 + CSS変数 |
| アニメーション | Framer Motion + カスタムCSSアニメーション（`globals.css`） |
| アイコン | react-icons（`react-icons/hi` が主流） |
| 最小タッチターゲット | 44×44px（モバイルPWA対応） |

---

## 2. カラーシステム

### 2.1 セマンティックトークン（必ず使うべきクラス）

コードベース全体で **2,400回以上** 使用されている。

#### 背景色

| Tailwindクラス | CSS変数 | default値 | 用途 |
|--------------|---------|-----------|------|
| `bg-page` | `--page` | `#F7F7F5` | ページ全体背景 |
| `bg-surface` | `--surface` | `#FFFFFF` | カード・セクション背景 |
| `bg-overlay` | `--overlay` | `#FFFFFF` | モーダル・ダイアログ（**不透明必須**） |
| `bg-ground` | `--ground` | `#F5F5F5` | テーブルヘッダー・セクション背景 |
| `bg-field` | `--field` | `#FFFFFF` | 入力フィールド背景 |
| `bg-spot` | `--spot` | `#d97706` | アクセント背景 |
| `bg-spot-subtle` | `--spot-subtle` | `#f0f0f0` | アクセント薄背景 |
| `bg-spot-surface` | `--spot-surface` | `#f7f7f7` | アクセント極薄背景 |
| `bg-btn-primary` | `--btn-primary` | `#d97706` | プライマリボタン背景 |
| `bg-btn-primary-hover` | `--btn-primary-hover` | `#b45309` | プライマリボタンホバー |
| `bg-header-bg` | `--header-bg` | `#261a14` | ヘッダー背景 |

#### テキスト色

| Tailwindクラス | CSS変数 | default値 | 用途 |
|--------------|---------|-----------|------|
| `text-ink` | `--ink` | `#1f2937` | メインテキスト |
| `text-ink-sub` | `--ink-sub` | `#4b5563` | 補助テキスト・説明文 |
| `text-ink-muted` | `--ink-muted` | `#9ca3af` | プレースホルダー・薄いテキスト |
| `text-spot` | `--spot` | `#d97706` | アクセントテキスト |
| `text-spot-hover` | `--spot-hover` | `#b45309` | アクセントホバー |
| `text-header-text` | `--header-text` | `#FFFFFF` | ヘッダーテキスト |
| `text-header-accent` | `--header-accent` | `#EF8A00` | ヘッダーアクセント |
| `text-danger` | `--danger` | `#dc2626` | エラー・削除 |
| `text-success` | `--success` | `#16a34a` | 成功 |
| `text-warning` | `--warning` | `#eab308` | 警告 |
| `text-info` | `--info` | `#00b8d4` | 情報 |
| `text-error` | `--error` | `#ef4444` | エラーテキスト |

#### ボーダー色

| Tailwindクラス | CSS変数 | default値 | 用途 |
|--------------|---------|-----------|------|
| `border-edge` | `--edge` | `#e5e7eb` | 通常ボーダー |
| `border-edge-strong` | `--edge-strong` | `#d1d5db` | 強調ボーダー・ホバー |
| `border-edge-subtle` | `--edge-subtle` | `#f3f4f6` | 薄いボーダー |
| `border-error` | `--error` | `#ef4444` | エラーボーダー |

#### ステータス薄背景

| Tailwindクラス | default値 | 用途 |
|--------------|-----------|------|
| `bg-danger-subtle` | `#fee2e2` | エラー薄背景 |
| `bg-success-subtle` | `#dcfce7` | 成功薄背景 |
| `bg-warning-subtle` | `#fef9c3` | 警告薄背景 |

#### シャドウ（カスタムユーティリティ）

| クラス | 用途 |
|--------|------|
| `shadow-card` | カード通常シャドウ（ダーク系テーマでグロー） |
| `shadow-card-hover` | カードホバーシャドウ |
| `shadow-card-glow` | 薄いシャドウ |

### 2.2 ブランドカラー（固定・テーマ非依存）

| Tailwindクラス | 値 | 用途 |
|--------------|-----|------|
| `text-primary` / `bg-primary` | `#EF8A00` | ブランドオレンジ |
| `bg-primary-dark` | `#D67A00` | ダークオレンジ |
| `text-primary-light` | `#FF9A1A` | ライトオレンジ |
| `bg-dark` | `#211714` | ダークブラウン |
| `bg-dark-light` | `#3A2F2B` | ライトブラウン |
| `text-gold` | `#FFC107` | ゴールド |

### 2.3 カードヘッダーグラデーション

```tsx
<div className="bg-gradient-to-r from-card-header-from via-card-header-via to-card-header-to">
  {/* グラデーションヘッダー */}
</div>
```

default値: `#211714` → `#3A2F2B` → `#211714`（ダークブラウン）

---

## 3. タイポグラフィ

### 3.1 フォントサイズ（出現頻度順）

コードベース全体で **1,200回以上** 使用。

| クラス | px換算 | 主な用途 |
|--------|--------|---------|
| `text-xs` | 12px | バッジ・ラベル・補足情報 |
| `text-sm` | 14px | 補助テキスト・フォームラベル |
| `text-base` | 16px | 本文（デフォルト） |
| `text-lg` | 18px | サブタイトル・強調テキスト |
| `text-xl` | 20px | ページタイトル（モバイル） |
| `text-2xl` | 24px | ページタイトル（デスクトップ） |
| `text-3xl` | 30px | 大見出し・数値表示 |
| `text-4xl` | 36px | ヒーロー数値（タイマー等） |

### 3.2 フォントウェイト（出現頻度順）

コードベース全体で **1,100回以上** 使用。

| クラス | 用途 |
|--------|------|
| `font-bold` | 見出し・強調（最頻出） |
| `font-semibold` | サブ見出し・ボタンラベル |
| `font-medium` | ラベル・タブ |
| `font-normal` | 本文テキスト（デフォルト） |

### 3.3 典型的な組み合わせ

```tsx
{/* ページタイトル */}
<h1 className="text-xl sm:text-2xl font-bold text-ink">タイトル</h1>

{/* セクション見出し */}
<h2 className="text-lg font-semibold text-ink">セクション名</h2>

{/* 説明文 */}
<p className="text-sm text-ink-sub">補足説明</p>

{/* 数値表示（タイマー等） */}
<span className="text-4xl font-bold text-ink">00:00</span>

{/* バッジ・ラベル */}
<span className="text-xs font-medium text-ink-muted">ラベル</span>
```

---

## 4. スペーシング

### 4.1 垂直スペーシング（`space-y-*`）

コードベース全体で **500回以上** 使用。

| クラス | px | 用途 |
|--------|-----|------|
| `space-y-2` | 8px | 密なリスト |
| `space-y-4` | 16px | フォーム要素間（最頻出） |
| `space-y-6` | 24px | セクション内グループ |
| `space-y-8` | 32px | 主要セクション間 |

### 4.2 グリッド・フレックスギャップ

| クラス | px | 用途 |
|--------|-----|------|
| `gap-2` | 8px | アイコン+テキスト |
| `gap-3` | 12px | モバイルグリッド |
| `gap-4` | 16px | デスクトップグリッド（最頻出） |
| `gap-6` | 24px | 大きなグリッド |

### 4.3 パディング（コンテナ）

コードベース全体で **500回以上** 使用。

| クラス | 値 | 用途 |
|--------|-----|------|
| `px-4` | 16px | モバイル横余白 |
| `px-6` | 24px | タブレット横余白（`sm:px-6`） |
| `px-8` | 32px | デスクトップ横余白（`lg:px-8`） |
| `py-4` | 16px | モバイル縦余白 |
| `py-6` | 24px | タブレット縦余白 |
| `p-4` | 16px | カード内余白 |
| `p-6` | 24px | フォームカード内余白 |

### 4.4 セクションマージン

| クラス | 用途 |
|--------|------|
| `mb-4` | 段落間 |
| `mb-6` | セクション間 |
| `mb-8` | ヘッダー↔メイン間 |

### 4.5 最大幅コンテナ

| クラス | px | 用途 |
|--------|-----|------|
| `max-w-6xl` | 1152px | ホームページ |
| `max-w-4xl` | 896px | 標準コンテンツページ |
| `max-w-2xl` | 672px | フォーム・設定ページ |

---

## 5. ボーダー・角丸

### 5.1 border-radius（出現頻度順）

コードベース全体で **660回以上** 使用。

| クラス | px | 主な用途 |
|--------|-----|---------|
| `rounded-lg` | 8px | ボタン・インプット・小要素 |
| `rounded-xl` | 12px | バッジ・中要素 |
| `rounded-2xl` | 16px | カード・モーダル（最頻出） |
| `rounded-3xl` | 24px | 大きなカード・特殊要素 |
| `rounded-full` | 50% | アイコンボタン・アバター・ピル型バッジ |

### 5.2 ボーダー

```tsx
{/* 通常ボーダー */}
<div className="border border-edge">

{/* 強調ボーダー（ホバー等） */}
<div className="border border-edge-strong">

{/* エラーボーダー */}
<input className="border border-error ring-2 ring-error-ring" />

{/* 下ボーダーのみ（ヘッダー・テーブル行） */}
<header className="border-b border-edge">
```

---

## 6. コンポーネントライブラリ

**shadcn/ui・Radix UI は使用していない。** `@/components/ui` の完全カスタム実装。

### 6.1 インポート方法

```tsx
import {
  Button, IconButton, BackLink, FloatingNav,
  Input, NumberInput, InlineInput, Textarea, Select, Checkbox, Switch,
  Card, Modal, Dialog,
  Badge, RoastLevelBadge,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
  ProgressBar, EmptyState,
} from '@/components/ui';
```

### 6.2 Button

| variant | 見た目 | 用途 |
|---------|--------|------|
| `primary` | オレンジ背景 | 主要アクション |
| `secondary` | グレー背景 | 副次アクション |
| `danger` | 赤背景 | 削除・危険操作 |
| `success` | 緑背景 | 完了・承認 |
| `warning` | 黄背景 | 注意喚起 |
| `info` | シアン背景 | 情報系アクション |
| `outline` | 透明＋アクセントボーダー | 軽量アクション |
| `ghost` | 透明・テキストリンク風 | ナビゲーション |
| `coffee` | ダークブラウン背景 | ブランド強調 |
| `surface` | 白背景＋シャドウ | フィルター・補助 |

```tsx
<Button variant="primary" size="md">送信</Button>
<Button variant="danger" size="sm" loading={isDeleting}>削除中</Button>
<Button variant="outline" fullWidth>全幅ボタン</Button>
```

サイズ: `sm` / `md`（デフォルト） / `lg`

### 6.3 Card

| variant | スタイル | 用途 |
|---------|---------|------|
| `default` | `bg-surface rounded-2xl shadow-card border-edge p-4` | 汎用カード |
| `hoverable` | default＋ホバーシャドウ変化 | クリッカブルカード |
| `action` | ホバーで浮き上がり（-translate-y-2） | ホームグリッドカード |
| `coffee` | ダークブラウン固定背景 | ブランド強調カード |
| `table` | `bg-overlay rounded-xl overflow-hidden` | テーブル外枠 |
| `guide` | `bg-overlay rounded-xl text-center p-6` | ガイド表示 |

### 6.4 Badge / RoastLevelBadge

```tsx
<Badge variant="primary" size="sm">新着</Badge>
<Badge variant="danger">エラー</Badge>
<RoastLevelBadge level="中煎り" size="md" />
```

Badge variants: `default` / `primary` / `secondary` / `success` / `warning` / `danger` / `coffee`

焙煎度別カラー（RoastLevelBadge）:
- 深煎り: `#120C0A`（ほぼ黒）
- 中深煎り: `#4E3526`（ダークブラウン）
- 中煎り: `#745138`（ミディアムブラウン）
- 浅煎り: `#C78F5D`（キャメル）

### 6.5 Modal / Dialog

```tsx
{/* Modal: 任意コンテンツ */}
<Modal show={isOpen} onClose={close}
  contentClassName="bg-overlay rounded-2xl shadow-xl max-w-sm w-full border border-edge">
  <div className="p-6">...</div>
</Modal>

{/* Dialog: 確認ダイアログ */}
<Dialog
  isOpen={show} onClose={close}
  title="削除の確認" description="取り消せません"
  confirmText="削除" onConfirm={handleDelete}
  variant="danger"
/>
```

**モーダル背景は必ず `bg-overlay`**（`bg-surface` はダーク系テーマで半透明になる）

### 6.6 Tabs / Accordion

```tsx
{/* Tabs */}
<Tabs defaultValue="tab1">
  <TabsList><TabsTrigger value="tab1">タブ1</TabsTrigger></TabsList>
  <TabsContent value="tab1">内容</TabsContent>
</Tabs>

{/* Accordion */}
<Accordion>
  <AccordionItem defaultOpen>
    <AccordionTrigger>セクション</AccordionTrigger>
    <AccordionContent>内容</AccordionContent>
  </AccordionItem>
</Accordion>
```

---

## 7. UIライブラリ・依存関係

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| `tailwindcss` | v4 | スタイリング（`@theme inline` でCSS変数をTailwindクラスに登録） |
| `framer-motion` | v12.36.0 | モーダルアニメーション・順次出現 |
| `react-icons` | v5.6.0 | アイコン（主に `react-icons/hi` を使用） |
| `phosphor-react` | v1.4.1 | アイコン（一部利用。新規実装は `react-icons` 推奨） |
| `lottie-react` | v2.4.1 | Lottieアニメーション |
| `tailwind-merge` | v3.5.0 | Tailwindクラスのマージ（コンポーネント内で使用） |
| `next-themes` | — | テーマ管理 |

**不使用ライブラリ（混入禁止）:**
- shadcn/ui
- @radix-ui/*
- styled-components / emotion

---

## 8. アニメーション

### 8.1 カスタムCSSアニメーション（globals.css 定義済み）

| クラス | 効果 | 用途 |
|--------|------|------|
| `animate-pulse-scale` | 2秒ループ、scale 1→1.05→1 | New!ラベル |
| `animate-home-page` | 0.55秒、左スライド＋フェードイン | ホームページ入場 |
| `animate-home-card` | 0.48秒、下スライド＋フェードイン | グリッドカード順次出現 |
| `new-label-gradient` | グラデーション流動 | ラベル装飾 |

```tsx
{/* カード順次出現 */}
{items.map((item, index) => (
  <div className="animate-home-card" style={{ animationDelay: `${index * 60}ms` }}>
    ...
  </div>
))}
```

### 8.2 Tailwindトランジション

| 用途 | クラス | 時間 |
|------|--------|------|
| ホバー色変化 | `transition-colors duration-200` | 200ms |
| モーダル開閉 | `transition-all duration-300` | 300ms |
| カードリフト | `hover:-translate-y-2 hover:shadow-card-hover transition-all duration-300` | 300ms |
| テーマ変更 | `transition-colors duration-1000` | 1000ms（body自動適用） |

### 8.3 Framer Motion パターン

```tsx
{/* フェードイン */}
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}>

{/* ホバー・タップ */}
<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
  transition={{ duration: 0.2 }}>

{/* 順次出現 */}
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
```

### 8.4 アクセシビリティ

```css
/* globals.css に定義済み */
@media (prefers-reduced-motion: reduce) {
  .animate-home-page, .animate-home-card { animation: none; }
}
```

---

## 9. レイアウトパターン

### 9.1 スクロール可能ページ（最多使用）

リスト・設定・詳細ページ用。

```tsx
<div className="min-h-screen bg-page">
  <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-4xl">
    <header className="mb-6 sm:mb-8">
      <div className="flex items-center gap-4">
        <BackLink href="/" variant="icon-only" />
        <h1 className="text-xl sm:text-2xl font-bold text-ink">タイトル</h1>
      </div>
    </header>
    <main className="space-y-6">
      <Card variant="default">...</Card>
    </main>
  </div>
</div>
```

### 9.2 フル画面固定ページ（タイマー・リアルタイム系）

```tsx
<div className="h-dvh flex flex-col bg-surface overflow-hidden">
  <header className="flex-shrink-0 border-b border-edge px-4 py-3">...</header>
  <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
    {/* flex-1 min-h-0 の組み合わせがスクロール制御の鍵 */}
  </main>
  <footer className="flex-shrink-0 border-t border-edge px-4 py-3">...</footer>
</div>
```

> `h-dvh`（Dynamic Viewport Height）はPWAのアドレスバー表示/非表示に追従するため `h-screen` より優先。

### 9.3 フォームページ（max-w-2xl）

```tsx
<div className="min-h-screen bg-page">
  <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
    <Card variant="default" className="p-6">
      <form className="space-y-6">
        <Input label="名前" />
        <div className="flex gap-4 justify-end">
          <Button variant="secondary">キャンセル</Button>
          <Button variant="primary" type="submit">送信</Button>
        </div>
      </form>
    </Card>
  </div>
</div>
```

### 9.4 ホームグリッド（2→4列）

```tsx
<div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
  {items.map(item => <Card key={item.id} variant="action">...</Card>)}
</div>
```

### 9.5 ヘッダーパターン

```tsx
{/* シンプル（戻る + タイトル） */}
<div className="flex items-center gap-4">
  <BackLink href="/" variant="icon-only" />
  <h1 className="text-xl sm:text-2xl font-bold text-ink">タイトル</h1>
</div>

{/* スティッキー */}
<header className="sticky top-0 z-30 flex-shrink-0 bg-surface border-b border-edge px-4 py-3">
  <div className="flex items-center justify-between">
    <BackLink href="/" variant="icon-only" />
    <h1 className="text-xl font-bold text-ink">タイトル</h1>
    <Button variant="primary" size="sm">アクション</Button>
  </div>
</header>

{/* ホームページヘッダー */}
<header className="relative z-50 shadow-2xl bg-header-bg">
  <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
    <span className="text-2xl font-bold text-header-text">
      Roast<span className="text-header-accent">Plus</span>
    </span>
  </div>
</header>
```

### 9.6 レスポンシブブレークポイント

```
(デフォルト) : 0px     モバイル（基本スタイル）
sm:          : 640px   タブレット
md:          : 768px   小型デスクトップ
lg:          : 1024px  大型デスクトップ
```

モバイルファーストで記述。`sm:` `md:` `lg:` で上書き。

---

## 10. やってはいけないパターン

### カラー違反（コードベースで164件検出）

```tsx
// ❌ NG: ハードコードカラー（テーマ非対応）
<div className="bg-white text-gray-900 border-gray-200">
<div className="bg-black text-white">
<div className="bg-gray-100">

// ✅ OK: セマンティックトークン
<div className="bg-surface text-ink border-edge">
<div className="bg-header-bg text-header-text">
<div className="bg-ground">
```

### コンポーネント違反

```tsx
// ❌ NG: 生Tailwindでボタン・カード・入力を作成
<button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">
<div className="bg-white rounded-lg shadow p-4 border border-gray-200">

// ✅ OK: 共通コンポーネントを使用
<Button variant="primary">送信</Button>
<Card variant="default">...</Card>
```

### モーダル背景違反

```tsx
// ❌ NG: bg-surface はダーク系テーマで半透明
<div className="bg-surface rounded-2xl">...</div>

// ✅ OK: bg-overlay は常に不透明
<Modal contentClassName="bg-overlay rounded-2xl ...">
```

### テーマ判定違反

```tsx
// ❌ NG: コンポーネント側でテーマを判定
const isChristmas = theme === 'christmas';
<div className={isChristmas ? 'bg-[#0a2f1a]' : 'bg-white'}>

// ✅ OK: CSS変数で自動切替
<div className="bg-surface">
```

### コンポーネント新規作成時の必須チェック

1. CSS変数ベースのスタイルを使用（ハードコード禁止）
2. `forwardRef` でref転送対応
3. `min-h-[44px]` のタッチターゲット確保
4. `components/ui/index.ts` にエクスポート追加
5. `components/ui/registry.tsx` にデモ追加（`/dev/design-lab` に自動表示）

---

## 参照先

| ドキュメント | 内容 |
|-------------|------|
| `.claude/skills/roastplus-ui/references/design-tokens.md` | CSS変数43個の完全一覧・全7テーマの値 |
| `.claude/skills/roastplus-ui/references/components.md` | 全コンポーネントのProps・variants詳細 |
| `.claude/skills/roastplus-ui/references/layouts.md` | レイアウトパターン詳細 |
| `.claude/skills/roastplus-ui/references/animations.md` | アニメーション実装ガイド |
| `app/globals.css` | CSS変数・テーマ定義の実装ソース |
| `components/ui/registry.tsx` | 全コンポーネントのデモ（`/dev/design-lab` で確認可） |
