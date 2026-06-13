# ドリップ前モーダル統一改修 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** StartHintDialog / Start46Dialog を「エディトリアル・ミニマル」デザイン言語（無彩色＋spot1色・ヘアライン罫線・Outfit数字・フラットボタン）で統一改修する。

**Architecture:** ロジック・props は一切変更せず、描画部分のみ差し替える。色はすべて既存テーマトークン（ink / ink-sub / ink-muted / edge / spot / overlay）経由でハードコード禁止。数字フォント Outfit は既存の localFont パターン（`app/fonts/`）で自己ホストし、Tailwind v4 の `@theme` に `--font-num` を追加して `font-num` ユーティリティとして使う。

**Tech Stack:** Next.js App Router / Tailwind CSS v4（CSS変数テーマ）/ phosphor-react 1.4.1 / framer-motion / vitest + Testing Library

**設計書:** `docs/superpowers/specs/2026-06-11-drip-start-dialogs-redesign-design.md`（スタイル規定の正）

**作業ブランチ:** `feat/drip-start-dialogs-redesign`（作成済み）

---

## File Structure

| ファイル | 操作 | 責務 |
| --- | --- | --- |
| `app/fonts/Outfit-latin.woff2` | Create | 数字用フォント（latin可変、自己ホスト） |
| `app/layout.tsx` | Modify | Outfit を localFont で読み込み `--font-outfit` を公開 |
| `app/globals.css` | Modify | `@theme` に `--font-num` を追加（`font-num` ユーティリティ生成） |
| `components/drip-guide/StartHintDialog.tsx` | Modify | M1デザインへ全面差し替え（props・キーボード操作は不変） |
| `components/drip-guide/StartHintDialog.test.tsx` | Modify | 新文言・新構造への期待値更新＋フォールバック観点追加 |
| `components/drip-guide/Start46Dialog.tsx` | Modify | 2カラムグリッド化＋右寄せフッター（状態・遷移は不変） |
| `components/drip-guide/dialogs/46/Dialog46Header.tsx` | Modify | 共通ヘッダー文法（小ラベル＋タイトル）へ |
| `components/drip-guide/dialogs/46/Dialog46Form.tsx` | Modify | 解説リンクA案＋セグメントコントロール化 |
| `components/drip-guide/dialogs/46/Dialog46Preview.tsx` | Modify | ビッグナンバー＋メタ行＋ステップ表（RecipeSummary を統合） |
| `components/drip-guide/dialogs/shared/RecipeSummary.tsx` | Delete | Dialog46Preview に統合されるため削除（他に利用箇所なし・grep確認済み） |
| `components/drip-guide/dialogs/shared/RecipeStepTable.tsx` | Modify | ヘアライン罫線＋Outfit等幅数字の表へ |
| `docs/steering/FEATURES.md` | Modify | StartHintDialog のヒント文言記述を新文言に追従 |

**変更しないファイル（重要）:** `RecipeList.tsx`（呼び出し側）、`lib/drip-guide/recipe46.ts`、`lib/localStorage.ts`、`hooks/drip-guide/useDialogKeyboard.ts`、`Dialog46DescriptionModal.tsx`

---

### Task 1: Outfit 数字フォントの導入

**Files:**
- Create: `app/fonts/Outfit-latin.woff2`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`（`@theme` の `/* フォント */` セクション、479行目付近）

- [ ] **Step 1: Outfit 可変フォント（latin）をダウンロード**

PowerShell で実行:

```powershell
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
$css = (Invoke-WebRequest -Uri 'https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap' -Headers @{ 'User-Agent' = $ua }).Content
# CSS は unicode-range ごとのブロックで構成され、latin ブロックは最後にある
$url = ([regex]::Matches($css, 'https://fonts\.gstatic\.com/[^\)]+\.woff2') | Select-Object -Last 1).Value
Invoke-WebRequest -Uri $url -OutFile 'app/fonts/Outfit-latin.woff2'
Get-Item 'app/fonts/Outfit-latin.woff2' | Select-Object Name, Length
```

Expected: `Outfit-latin.woff2` が作成される（数十KB程度）。ネットワーク不可の場合はこのタスクを保留し、後続タスクは `font-num` がフォールバック（Inter）で描画されることを許容して進めてよい。

- [ ] **Step 2: `app/layout.tsx` に localFont 定義を追加**

`playfair` の定義（20〜28行目）の直後に追加:

```tsx
const outfit = localFont({
  src: './fonts/Outfit-latin.woff2',
  variable: '--font-outfit',
  weight: '100 900',
  display: 'swap',
  fallback: ['Inter', 'sans-serif'],
});
```

`<html>` の className（61行目）を変更:

```tsx
<html
  lang="ja"
  className={`${inter.variable} ${playfair.variable} ${outfit.variable}`}
  suppressHydrationWarning
