# ホームロゴ改善 ＋ フォント端末差根治 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ホーム通常ロゴを太い一体型ロゴタイプに刷新し、Inter/Playfair を自前配信に切り替えて全端末で同一表示にする。

**Architecture:** `next/font/local` で woff2 をリポジトリ同梱・自前配信し、`--font-inter` / `--font-playfair` を `<html>` 上で定義する。ビルド時も実行時も外部取得しないため、過去の「build時フォント取得失敗」（commit `cb310ca`）は再発しない。ロゴの見た目は `HomeHeader.tsx` の通常モード分岐のみ変更する。

**Tech Stack:** Next.js 16（App Router）, `next/font/local`, Tailwind CSS v4, Vitest + Testing Library。

参照スペック: `docs/superpowers/specs/2026-05-30-home-logo-font-design.md`

**前提:** 作業ブランチ `feature/home-logo-font` 上で作業する（既に作成済み）。

---

## ファイル構成

- 作成: `app/fonts/Inter-latin.woff2`（可変・ウェイト100–900・ラテンサブセット）
- 作成: `app/fonts/PlayfairDisplay-latin.woff2`（可変・normal）
- 作成: `app/fonts/PlayfairDisplay-latin-italic.woff2`（可変・italic、クリスマスロゴ用）
- 作成: `components/home/HomeHeader.test.tsx`（通常ロゴのマークアップ回帰テスト）
- 変更: `app/layout.tsx`（`next/font/local` 配線、`<html>` に variable クラス付与）
- 変更: `app/globals.css`（`:root` の暫定フォールバック `--font-inter` / `--font-playfair` を削除）
- 変更: `components/home/HomeHeader.tsx`（通常モードのロゴを案2へ）

---

## Task 1: フォントファイルの同梱

OFL ライセンスの可変 woff2（ラテンサブセット）を fontsource の安定 CDN から取得し、リポジトリに同梱する。実行時もビルド時もネット不要にするのが目的。

**Files:**
- Create: `app/fonts/Inter-latin.woff2`
- Create: `app/fonts/PlayfairDisplay-latin.woff2`
- Create: `app/fonts/PlayfairDisplay-latin-italic.woff2`

- [ ] **Step 1: fonts ディレクトリを作成しダウンロード**

Run:
```bash
mkdir -p app/fonts
curl -L -o app/fonts/Inter-latin.woff2 "https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2"
curl -L -o app/fonts/PlayfairDisplay-latin.woff2 "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display:vf@latest/latin-wght-normal.woff2"
curl -L -o app/fonts/PlayfairDisplay-latin-italic.woff2 "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display:vf@latest/latin-wght-italic.woff2"
```

- [ ] **Step 2: ファイルが正しい woff2 か検証**

Run:
```bash
ls -l app/fonts/
for f in app/fonts/Inter-latin.woff2 app/fonts/PlayfairDisplay-latin.woff2 app/fonts/PlayfairDisplay-latin-italic.woff2; do printf '%s: ' "$f"; head -c 4 "$f"; echo; done
```
Expected: 3ファイルが存在し、サイズは概ね Inter≈48KB / Playfair normal≈38KB / italic≈38KB。各ファイル先頭4バイトが `wOF2`（woff2 のマジックナンバー）。

- [ ] **Step 3: コミット**

```bash
git add app/fonts/Inter-latin.woff2 app/fonts/PlayfairDisplay-latin.woff2 app/fonts/PlayfairDisplay-latin-italic.woff2
git commit -m "chore: 自前配信用のInter/Playfair woff2を同梱"
```

---

## Task 2: layout.tsx で next/font/local を配線

自前配信フォントを `--font-inter` / `--font-playfair` に割り当て、`<html>` へ適用する。日本語等は `fallback` で担保する。

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: フォントローダーを追加**

`app/layout.tsx` の冒頭、`import './globals.css';` の直後に以下を追加する。先頭の無効化コメント（`// TEMPORARY: Google Fonts disabled ...` と `// import { Geist, ... }`）は削除する。

```tsx
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

- [ ] **Step 2: `<html>` に variable クラスを付与**

`app/layout.tsx` の `<html lang="ja" suppressHydrationWarning>` を次に変更する。

```tsx
<html lang="ja" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
```

（`next-themes` は `attribute="data-theme"` で `data-theme` 属性のみ操作するため、この className は維持される。）

- [ ] **Step 3: ビルドが通ることを確認**

Run: `npm run build`
Expected: ビルド成功。`next/font` がローカル woff2 を解決し、フォント取得失敗のエラーが出ない。

- [ ] **Step 4: コミット**

```bash
git add app/layout.tsx
git commit -m "feat: Inter/Playfairをnext/font/localで自前配信"
```

---

## Task 3: globals.css の暫定フォールバックを削除

`--font-inter` / `--font-playfair` は commit `cb310ca` でフォント無効化時の暫定フォールバックとして `:root` に追加されたもの。自前配信に切り替えたので削除し、next/font が `<html>` 上で定義する値（`fallback` 込み）に一本化する。`:root` に両方を残すと CSS 変数の優先順位が next/font の定義と競合しうるため削除する。

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: 2行を削除**

`app/globals.css` の `:root` ブロック内、次の2行を削除する（17行目・23行目付近）。

```css
  --font-inter: var(--font-geist-sans);
