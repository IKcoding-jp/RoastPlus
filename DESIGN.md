# DESIGN.md — RoastPlus デザインガイド

RoastPlus の画面を一貫して設計・実装するためのデザインガイド。

この文書は、単なる色やコンポーネントの一覧ではなく、「どのページタイプでは何を優先するか」を判断するための基準です。新しい画面を作るとき、既存画面を直すときは、まずページタイプ別ルールを確認してください。

RoastPlus は、コーヒー焙煎・抽出業務を支援する現場向けPWAです。毎日使う少人数チーム向けの業務ツールなので、印象的な装飾よりも、迷わないこと、押しやすいこと、ページごとの一貫性を優先します。

---

## 目次

1. [デザインコンセプト](#1-デザインコンセプト)
2. [デザイン原則](#2-デザイン原則)
3. [ページタイプ別ルール](#3-ページタイプ別ルール)
4. [ページ間で揃える共通ルール](#4-ページ間で揃える共通ルール)
5. [カラーシステム](#5-カラーシステム)
6. [タイポグラフィ](#6-タイポグラフィ)
7. [余白・最大幅・角丸](#7-余白最大幅角丸)
8. [共通UIコンポーネント](#8-共通uiコンポーネント)
9. [レイアウトパターン](#9-レイアウトパターン)
10. [アニメーションとフィードバック](#10-アニメーションとフィードバック)
11. [禁止事項](#11-禁止事項)
12. [実装前チェックリスト](#12-実装前チェックリスト)
13. [参照先](#13-参照先)

---

## 1. デザインコンセプト

**現場で迷わない業務PWA。コーヒーらしさは、操作を邪魔しないアクセントとして効かせる。**

RoastPlus の主軸は「現場オペレーション重視」です。明るく、読みやすく、押しやすく、日常業務で迷わないことを優先します。

コーヒーらしさは、ブランド色、テーマ、タイマー、カードヘッダー、限定的な演出で表現します。すべての画面を濃いブラウンや強い装飾で覆う方向にはしません。

---

## 2. デザイン原則

優先順位は次の順に固定します。

| 優先 | 原則 | 内容 |
|------|------|------|
| 1 | 現場で迷わない | 画面を開いた瞬間に、今の状態と次の操作が分かる。 |
| 2 | ページごとの型を揃える | 同じ目的の画面は、ヘッダー、余白、最大幅、主要アクション位置、空状態を揃える。 |
| 3 | iPadで押しやすい | 現場iPad、タブレット、補助端末でのPWA利用を前提にし、44px以上のタッチ領域を確保する。 |
| 4 | 情報が一目で読める | 時間、担当、状態、次アクションは本文より強く見せる。 |
| 5 | コーヒーらしさは控えめに効かせる | コーヒーらしい色や演出は、業務理解を邪魔しない範囲で使う。 |
| 6 | 毎日使って疲れない | 強いアニメーション、過度なグラデーション、重い装飾は限定する。 |

---

## 3. ページタイプ別ルール

RoastPlus のページは、見た目ではなく「ユーザーが何をする画面か」で分類します。新しい画面を作るときは、まずこの6タイプのどれに当たるかを決めます。

| タイプ | 主な用途 | 対象ページ例 | 推奨レイアウト | ヘッダー | 最大幅 | 主要アクション位置 | 使う共通UI | 避けること |
|--------|----------|--------------|----------------|----------|--------|--------------------|------------|------------|
| ホーム / ハブ | 機能選択 | ホーム | 2列中心の機能カード | ブランドヘッダー | `max-w-6xl` | カード全体を入口にする | `Card`, `ActionCard` | カード内説明を増やしすぎる |
| 一覧 / 管理 | 探す、追加、編集 | 担当表、スケジュール、欠点豆、生産記録、試飲一覧 | iPadではカード、広い画面はテーブルやグリッド | `FloatingNav` + タイトル | `max-w-4xl` から `max-w-7xl` | 上部右側、または下部固定 | `Card`, `Button`, `Tabs`, `EmptyState` | 検索、絞り込み、追加を離れた場所に置く |
| フォーム / 編集 | 入力して保存 | レシピ作成、試飲作成、設定入力、お問い合わせ | 縦積みフォーム | `FloatingNav` + タイトル | `max-w-2xl` または `max-w-lg` | 下部、右下、固定フッターのいずれか | `Input`, `Textarea`, `Select`, `Button`, `Card` | 危険操作を保存ボタンの近くに置く |
| 集中操作 / 実行 | 作業中に状態と次操作を見る | ドリップガイド、時計 | 固定または準固定画面 | 最小ナビ、固定ヘッダー | 画面全体 | 下部操作、中央に主要状態 | `Button`, `IconButton`, `ProgressBar` | 説明文やカードを増やしすぎる |
| 詳細 / 参照 | 読む、判断材料を見る | 欠点豆詳細、開発秘話、規約、履歴詳細 | 読み物レイアウト | `FloatingNav` + タイトル | `max-w-3xl` 前後 | 必要な場合のみ本文末尾 | `Card`, `Badge`, `Accordion` | 操作ボタンを主役にする |
| モーダル / 確認 | 短い判断、設定、確認 | 削除確認、フィルター、OCR確認、詳細設定 | 中央ダイアログ、またはモバイル下寄せ | モーダル内タイトル | `max-w-sm` から `max-w-md` | 下部にキャンセル、実行 | `Modal`, `Dialog`, `Button` | 長い内容や複雑な設定を詰め込む |

---

## 4. ページ間で揃える共通ルール

### 4.1 ヘッダー

- 通常ページは `FloatingNav` とページタイトルを基本にする。
- ドリップガイドや時計などの集中画面は、固定ヘッダーや最小ナビでもよい。
- ホームだけはブランドヘッダーを使う。
- タイトル文言は短くする。
- 説明文をヘッダー内に増やしすぎない。

### 4.2 主要アクション

- 「追加」「保存」「開始」など主操作は1画面に1つを目立たせる。
- 補助操作は `secondary`, `ghost`, `outline` に落とす。
- 危険操作は通常操作から距離を取り、`danger` で明確にする。
- モバイルでは、主要アクションを上部右側、下部固定、またはカード末尾のいずれかに揃える。

### 4.3 空状態

- 空状態は `EmptyState` または `Card variant="guide"` を基本にする。
- 「何もありません」だけで終わらせない。
- アイコン、短い見出し、1行説明、主要アクションの順に揃える。

### 4.4 エラー・警告

- エラーは赤、警告は黄、成功は緑、情報はシアンのセマンティック色を使う。
- 長文エラーは避け、ユーザーが次に何をすればよいかを書く。
- 本番影響や削除操作は確認ダイアログを挟む。

### 4.5 カード密度

- 一覧カードは 1カード1主題にする。
- ホームカードやダッシュボードカードは短くする。
- 詳細ページで情報を広げる。
- カードの入れ子は禁止する。必要ならセクション見出し、区切り線、グループ背景で整理する。

---

## 5. カラーシステム

RoastPlus では、色を直接指定せず、意味を持つセマンティックトークンを使います。テーマ切替は `data-theme` と CSS変数で行うため、コンポーネント側でテーマ名を見て色を分岐しません。

### 5.1 基本ルール

- 通常画面では `bg-page`, `bg-surface`, `text-ink`, `border-edge`, `bg-spot` を優先する。
- モーダルやダイアログは必ず `bg-overlay` を使う。
- ブランド固定色は、ロゴ、ホーム、コーヒーらしさを出す限定箇所に使う。
- `bg-white`, `text-gray-*`, `border-gray-*`, `bg-black` などのハードコード色は使わない。

### 5.2 テーマ概要

| 項目 | 内容 |
|------|------|
| テーマ数 | 7テーマ（`default`, `christmas`, `dark-roast`, `light-roast`, `matcha`, `caramel`, `dark`） |
| テーマ切替方法 | `<html data-theme="christmas">` でCSS変数が自動切替 |
| カラー方針 | セマンティックトークン必須。ハードコードカラーは禁止 |
| スタイリング | Tailwind CSS v4 + CSS変数 |

### 5.3 背景色

| Tailwindクラス | CSS変数 | default値 | 用途 |
|--------------|---------|-----------|------|
| `bg-page` | `--page` | `#F7F7F5` | ページ全体背景 |
| `bg-surface` | `--surface` | `#FFFFFF` | カード・セクション背景 |
| `bg-overlay` | `--overlay` | `#FFFFFF` | モーダル・ダイアログ。不透明必須 |
| `bg-ground` | `--ground` | `#F5F5F5` | テーブルヘッダー・セクション背景 |
| `bg-field` | `--field` | `#FFFFFF` | 入力フィールド背景 |
| `bg-spot` | `--spot` | `#E48003` | アクセント背景 |
| `bg-spot-subtle` | `--spot-subtle` | `#f0f0f0` | アクセント薄背景 |
| `bg-spot-surface` | `--spot-surface` | `#f7f7f7` | アクセント極薄背景 |
| `bg-btn-primary` | `--btn-primary` | `#E48003` | プライマリボタン背景 |
| `bg-btn-primary-hover` | `--btn-primary-hover` | `#C56604` | プライマリボタンホバー |
| `bg-header-bg` | `--header-bg` | `#261a14` | ヘッダー背景 |

### 5.4 テキスト色

| Tailwindクラス | CSS変数 | default値 | 用途 |
|--------------|---------|-----------|------|
| `text-ink` | `--ink` | `#1f2937` | メインテキスト |
| `text-ink-sub` | `--ink-sub` | `#4b5563` | 補助テキスト・説明文 |
| `text-ink-muted` | `--ink-muted` | `#9ca3af` | プレースホルダー・薄いテキスト |
| `text-spot` | `--spot` | `#E48003` | アクセントテキスト |
| `text-spot-hover` | `--spot-hover` | `#C56604` | アクセントホバー |
| `text-header-text` | `--header-text` | `#FFFFFF` | ヘッダーテキスト |
| `text-header-accent` | `--header-accent` | `#EF8A00` | ヘッダーアクセント |
| `text-danger` | `--danger` | `#dc2626` | エラー・削除 |
| `text-success` | `--success` | `#16a34a` | 成功 |
| `text-warning` | `--warning` | `#eab308` | 警告 |
| `text-info` | `--info` | `#00b8d4` | 情報 |
| `text-error` | `--error` | `#ef4444` | エラーテキスト |

### 5.5 ボーダー色

| Tailwindクラス | CSS変数 | default値 | 用途 |
|--------------|---------|-----------|------|
| `border-edge` | `--edge` | `#e5e7eb` | 通常ボーダー |
| `border-edge-strong` | `--edge-strong` | `#d1d5db` | 強調ボーダー・ホバー |
| `border-edge-subtle` | `--edge-subtle` | `#f3f4f6` | 薄いボーダー |
| `border-error` | `--error` | `#ef4444` | エラーボーダー |

### 5.6 ステータス薄背景

| Tailwindクラス | default値 | 用途 |
|--------------|-----------|------|
| `bg-danger-subtle` | `#fee2e2` | エラー薄背景 |
| `bg-success-subtle` | `#dcfce7` | 成功薄背景 |
| `bg-warning-subtle` | `#fef9c3` | 警告薄背景 |

### 5.7 シャドウ

| クラス | 用途 |
|--------|------|
| `shadow-card` | カード通常シャドウ |
| `shadow-card-hover` | カードホバーシャドウ |
| `shadow-card-glow` | 薄いシャドウ |

### 5.8 ブランド固定色

ブランド固定色は、通常画面では乱用しません。ロゴ、ホーム、テーマプレビュー、コーヒーらしい強調に限定します。

| Tailwindクラス | 値 | 用途 |
|--------------|-----|------|
| `text-primary` / `bg-primary` | `#EF8A00` | ブランドオレンジ |
| `bg-primary-dark` | `#D67A00` | ダークオレンジ |
| `text-primary-light` | `#FF9A1A` | ライトオレンジ |
| `bg-dark` | `#211714` | ダークブラウン |
| `bg-dark-light` | `#3A2F2B` | ライトブラウン |
| `text-gold` | `#FFC107` | ゴールド |

### 5.9 カードヘッダーグラデーション

```tsx
<div className="bg-gradient-to-r from-card-header-from via-card-header-via to-card-header-to">
  {/* グラデーションヘッダー */}
</div>
```

グラデーションは、ホーム、ブランド強調、タイマーなど、コーヒーらしさを出したい箇所に限定します。

---

## 6. タイポグラフィ

文字サイズは、画面タイプと情報の重要度で決めます。大きな文字は、タイマー、数値、現在状態など、作業中に遠目でも読む必要がある情報に限定します。

### 6.1 用途別の基本形

| 用途 | 推奨クラス | 使う場所 |
|------|------------|----------|
| ページタイトル | `text-xl sm:text-2xl font-bold text-ink` | 通常ページのタイトル |
| セクション見出し | `text-lg font-semibold text-ink` | カード内やフォーム区切り |
| 本文 | `text-base text-ink` | 説明、本文 |
| 補助文 | `text-sm text-ink-sub` | 説明、注記 |
| ラベル | `text-xs font-medium text-ink-muted` | バッジ、補足情報 |
| 大きな数値 | `text-3xl` から `text-4xl font-bold` | タイマー、進捗数値 |

### 6.2 フォントサイズ

| クラス | px換算 | 主な用途 |
|--------|--------|---------|
| `text-xs` | 12px | バッジ・ラベル・補足情報 |
| `text-sm` | 14px | 補助テキスト・フォームラベル |
| `text-base` | 16px | 本文 |
| `text-lg` | 18px | セクション見出し |
| `text-xl` | 20px | ページタイトル（モバイル） |
| `text-2xl` | 24px | ページタイトル（デスクトップ） |
| `text-3xl` | 30px | 大きな数値 |
| `text-4xl` | 36px | タイマーなどのヒーロー数値 |

### 6.3 フォントウェイト

| クラス | 用途 |
|--------|------|
| `font-bold` | 見出し・強調 |
| `font-semibold` | サブ見出し・ボタンラベル |
| `font-medium` | ラベル・タブ |
| `font-normal` | 本文 |

### 6.4 典型パターン

```tsx
{/* ページタイトル */}
<h1 className="text-xl sm:text-2xl font-bold text-ink">タイトル</h1>

{/* セクション見出し */}
<h2 className="text-lg font-semibold text-ink">セクション名</h2>

{/* 説明文 */}
<p className="text-sm text-ink-sub">補足説明</p>

{/* 数値表示 */}
<span className="text-4xl font-bold text-ink">00:00</span>

{/* バッジ・ラベル */}
<span className="text-xs font-medium text-ink-muted">ラベル</span>
```

---

## 7. 余白・最大幅・角丸

余白と最大幅は、ページタイプ別の一貫性を保つために固定パターンを優先します。

### 7.1 基本スケール

| 用途 | 推奨 |
|------|------|
| モバイル横余白 | `px-4` |
| タブレット横余白 | `sm:px-6` |
| 標準ページ | `max-w-4xl` |
| フォーム | `max-w-2xl` または `max-w-lg` |
| 詳細読み物 | `max-w-3xl` |
| ホーム、広い一覧 | `max-w-6xl` から `max-w-7xl` |
| カード内余白 | `p-4` から `p-6` |
| セクション間 | `space-y-6` |
| カード角丸 | `rounded-2xl` |
| ボタン、入力 | `rounded-lg` |

### 7.2 垂直スペーシング

| クラス | px | 用途 |
|--------|----|------|
| `space-y-2` | 8px | 密なリスト |
| `space-y-4` | 16px | フォーム要素間 |
| `space-y-6` | 24px | セクション内グループ |
| `space-y-8` | 32px | 主要セクション間 |

### 7.3 グリッド・フレックスギャップ

| クラス | px | 用途 |
|--------|----|------|
| `gap-2` | 8px | アイコン+テキスト |
| `gap-3` | 12px | モバイルグリッド |
| `gap-4` | 16px | デスクトップグリッド |
| `gap-6` | 24px | 大きなグリッド |

### 7.4 コンテナ余白

| クラス | 値 | 用途 |
|--------|----|------|
| `px-4` | 16px | モバイル横余白 |
| `sm:px-6` | 24px | タブレット横余白 |
| `lg:px-8` | 32px | デスクトップ横余白 |
| `py-4` | 16px | モバイル縦余白 |
| `py-6` | 24px | タブレット縦余白 |
| `p-4` | 16px | カード内余白 |
| `p-6` | 24px | フォームカード内余白 |

### 7.5 角丸

| クラス | px | 主な用途 |
|--------|----|---------|
| `rounded-lg` | 8px | ボタン・入力・小要素 |
| `rounded-xl` | 12px | バッジ・中要素 |
| `rounded-2xl` | 16px | カード・モーダル |
| `rounded-3xl` | 24px | 大きな特殊要素 |
| `rounded-full` | 50% | アイコンボタン・アバター・ピル型バッジ |

---

## 8. 共通UIコンポーネント

ボタン、カード、入力、セレクト、チェックボックス、モーダルなどを生のTailwindだけで新規実装しません。まず `components/ui` の既存コンポーネントを使います。

### 8.1 基本ルール

- 共通UIは `@/components/ui` から import する。
- shadcn/ui、Radix UI、styled-components、emotion は使わない。
- 新しい共通UIを追加した場合は `components/ui/index.ts` にエクスポートし、必要に応じてテストを追加する。
- 44px以上のタッチ領域を保つ。

### 8.2 使い分け

| コンポーネント | 主な用途 | 注意 |
|----------------|----------|------|
| `Button` | 主要、補助、危険操作 | 主操作は1画面1つを目立たせる |
| `IconButton` | 戻る、設定、閉じるなどの小操作 | 44px以上のタッチ領域を確保する |
| `FloatingNav` | 通常ページの戻る導線 | ホームと集中画面では例外あり |
| `Card` | 情報のまとまり | カードの入れ子は禁止 |
| `Input`, `Textarea`, `Select` | フォーム入力 | ラベルと補足文を近くに置く |
| `Checkbox`, `Switch` | ON/OFFや複数選択 | 生のinputを直接使わない |
| セグメントコントロール | 3択以内の状態切替（「十分・残少・欠品」など） | `Tabs` との違い：ページコンテンツの切替ではなく値の状態変更に使う。`StatusToggle` パターン参照 |
| `Modal` | 任意コンテンツのモーダル | `bg-overlay` 必須 |
| `Dialog` | 確認ダイアログ | 削除は `danger` |
| `Tabs` | 同階層の表示切替 | ページ遷移の代替にしすぎない |
| `Accordion` | 補足情報の開閉 | 主要情報を隠しすぎない |
| `EmptyState` | 空状態 | 次アクションを出す |

### 8.3 import例

```tsx
import {
  Button,
  IconButton,
  BackLink,
  FloatingNav,
  Input,
  NumberInput,
  InlineInput,
  Textarea,
  Select,
  Checkbox,
  Switch,
  Card,
  Modal,
  Dialog,
  Badge,
  RoastLevelBadge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  ProgressBar,
  EmptyState,
} from '@/components/ui';
```

### 8.4 Button

| variant | 用途 |
|---------|------|
| `primary` | 主要アクション |
| `secondary` | 副次アクション |
| `danger` | 削除・危険操作 |
| `success` | 完了・承認 |
| `warning` | 注意喚起 |
| `info` | 情報系アクション |
| `outline` | 軽量アクション |
| `ghost` | ナビゲーション、控えめな操作 |
| `coffee` | ブランド強調 |
| `surface` | フィルター・補助 |

```tsx
<Button variant="primary" size="md">保存</Button>
<Button variant="danger" size="sm" loading={isDeleting}>削除中</Button>
<Button variant="outline" fullWidth>全幅ボタン</Button>
```

### 8.5 Card

| variant | 用途 |
|---------|------|
| `default` | 汎用カード |
| `hoverable` | クリッカブルカード |
| `action` | ホームグリッドカード |
| `coffee` | ブランド強調カード |
| `table` | テーブル外枠 |
| `guide` | ガイド表示、空状態 |

### 8.6 Modal / Dialog

```tsx
<Modal
  show={isOpen}
  onClose={close}
  contentClassName="bg-overlay rounded-2xl shadow-xl max-w-sm w-full border border-edge"
>
  <div className="p-6">...</div>
</Modal>

<Dialog
  isOpen={show}
  onClose={close}
  title="削除の確認"
  description="取り消せません"
  confirmText="削除"
  onConfirm={handleDelete}
  variant="danger"
/>
```

モーダル背景は必ず `bg-overlay` を使います。`bg-surface` はダーク系テーマで半透明になるため、モーダルには使いません。

---

## 9. レイアウトパターン

### 9.1 通常スクロールページ

一覧、設定、詳細ページで使う基本形。

```tsx
<div className="min-h-screen bg-page">
  <FloatingNav backHref="/" />
  <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-4xl">
    <header className="mb-6 sm:mb-8">
      <h1 className="text-xl sm:text-2xl font-bold text-ink">タイトル</h1>
    </header>
    <main className="space-y-6">
      <Card variant="default">...</Card>
    </main>
  </div>
</div>
```

### 9.2 フル画面固定ページ

ドリップガイド、時計など、作業中に状態を見続ける画面で使う。

```tsx
<div className="h-dvh flex flex-col bg-surface overflow-hidden">
  <header className="flex-shrink-0 border-b border-edge px-4 py-3">...</header>
  <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
    {/* flex-1 min-h-0 の組み合わせでスクロールを制御 */}
  </main>
  <footer className="flex-shrink-0 border-t border-edge px-4 py-3">...</footer>
</div>
```

`h-dvh` はPWAのアドレスバー表示/非表示に追従するため、固定画面では `h-screen` より優先します。

### 9.3 フォームページ

入力と保存を迷わせないため、最大幅を狭めて縦積みにする。

```tsx
<div className="min-h-screen bg-page">
  <FloatingNav backHref="/" />
  <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
    <Card variant="default" className="p-6">
      <form className="space-y-6">
        <Input label="名前" />
        <div className="flex gap-4 justify-end">
          <Button variant="secondary">キャンセル</Button>
          <Button variant="primary" type="submit">保存</Button>
        </div>
      </form>
    </Card>
  </div>
</div>
```

### 9.4 ホームグリッド

機能選択を迷わせないため、2列から4列のカードグリッドを基本にする。

```tsx
<div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
  {items.map((item) => (
    <Card key={item.id} variant="action">...</Card>
  ))}
</div>
```

### 9.5 ヘッダーパターン

```tsx
{/* 通常ページ */}
<div className="flex items-center gap-4">
  <BackLink href="/" variant="icon-only" />
  <h1 className="text-xl sm:text-2xl font-bold text-ink">タイトル</h1>
</div>

{/* スティッキー */}
<header className="sticky top-0 z-30 flex-shrink-0 bg-surface border-b border-edge px-4 py-3">
  <div className="flex items-center justify-between">
    <BackLink href="/" variant="icon-only" />
    <h1 className="text-xl font-bold text-ink">タイトル</h1>
    <Button variant="primary" size="sm">追加</Button>
  </div>
</header>

{/* 眉毛ラベル（eyebrow）付きタイトル — 機能名をアイコン+大文字英語で上段に添える */}
<header>
  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-ink-muted">
    <PageIcon className="h-[15px] w-[15px]" />
    PAGE LABEL
  </div>
  <div className="flex items-start justify-between gap-4">
    <div>
      <h1 className="text-[22px] font-bold tracking-[0.01em] text-ink sm:text-[26px]">ページタイトル</h1>
      <p className="mt-1 text-[13.5px] text-ink-sub">一行説明</p>
    </div>
    <Button variant="primary" className="shrink-0">主要アクション</Button>
  </div>
</header>

{/* セクション見出し + カウントバッジ — 件数を色変化（0件=グレー / 1件以上=赤）で示す */}
<div className="flex items-center gap-2">
  <h2 className="text-[15px] font-bold text-ink">セクション名</h2>
  <span
    className={`inline-grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-bold ${
      count > 0 ? 'bg-danger-subtle text-danger' : 'bg-ground text-ink-muted'
    }`}
  >
    {count}
  </span>
</div>

{/* ホーム */}
<header className="relative z-50 shadow-lg bg-header-bg">
  <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
    <span className="text-2xl font-bold text-header-text">
      Roast<span className="text-header-accent">Plus</span>
    </span>
  </div>
</header>
```

### 9.6 テーブルリスト

一覧データを行で表示する際の基本形。モバイルで横スクロールが発生するHTMLテーブルの代わりに使う。`Card variant="table"` で外枠を作り、`divide-y divide-edge-subtle` で行を区切る。

```tsx
{/* 通常リスト */}
<Card variant="table">
  <div className="divide-y divide-edge-subtle">
    {items.map((item) => (
      <div key={item.id} className="flex flex-wrap items-center gap-3.5 px-4 py-3">
        {/* 左: テキスト情報（flex-1 min-w-0 で折り返し許可） */}
        <div className="min-w-0 flex-1">
          <span className="text-sm font-bold text-ink">{item.name}</span>
          <div className="mt-0.5 text-[11.5px] text-ink-muted">補足情報</div>
        </div>
        {/* 右: 操作系（shrink-0 で縮まない） */}
        <div className="flex shrink-0 items-center gap-0.5">
          {/* IconButton など */}
        </div>
      </div>
    ))}
  </div>
</Card>

{/* ローディング中 */}
<Card variant="table">
  <div className="p-4 text-sm text-ink-sub">読み込み中...</div>
</Card>

{/* 空状態（簡易メッセージ） */}
<Card variant="table">
  <div className="flex items-center gap-2.5 p-4 text-sm text-ink-sub">
    <FiCheckCircle className="h-[18px] w-[18px] shrink-0 text-success" aria-hidden="true" />
    対象がありません。
  </div>
</Card>
```

行内に `order-3 w-full sm:order-none sm:w-auto` を使うと、モバイルでは最下段に折り返し、タブレット以上では通常位置に戻るレスポンシブ配置ができる。

---

### 9.7 セグメントコントロール

3択以内の状態を切り替えるUI。`Tabs` がページ内コンテンツの切替に使うのに対し、こちらは「値の状態変更」に使う（例: 在庫の「十分 / 残少 / 欠品」）。

```tsx
{/* セグメントコントロール外枠 */}
<div
  className="inline-flex gap-0.5 rounded-[10px] border border-edge bg-ground p-0.5"
  role="group"
  aria-label="状態"
>
  {options.map((opt) => {
    const selected = opt.value === value;
    return (
      // eslint-disable-next-line local/no-raw-button -- セグメントコントロール専用の小ボタン。共通Buttonはサイズが合わない
      <button
        key={opt.value}
        type="button"
        aria-pressed={selected}
        onClick={() => onChange(opt.value)}
        className={`inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[7px] px-3 text-[13px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-spot/40 ${
          selected ? `${opt.activeClass} shadow-sm` : 'bg-transparent text-ink-muted hover:text-ink-sub'
        }`}
      >
        <span className={`h-[7px] w-[7px] shrink-0 rounded-full bg-current ${selected ? 'opacity-100' : 'opacity-50'}`} aria-hidden="true" />
        {opt.label}
      </button>
    );
  })}
</div>
```

選択中ボタンの `activeClass` はセマンティック色（`bg-success-subtle text-success`、`bg-danger-subtle text-danger` など）を使い、未選択はすべてグレーに統一する。

---

### 9.8 レスポンシブブレークポイント

```text
default : 0px     モバイル
sm      : 640px   タブレット
md      : 768px   小型デスクトップ
lg      : 1024px  大型デスクトップ
```

モバイルファーストで記述し、`sm:`, `md:`, `lg:` で上書きします。

---

## 10. アニメーションとフィードバック

アニメーションは、状態変化を理解しやすくするために使います。装飾だけの強い動きは避けます。

| 用途 | 方針 |
|------|------|
| ホーム | カードの順次出現は使用可 |
| 集中操作画面 | タイマー、進捗、完了状態の演出は使用可 |
| 一覧、フォーム | 控えめな hover / focus / loading を優先 |
| モーダル | 短い fade / scale / slide に留める |
| エラー、成功 | Toast やインラインメッセージで次の行動を示す |

`prefers-reduced-motion` を尊重し、動きを減らす設定のユーザーには不要なアニメーションを見せません。

### 10.1 カスタムCSSアニメーション

| クラス | 効果 | 用途 |
|--------|------|------|
| `animate-pulse-scale` | 2秒ループ、scale 1→1.05→1 | Newラベル |
| `animate-home-page` | 左スライド + フェードイン | ホームページ入場 |
| `animate-home-card` | 下スライド + フェードイン | グリッドカード順次出現 |
| `new-label-gradient` | グラデーション流動 | ラベル装飾 |

### 10.2 Tailwindトランジション

| 用途 | クラス | 時間 |
|------|--------|------|
| ホバー色変化 | `transition-colors duration-200` | 200ms |
| モーダル開閉 | `transition-all duration-300` | 300ms |
| カードリフト | `hover:-translate-y-2 hover:shadow-card-hover transition-all duration-300` | 300ms |
| テーマ変更 | `transition-colors duration-1000` | 1000ms |

### 10.3 Framer Motion

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  ...
</motion.div>
```

---

## 11. 禁止事項

### 11.1 ハードコード色

`bg-white`, `text-gray-*`, `border-gray-*`, `bg-black` など、テーマに追従しない色指定は使いません。

```tsx
// NG
<div className="bg-white text-gray-900 border-gray-200">

// OK
<div className="bg-surface text-ink border-edge">
```

### 11.2 生Tailwindのボタン、カード、入力

`Button`, `Card`, `Input`, `Select`, `Checkbox` など、共通UIがあるものを独自実装しません。

```tsx
// NG
<button className="bg-orange-500 text-white px-4 py-2 rounded-lg">
  保存
</button>

// OK
<Button variant="primary">保存</Button>
```

### 11.3 テーマ名の直接判定

コンポーネント側で `theme === 'christmas'` のような分岐をして通常色を変えません。テーマ差分はCSS変数で吸収します。

```tsx
// NG
const isChristmas = theme === 'christmas';
<div className={isChristmas ? 'bg-[#0a2f1a]' : 'bg-white'}>

// OK
<div className="bg-surface">
```

### 11.4 モーダル背景の `bg-surface`

ダークテーマで透過するため、モーダルやダイアログは `bg-overlay` を使います。

```tsx
// NG
<div className="bg-surface rounded-2xl">...</div>

// OK
<Modal contentClassName="bg-overlay rounded-2xl ...">
```

### 11.5 カードの入れ子

カード内にさらにカードを置く構造は避けます。必要ならセクション見出し、区切り線、グループ背景で整理します。

### 11.6 目的のない装飾

過度なグラデーション、強い影、装飾アニメーションは、操作理解に役立つ場合だけ使います。

---

## 12. 実装前チェックリスト

UIを作る、または直す前に確認します。

- [ ] ページタイプを6分類から選んだ
- [ ] 同じページタイプの既存画面を確認した
- [ ] ヘッダー、最大幅、余白、主要アクション位置がページタイプに合っている
- [ ] `components/ui` の共通コンポーネントを使っている
- [ ] ハードコード色を使っていない
- [ ] モーダル、ダイアログに `bg-overlay` を使っている
- [ ] 主操作が1画面に複数並んでいない
- [ ] 空状態に次アクションがある
- [ ] 危険操作が通常操作から分離されている
- [ ] モバイルで44px以上のタッチ領域を確保している
- [ ] カードの入れ子を作っていない
- [ ] アニメーションが操作理解を邪魔していない

---

## 13. 参照先

| ドキュメント / ファイル | 内容 |
|-------------------------|------|
| `docs/steering/PRODUCT.md` | プロダクトの目的、ユーザー、コアバリュー |
| `docs/steering/FEATURES.md` | 機能仕様、UI実装ルール、共通禁止事項 |
| `docs/steering/TECH_SPEC.md` | 技術制約、テーマシステム、ADR |
| `docs/steering/REPOSITORY.md` | ディレクトリ構成、依存方向 |
| `docs/steering/GUIDELINES.md` | 実装、テスト、Git運用 |
| `app/globals.css` | CSS変数、テーマ定義、カスタムアニメーション |
| `/dev/design-lab` | 開発者向けデザイン確認ページ |