>
```

- [ ] **Step 3: `app/globals.css` の `@theme` にフォントトークンを追加**

`--font-nunito: var(--font-nunito);`（481行目付近）の直後に追加:

```css
  --font-num: var(--font-outfit), var(--font-inter), sans-serif;
```

これで Tailwind v4 が `font-num` ユーティリティクラスを生成する。

- [ ] **Step 4: 型チェックで破壊がないことを確認**

Run: `npm run typecheck`
Expected: エラーなしで終了

- [ ] **Step 5: Commit**

```bash
git add app/fonts/Outfit-latin.woff2 app/layout.tsx app/globals.css
git commit -m "feat(fonts): 数字表示用フォント Outfit を追加

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: StartHintDialog の M1 デザイン化（TDD）

**Files:**
- Modify: `components/drip-guide/StartHintDialog.test.tsx`
- Modify: `components/drip-guide/StartHintDialog.tsx`

- [ ] **Step 1: テストを新仕様に書き換える（失敗するテストを先に書く）**

`components/drip-guide/StartHintDialog.test.tsx` 全体を以下に置き換え:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StartHintDialog } from './StartHintDialog';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLProps<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onStart: vi.fn(),
};

describe('StartHintDialog', () => {
  it('isOpen: true のとき表示される', () => {
    render(<StartHintDialog {...defaultProps} />);
    expect(screen.getByText('ドリップ前のヒント')).toBeInTheDocument();
  });

  it('recipeName を渡すとタイトルに表示される', () => {
    render(<StartHintDialog {...defaultProps} recipeName="BYSN Standard Drip" />);
    expect(screen.getByText('BYSN Standard Drip')).toBeInTheDocument();
  });

  it('recipeName 未指定のときフォールバックタイトルが表示される', () => {
    render(<StartHintDialog {...defaultProps} />);
    expect(screen.getByText('一杯をおいしく淹れるために')).toBeInTheDocument();
  });

  it('totalWaterGram を渡すとビッグナンバーとメタ行が表示される', () => {
    render(<StartHintDialog {...defaultProps} totalWaterGram={160} servings={1} />);
    expect(screen.getByText('160')).toBeInTheDocument();
    expect(screen.getByText(/総湯量/)).toBeInTheDocument();
    expect(screen.getByText(/1人前/)).toBeInTheDocument();
  });

  it('totalWaterGram 未指定のときビッグナンバーが表示されない', () => {
    render(<StartHintDialog {...defaultProps} />);
    expect(screen.queryByText(/総湯量/)).not.toBeInTheDocument();
  });

  it('isManualMode: true のとき「手順は「次へ」タップで進む」が表示される', () => {
    render(<StartHintDialog {...defaultProps} isManualMode={true} />);
    expect(screen.getByText('手順は「次へ」タップで進む')).toBeInTheDocument();
  });

  it('isManualMode: false のとき「手順は「次へ」タップで進む」が表示されない', () => {
    render(<StartHintDialog {...defaultProps} isManualMode={false} />);
    expect(screen.queryByText('手順は「次へ」タップで進む')).not.toBeInTheDocument();
  });

  it('isManualMode 未指定のとき「手順は「次へ」タップで進む」が表示されない', () => {
    render(<StartHintDialog {...defaultProps} />);
    expect(screen.queryByText('手順は「次へ」タップで進む')).not.toBeInTheDocument();
  });

  it('extraHintsを渡すと各項目を表示する', () => {
    render(
      <StartHintDialog
        {...defaultProps}
        extraHints={[
          { title: '氷を準備', body: '1人前あたり60〜80g' },
          { title: '挽き目', body: 'ホットより少し細かめ' },
        ]}
      />
    );
    expect(screen.getByText('氷を準備')).toBeInTheDocument();
    expect(screen.getByText('1人前あたり60〜80g')).toBeInTheDocument();
    expect(screen.getByText('挽き目')).toBeInTheDocument();
  });

  it('extraHintsを渡さなくても基本ヒントは表示される', () => {
    render(<StartHintDialog {...defaultProps} />);
    expect(screen.getByText('スケールは0に戻さない')).toBeInTheDocument();
    expect(screen.getByText('蒸らし後にタイマー開始')).toBeInTheDocument();
    expect(screen.queryByText('氷を準備')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run components/drip-guide/StartHintDialog.test.tsx`
Expected: FAIL（「ドリップ前のヒント」は現実装でも存在するため一部は通るが、「スケールは0に戻さない」「手順は「次へ」タップで進む」等の新文言テストが失敗する）

- [ ] **Step 3: StartHintDialog を新デザインに書き換える**

`components/drip-guide/StartHintDialog.tsx` 全体を以下に置き換え:

```tsx
'use client';

import React, { useEffect, useCallback } from 'react';
import { AnimatePresence, motion, type MotionProps } from 'framer-motion';
import { ArrowRight, Coffee, HandPointing, Scales, Timer } from 'phosphor-react';
import { Button } from '@/components/ui';

interface StartHintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  totalWaterGram?: number;
  servings?: number;
  recipeName?: string;
  isManualMode?: boolean;
  extraHints?: { title: string; body: string }[];
}

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const dialogMotion: MotionProps = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 12 },
  transition: { type: 'spring', stiffness: 240, damping: 28 },
};

interface HintRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const HintRow: React.FC<HintRowProps> = ({ icon, title, description }) => (
  <div className="flex items-start gap-3.5 py-3.5">
    <span className="mt-0.5 shrink-0 text-ink-muted">{icon}</span>
    <div>
      <p className="text-sm font-bold text-ink">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{description}</p>
    </div>
  </div>
);

export const StartHintDialog: React.FC<StartHintDialogProps> = ({
  isOpen,
  onClose,
  onStart,
  totalWaterGram,
  servings,
  recipeName,
  isManualMode,
  extraHints,
}) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div {...overlayMotion} className="fixed inset-0 z-50 bg-black/55" onClick={onClose} />
          <motion.div
            {...dialogMotion}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <div
              className="w-full max-w-md rounded-[28px] border border-edge bg-overlay p-7 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[11px] font-bold tracking-[0.18em] text-ink-muted">ドリップ前のヒント</p>
              <h3 className="mt-1.5 text-xl font-extrabold text-ink">
                {recipeName ?? '一杯をおいしく淹れるために'}
              </h3>

              {typeof totalWaterGram === 'number' && (
                <div className="mt-5">
                  <p className="font-num text-[56px] font-bold leading-none tracking-tight text-ink tabular-nums">
                    {totalWaterGram}
                    <span className="text-[28px] font-semibold text-spot">g</span>
                  </p>
                  <p className="mt-2 text-xs tracking-[0.08em] text-ink-muted">
                    総湯量{servings ? ` ・ ${servings}人前` : ''}
                  </p>
                </div>
              )}

              <div className="mt-5 h-px bg-edge" />

              <div className="divide-y divide-edge">
                <HintRow
                  icon={<Scales size={20} weight="light" />}
                  title="スケールは0に戻さない"
                  description="表示される湯量は合計量です"
                />
                <HintRow
                  icon={<Timer size={20} weight="light" />}
                  title="蒸らし後にタイマー開始"
                  description="蒸らしのお湯を入れてからスタートします"
                />
                {isManualMode && (
                  <HintRow
                    icon={<HandPointing size={20} weight="light" />}
                    title="手順は「次へ」タップで進む"
                    description="タイマーは経過時間の目安です"
                  />
                )}
                {extraHints?.map((hint) => (
                  <HintRow
                    key={hint.title}
                    icon={<Coffee size={20} weight="light" />}
                    title={hint.title}
                    description={hint.body}
                  />
                ))}
              </div>

              <div className="mt-4 flex gap-2.5">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="!rounded-2xl border border-edge !px-5 !text-sm !font-semibold !text-ink-sub hover:bg-ground"
                >
                  閉じる
                </Button>
                <Button
                  variant="primary"
                  onClick={onStart}
                  className="flex-1 gap-2 !rounded-2xl !text-[15px] active:scale-[0.99] touch-manipulation"
                >
                  ガイド開始
                  <ArrowRight size={16} weight="bold" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
```

設計上のポイント:
- 旧実装にあった `react-icons/gi`（GiCoffeePot）への依存を削除（phosphor-react に統一）
- 旧「今回の総湯量: 160g / 1人前」はビッグナンバーへ昇格
- ヒント行間の罫線は `divide-y divide-edge`（先頭・末尾には引かれない）
- 数字は `font-num tabular-nums`（Task 1 のユーティリティ）

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run components/drip-guide/StartHintDialog.test.tsx`
Expected: PASS（11件すべて）

- [ ] **Step 5: Commit**

```bash
git add components/drip-guide/StartHintDialog.tsx components/drip-guide/StartHintDialog.test.tsx
git commit -m "feat(drip-guide): StartHintDialog をエディトリアル・ミニマルデザインに刷新

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Start46Dialog コンテナの2カラム化＋共通ヘッダー

**Files:**
- Modify: `components/drip-guide/dialogs/46/Dialog46Header.tsx`
- Modify: `components/drip-guide/Start46Dialog.tsx`（return 部分のみ。state・handler は不変）

- [ ] **Step 1: Dialog46Header を共通ヘッダー文法に書き換える**

`components/drip-guide/dialogs/46/Dialog46Header.tsx` 全体を以下に置き換え（Coffee アイコンは廃止）:

```tsx
'use client';

import React from 'react';

export const Dialog46Header: React.FC = () => {
  return (
    <div className="px-7 pt-7">
      <p className="text-[11px] font-bold tracking-[0.18em] text-ink-muted">ドリップ前の設定</p>
      <h3 className="mt-1.5 text-xl font-extrabold text-ink">4:6メソッド（粕谷）</h3>
    </div>
  );
};
```

- [ ] **Step 2: Start46Dialog の import に ArrowRight を追加**

`components/drip-guide/Start46Dialog.tsx` の import 群に追加:

```tsx
import { ArrowRight } from 'phosphor-react';
```

- [ ] **Step 3: Start46Dialog の return 内モーダル本体を差し替える**

`<div className="w-full max-w-2xl rounded-2xl ...">` から `</div>`（フッター閉じまで）を以下に置き換え。`Dialog46Form` / `Dialog46Preview` への props は一切変更しない:

```tsx
<div
  className="w-full max-w-2xl rounded-[28px] border border-edge bg-overlay shadow-2xl my-8"
  onClick={(e) => e.stopPropagation()}
>
  <Dialog46Header />

  <div className="grid gap-7 px-7 pt-5 md:grid-cols-[1.4fr_1fr]">
    <Dialog46Form
      servings={servings}
      taste={taste}
      strength={strength}
      onServingsChange={setServings}
      onTasteChange={setTaste}
      onStrengthChange={setStrength}
      onDescriptionClick={() => setIsDescriptionModalOpen(true)}
    />

    <div className="min-w-0 md:border-l md:border-edge md:pl-7">
      <Dialog46Preview recipe={previewRecipe} />
    </div>
  </div>

  <div className="flex justify-end gap-2.5 px-7 pb-7 pt-6">
    <Button
      variant="ghost"
      onClick={onClose}
      className="!rounded-2xl border border-edge !px-5 !text-sm !font-semibold !text-ink-sub hover:bg-ground"
    >
      閉じる
    </Button>
    <Button
      variant="primary"
      onClick={handleStartGuide}
      className="gap-2 !rounded-2xl !px-7 !text-sm active:scale-[0.99] touch-manipulation"
    >
      ガイド開始
      <ArrowRight size={16} weight="bold" />
    </Button>
  </div>
</div>
```

設計上のポイント:
- 幅広モーダルなのでフッターは右寄せボタンペア（設計書 3.5）
- `md:` 未満では grid が1カラムになり「フォーム → プレビュー」の縦積み
- 右カラムの左罫線は `md:` 以上のみ

- [ ] **Step 4: 型チェック**

Run: `npm run typecheck`
Expected: エラーなし

- [ ] **Step 5: Commit**

```bash
git add components/drip-guide/Start46Dialog.tsx components/drip-guide/dialogs/46/Dialog46Header.tsx
git commit -m "feat(drip-guide): Start46Dialog を2カラムレイアウト＋共通ヘッダーに変更

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Dialog46Form の再構築（解説リンクA案＋セグメントコントロール）

**Files:**
- Modify: `components/drip-guide/dialogs/46/Dialog46Form.tsx`

- [ ] **Step 1: Dialog46Form を書き換える**

全体を以下に置き換え（props インターフェースは不変）:

```tsx
'use client';

import React from 'react';
import { BookOpen, CaretRight } from 'phosphor-react';
import { TASTE_LABELS, STRENGTH_LABELS, type Taste46, type Strength46 } from '@/lib/drip-guide/recipe46';
import { Select } from '@/components/ui';

interface Dialog46FormProps {
  servings: number;
  taste: Taste46;
  strength: Strength46;
  onServingsChange: (servings: number) => void;
  onTasteChange: (taste: Taste46) => void;
  onStrengthChange: (strength: Strength46) => void;
  onDescriptionClick: () => void;
}

const FIELD_LABEL_STYLES = 'mb-2 block text-[11px] font-bold tracking-[0.1em] text-ink-muted';

interface SegmentGroupProps<T extends string> {
  options: T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
}

function SegmentGroup<T extends string>({ options, labels, value, onChange }: SegmentGroupProps<T>) {
  return (
    <div className="flex gap-1 rounded-[14px] border border-edge p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`min-h-[44px] flex-1 whitespace-nowrap rounded-[11px] px-1 text-[13px] transition-colors touch-manipulation ${
            value === option ? 'bg-spot font-bold text-on-spot' : 'font-semibold text-ink-sub hover:bg-ground'
          }`}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

export const Dialog46Form: React.FC<Dialog46FormProps> = ({
  servings,
  taste,
  strength,
  onServingsChange,
  onTasteChange,
  onStrengthChange,
  onDescriptionClick,
}) => {
  return (
    <div className="space-y-4">
      {/* 4:6メソッドの解説を開くリンク行 */}
      <button
        type="button"
        onClick={onDescriptionClick}
        className="flex w-full items-center gap-2.5 rounded-2xl border border-edge px-4 py-3.5 text-left transition-colors hover:bg-ground touch-manipulation"
      >
        <BookOpen size={18} className="shrink-0 text-spot" />
        <span className="flex-1 text-sm font-bold text-ink">4:6メソッドのポイント（必読）</span>
        <CaretRight size={14} className="shrink-0 text-ink-muted" />
      </button>

      {/* 人前選択 */}
      <div>
        <label htmlFor="servings-46" className={FIELD_LABEL_STYLES}>
          人前
        </label>
        <Select
          id="servings-46"
          value={String(servings)}
          onChange={(e) => onServingsChange(parseInt(e.target.value, 10))}
          options={[1, 2, 3, 4, 5, 6, 7, 8].map((s) => ({
            value: String(s),
            label: `${s}人前 (${s * 10}g / ${s * 150}g)`,
          }))}
          className="!rounded-2xl !border !py-3 !text-sm !font-bold cursor-pointer"
          aria-label="人前を選択"
        />
      </div>

      {/* 味わい選択 */}
      <div>
        <p className={FIELD_LABEL_STYLES}>味わい</p>
        <SegmentGroup
          options={['basic', 'sweet', 'bright'] as Taste46[]}
          labels={TASTE_LABELS}
          value={taste}
          onChange={onTasteChange}
        />
      </div>

      {/* 濃度選択 */}
      <div>
        <p className={FIELD_LABEL_STYLES}>濃度</p>
        <SegmentGroup
          options={['light', 'strong2', 'strong3'] as Strength46[]}
          labels={STRENGTH_LABELS}
          value={strength}
          onChange={onStrengthChange}
        />
      </div>
    </div>
  );
};
```

設計上のポイント:
- 解説リンクは設計書 5.2 のA案: 文字はオールink、アイコン（BookOpen）だけ spot 色。部分カラー禁止
- セグメントは外枠 `border-edge` 角丸14px、選択中だけ `bg-spot text-on-spot`。`aria-pressed` で選択状態を支援技術に伝える
- 旧実装の `Button` import は不要になる（`Select` のみ残る）
- 人前の選択肢ラベルは現行文字列を維持（設計書 5.3）
- `TASTE_LABELS` / `STRENGTH_LABELS` の型が `Record<Taste46, string>` / `Record<Strength46, string>` でない場合は、`SegmentGroup` の `labels` 型をそれに合わせて調整する

- [ ] **Step 2: 型チェック**

Run: `npm run typecheck`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add components/drip-guide/dialogs/46/Dialog46Form.tsx
git commit -m "feat(drip-guide): 4:6フォームをセグメントコントロール化・解説リンクを刷新

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Dialog46Preview＋RecipeStepTable の再構築・RecipeSummary 削除

**Files:**
- Modify: `components/drip-guide/dialogs/46/Dialog46Preview.tsx`
- Modify: `components/drip-guide/dialogs/shared/RecipeStepTable.tsx`
- Delete: `components/drip-guide/dialogs/shared/RecipeSummary.tsx`

- [ ] **Step 1: Dialog46Preview を書き換える（RecipeSummary の役割を統合）**

全体を以下に置き換え:

```tsx
'use client';

import React from 'react';
import { DripRecipe } from '@/lib/drip-guide/types';
import { RecipeStepTable } from '../shared/RecipeStepTable';

interface Dialog46PreviewProps {
  recipe: DripRecipe;
}

const formatDuration = (totalSec: number): string => {
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec === 0 ? `約${min}分` : `約${min}分${sec}秒`;
};

export const Dialog46Preview: React.FC<Dialog46PreviewProps> = ({ recipe }) => {
  return (
    <div>
      <p className="font-num text-5xl font-bold leading-none tracking-tight text-ink tabular-nums">
        {recipe.totalWaterGram}
        <span className="text-2xl font-semibold text-spot">g</span>
      </p>
      <p className="mt-2 text-xs tracking-[0.06em] text-ink-muted">
        総湯量 ・ 豆 {recipe.beanAmountGram}g ・ {formatDuration(recipe.totalDurationSec)}
      </p>
      <div className="mt-4">
        <RecipeStepTable steps={recipe.steps} showPourAmount={true} />
      </div>
    </div>
  );
};
```

- [ ] **Step 2: RecipeStepTable をヘアライン罫線スタイルに書き換える**

全体を以下に置き換え（props インターフェース・累計と注湯量の算出ロジックは不変）:

```tsx
'use client';

import React from 'react';
import { DripStep } from '@/lib/drip-guide/types';
import { formatTime } from '@/lib/drip-guide/formatTime';
import { Button } from '@/components/ui';

interface RecipeStepTableProps {
  steps: DripStep[];
  onStepDetailClick?: (stepId: string, stepTitle: string) => void;
  showPourAmount?: boolean;
}

const HEAD_STYLES = 'pb-2 text-[11px] font-bold tracking-[0.1em] text-ink-muted';

export const RecipeStepTable: React.FC<RecipeStepTableProps> = ({
  steps,
  onStepDetailClick,
  showPourAmount = false,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr>
            <th className={`${HEAD_STYLES} text-left`}>時間</th>
            <th className={`${HEAD_STYLES} text-left`}>ステップ</th>
            {showPourAmount && <th className={`${HEAD_STYLES} text-right`}>注湯</th>}
            <th className={`${HEAD_STYLES} text-right`}>累計</th>
            {onStepDetailClick && <th className={`${HEAD_STYLES} text-center`}>詳細</th>}
          </tr>
        </thead>
        <tbody>
          {steps.map((step, index) => {
            const prevTarget = index > 0 ? steps[index - 1].targetTotalWater || 0 : 0;
            const currentTarget = step.targetTotalWater || 0;
            const pourAmount = currentTarget - prevTarget;

            return (
              <tr key={step.id} className="border-t border-edge">
                <td className="py-2.5 pr-2 font-num tabular-nums text-ink-muted">
                  {formatTime(step.startTimeSec)}
                </td>
                <td className="py-2.5 pr-2 font-semibold text-ink">{step.title}</td>
                {showPourAmount && (
                  <td className="py-2.5 pl-2 text-right font-num font-bold tabular-nums text-ink">
                    {pourAmount}g
                  </td>
                )}
                <td className="py-2.5 pl-2 text-right font-num tabular-nums text-ink-muted">
                  {step.targetTotalWater != null ? `${step.targetTotalWater}g` : '-'}
                </td>
                {onStepDetailClick && (
                  <td className="py-2.5 pl-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => onStepDetailClick(step.id, step.title)}
                      className="!min-h-0 !px-1 !py-0.5 !text-xs underline !text-spot hover:!text-spot-hover"
                    >
                      詳細
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
```

- [ ] **Step 3: RecipeSummary を削除し、参照が残っていないことを確認**

```bash
rm components/drip-guide/dialogs/shared/RecipeSummary.tsx
grep -rn "RecipeSummary" components/ app/ lib/ hooks/
```

Expected: grep の出力が空（参照ゼロ）

- [ ] **Step 4: 型チェックと全テスト**

Run: `npm run typecheck && npm run test:run`
Expected: 両方ともエラーなし・全テストPASS

- [ ] **Step 5: Commit**

```bash
git add -A components/drip-guide/dialogs/
git commit -m "feat(drip-guide): 4:6プレビューをビッグナンバー＋罫線テーブルに刷新

RecipeSummary は Dialog46Preview に統合して削除

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: ドキュメント追従と全体検証

**Files:**
- Modify: `docs/steering/FEATURES.md`（301行目付近）

- [ ] **Step 1: FEATURES.md のヒント文言を新文言に更新**

旧（301行目付近）:

```markdown
- `isManualMode: true` のレシピは `StartHintDialog` に「手順はタップで進みます」の説明が表示される
```

新:

```markdown
- `isManualMode: true` のレシピは `StartHintDialog` に「手順は「次へ」タップで進む」の説明が表示される
```

- [ ] **Step 2: ドキュメント整合性チェック**

Run: `npm run docs:check`
Expected: 不整合の指摘なし（指摘が出た場合は現行仕様に合わせて該当ドキュメントを修正する）

- [ ] **Step 3: 検証コマンド一式**

Run: `npm run test:run && npm run typecheck && npm run lint && npm run format:check`
Expected: すべてパス。`format:check` が失敗した場合は `npx prettier --write <対象ファイル>` で修正して再実行

- [ ] **Step 4: ブラウザでの目視確認（chrome-devtools MCP）**

1. `npm run dev` を起動
2. chrome-devtools MCP の `emulate` で iPad 幅（768×1024 目安）を再現
3. `/drip-guide` を開き、4:6以外のレシピ（例: BYSN Standard Drip）の「ガイド開始」をタップ → StartHintDialog のスクリーンショットを撮影し、設計書のM1構成どおりか目視確認
4. アイスフラッシュ（extraHints 3件）でも開いてレイアウト崩れがないこと
5. 4:6メソッドの「ガイド開始」をタップ → Start46Dialog のスクリーンショットを撮影し、2カラム・右寄せフッターを確認。味わい・濃度を切り替えてビッグナンバーとステップ表がライブ更新されること
6. 設定画面からテーマを christmas に切り替え、両モーダルの配色が破綻しないこと
7. スマホ幅（390px 目安）でも StartHintDialog と Start46Dialog（縦積み）を確認

Expected: 文字の不自然な折り返し・色の濁り・タップ困難な要素がないこと

- [ ] **Step 5: Commit**

```bash
git add docs/steering/FEATURES.md
git commit -m "docs(steering): StartHintDialog のヒント文言変更を FEATURES.md に反映

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-Review チェック結果

- **Spec coverage:** 設計書 3章（共通言語）→ Task 1〜5 全体 / 4章（StartHintDialog）→ Task 2 / 5章（Start46Dialog）→ Task 3〜5 / 6章（テスト）→ Task 2 / 7章（検証）→ Task 6。カバー漏れなし
- **Placeholder scan:** TBD・「適切に実装」系の表現なし。全コードブロック完全形
- **Type consistency:** `HintRow` / `SegmentGroup` / `FIELD_LABEL_STYLES` / `HEAD_STYLES` の定義と使用箇所一致。props インターフェースはすべて現行コードと同一