```
```css
  --font-playfair: 'Georgia', 'Times New Roman', serif;
```

他のフォント変数（`--font-geist-sans`, `--font-sans`, `--font-nunito` 等）は**残す**。`--font-inter` / `--font-playfair` を参照しているのは next/font が定義する `<html>` 配下のコンポーネントのみなので、削除して問題ない。

- [ ] **Step 2: 既存テストが壊れないことを確認**

`lib/clockSettings.test.ts` は文字列 `'var(--font-inter), sans-serif'` を検証するもので、CSS 変数の定義場所には依存しない。念のため実行する。

Run: `npm run test:run -- lib/clockSettings.test.ts`
Expected: PASS。

- [ ] **Step 3: ビルドが通ることを確認**

Run: `npm run build`
Expected: ビルド成功。

- [ ] **Step 4: コミット**

```bash
git add app/globals.css
git commit -m "refactor: 暫定フォントフォールバックを削除しnext/fontに一本化"
```

---

## Task 4: ホーム通常ロゴを案2へ（テスト先行）

`components/home/HomeHeader.tsx` の通常モード（`isChristmasMode` が false）のロゴを、太い一体型（両方 `font-extrabold` / 字間 `-0.04em` / gap なし）に変更する。クリスマスモード分岐は変更しない。

マークアップの回帰を防ぐ軽量テストを先に追加する。太さ・字間といった見た目の最終確認は Task 5 の実機確認で行う（CSS の見た目は単体テストに不向きなため、テストはマークアップの保証に限定する — これは意図的な設計判断）。

**Files:**
- Create: `components/home/HomeHeader.test.tsx`
- Modify: `components/home/HomeHeader.tsx:42-49`

- [ ] **Step 1: 失敗するテストを書く**

`components/home/HomeHeader.test.tsx` を新規作成する（モックパターンは `app/page.test.tsx` に準拠）。

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomeHeader } from './HomeHeader';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/hooks/useChristmasMode', () => ({
  useChristmasMode: () => ({ isChristmasMode: false }),
}));

describe('HomeHeader（通常モード）', () => {
  it('ロゴが「Roast」「Plus」の2要素で構成され、Plusがアクセント色を持つ', () => {
    render(<HomeHeader />);

    const roast = screen.getByText('Roast');
    const plus = screen.getByText('Plus');

    expect(roast).toBeInTheDocument();
    expect(plus).toBeInTheDocument();
    // 一体型: 親コンテナに gap 系クラスを持たない
    expect(roast.parentElement?.className).not.toMatch(/gap-/);
    // 太い一体型: 両セグメントとも extrabold
    expect(roast.className).toMatch(/font-extrabold/);
    expect(plus.className).toMatch(/font-extrabold/);
    // 色の役割: Plus はアクセント色
    expect(plus.className).toMatch(/text-header-accent/);
  });

  it('デジタル時計ボタンを表示する', () => {
    render(<HomeHeader />);
    expect(screen.getByRole('button', { name: 'デジタル時計を表示' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npm run test:run -- components/home/HomeHeader.test.tsx`
Expected: FAIL。現状は `gap-[3px]` を持ち、`font-semibold`/`font-bold` で `font-extrabold` が無いため、マッチ系のアサーションが失敗する。

- [ ] **Step 3: 通常モードのロゴを変更**

`components/home/HomeHeader.tsx` の通常モード分岐（現 42–49 行）を次に置き換える。

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

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npm run test:run -- components/home/HomeHeader.test.tsx`
Expected: PASS（2 tests）。

- [ ] **Step 5: コミット**

```bash
git add components/home/HomeHeader.tsx components/home/HomeHeader.test.tsx
git commit -m "feat: ホーム通常ロゴを太い一体型ロゴタイプに刷新"
```

---

## Task 5: ローカル検証 ＋ 実機確認のハンドオフ

「コンパニオン → 実機確認」の後半（実機確認）と、プロジェクトのローカル検証を行う。

**Files:** なし（検証のみ）

- [ ] **Step 1: フルのローカル検証**

Run:
```bash
npm run build && npm run test:run && npm run format:check
```
Expected: build 成功 / 全テスト PASS / format:check で差分なし（差分があれば `npm run format` を実行して `git commit -m "style: prettier整形"`）。

- [ ] **Step 2: 実機確認（ユーザー操作）**

Run: `npm run dev`
ユーザーが実機ブラウザ（できれば複数端末）でホーム画面を開き、次を確認する。
- ロゴが太い一体型で表示され、端末間で同じに見えること。
- 「コーヒー・焙煎の温かみ」という雰囲気に合うこと。
- クリスマスモード（設定で切り替え）のロゴ・スプラッシュ・ログインも崩れていないこと。

実機確認で違和感があれば Task 4 の字間・ウェイトを微調整して再確認する。

- [ ] **Step 3: ユーザー承認後、完了処理**

`superpowers:finishing-a-development-branch` に従い、PR 作成またはマージを判断する（コミット・PR・マージはユーザーの明示依頼に従う）。

---

## 検証まとめ

- フォント自前配信: `npm run build` がフォント取得失敗なく通ること＋実機での同一表示で検証。
- ロゴのマークアップ: `HomeHeader.test.tsx` で回帰を防止。
- ロゴの見た目（太さ・字間・雰囲気）: 実機ブラウザでの目視確認で最終判断。
