# スマホホーム クラフトラベル型レイアウト Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スマホ（md未満）のホーム画面を「クラフトラベル型1列リスト」に再設計し、スクロールなしで画面の高さを使い切りつつ、各行を視認しやすくする。

**Architecture:** 既存の `ActionCard` をレスポンシブのまま流用する。JSによる高さ動的計算（`cardHeight` + resize/orientation監視 + CSS変数）を廃止し、CSS flexbox（`flex-1` + `min-h` + `max-h`）で「充填」と「巨大化防止」を両立する。各行に英字ラベルを追加してクラフト感を出す。配色は既存テーマトークンのみで構成し7テーマに追従させる。タブレット・PC（md以上）の4列グリッドは変更しない。

**Tech Stack:** Next.js App Router, React, TypeScript strict, Tailwind CSS v4, Vitest, Testing Library.

設計書: `docs/superpowers/specs/2026-05-30-home-mobile-craft-label-layout-design.md`

---

## File Structure

- **Modify `app/page.tsx`**: `Action` 型と `ACTIONS` に英字 `label` を追加。スマホコンテナを `flex-1` ベースに変更。`cardHeight` の state・`useEffect`・`ActionCard` への受け渡しを削除。
- **Modify `components/home/ActionCard.tsx`**: スマホ行をクラフトラベル型（アイコン＋英字ラベル＋機能名＋シェブロン）に。`label` prop 追加、`cardHeight` prop と CSS変数 `--home-card-height` を削除。`flex-1 / min-h / max-h`（md以上は無効化）。デスクトップカード表示は維持。
- **Modify `app/page.test.tsx`**: 巨大化ガードのテストを新方式（`max-h` 上限クラス + インライン高さ変数なし）に書き換え。英字ラベル表示のテストを追加。

---

## Task 1: 高さ計算をflexboxに置き換える（充填＋巨大化防止）

**Files:**
- Modify: `app/page.test.tsx:74-86`
- Modify: `app/page.tsx`
- Modify: `components/home/ActionCard.tsx`

### 背景

現状はスマホで `--home-card-height`（44〜64px）をJSで計算してインライン適用している。これを廃止し、各行 `flex-1`（充填）＋ `max-h-[112px]`（少数項目時の巨大化防止）＋ `min-h-[56px]`（タップ領域）に置き換える。

- [ ] **Step 1: 巨大化ガードのテストを新方式に書き換える（失敗させる）**

`app/page.test.tsx` の3番目のテスト（`スマホで表示機能が少ない場合もアクションを巨大化させない`、74〜86行目）を以下に置き換える。

```tsx
  it('スマホで表示機能が少ない場合もアクションを巨大化させない', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
    mocks.visibleKeys.clear();
    mocks.visibleKeys.add('settings');

    render(<HomePage />);

    const settingsButton = screen.getByRole('button', { name: 'その他' });
    // flex-1 で伸びるが max-h で頭打ちにして巨大化を防ぐ。旧来のインライン高さ変数は持たない。
    expect(settingsButton.className).toMatch(/max-h-\[112px\]/);
    expect(settingsButton.style.getPropertyValue('--home-card-height')).toBe('');
  });
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npm run test:run -- app/page.test.tsx`
Expected: FAIL（現状の実装は `--home-card-height` を設定し、`max-h-[112px]` クラスを持たないため）

- [ ] **Step 3: `ActionCard` の高さ関連を flexbox 方式に置き換える**

`components/home/ActionCard.tsx` を以下に書き換える（この時点では `label` prop はまだ追加しない。Task 2 で追加）。`cardHeight` prop と `--home-card-height` を削除し、`flex-1 / min-h / max-h` を付与。

```tsx
'use client';

import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import type { IconType } from 'react-icons';
import { BsStars } from 'react-icons/bs';
import { Button } from '@/components/ui';

interface ActionCardProps {
  title: string;
  description: string;
  href: string;
  icon: IconType;
  badge?: string;
  index: number;
}

export function ActionCard({ title, description, href, icon: Icon, badge, index }: ActionCardProps) {
  const router = useRouter();
  const cardStyle = {
    animationDelay: `${index * 60}ms`,
  } as CSSProperties;

  return (
    <Button
      variant="ghost"
      onClick={() => router.push(href)}
      className="group relative flex max-h-[112px] w-full flex-1 flex-row !items-center !justify-start gap-3 !rounded-md border border-edge-strong bg-surface px-3 py-2 text-left text-ink shadow-card transition-all hover:bg-ground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 animate-home-card !min-h-[56px] md:max-h-none md:!min-h-0 md:flex-none md:flex-col md:!justify-center md:gap-3 md:!rounded-2xl md:p-5 md:text-center md:shadow-2xl md:hover:-translate-y-2 md:hover:bg-surface md:hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]"
      style={cardStyle}
      aria-label={title}
    >
      {/* バッジ表示 */}
      {badge && (
        <div className="absolute -top-1 -right-1 z-20 animate-pulse-scale sm:-top-2 sm:-right-2">
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] whitespace-nowrap font-bold text-white shadow-lg ${
              badge === 'NEW' ? 'new-label-gradient' : 'completed-label-gradient'
            } ring-2 ring-white/20 sm:px-3 sm:py-1`}
          >
            <BsStars className="text-[10px]" />
            {badge}
          </span>
        </div>
      )}

      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center self-center text-spot transition-all duration-300 md:h-14 md:w-14">
        <Icon className="relative z-10 h-6 w-6 md:h-11 md:w-11" />
      </span>
      <div className="relative z-10 flex min-w-0 flex-1 items-center md:block md:flex-none md:text-center">
        <p className="truncate leading-none font-bold text-ink transition-colors group-hover:text-spot text-base md:text-lg">
          {title}
        </p>
        <p className="hidden text-xs text-ink-muted transition-colors md:block md:text-sm">{description}</p>
      </div>
      <span aria-hidden="true" className="shrink-0 text-lg leading-none text-ink-muted md:hidden">
        ›
      </span>
    </Button>
  );
}
```

補足: 旧コードにあった `title === 'ハンドピックタイマー'` のフォント分岐は、当該機能が削除済み（PR#463）で `ACTIONS` に存在しないため除去した（デッドコード）。

- [ ] **Step 4: `app/page.tsx` の高さ計算ロジックを削除し、コンテナをflexに変更**

`app/page.tsx` を以下のとおり変更する。

(a) `cardHeight` の state 宣言を削除（115行目）:

```tsx
  const [cardHeight, setCardHeight] = useState<number | null>(null);
```

↑この1行を削除する。

(b) 高さ計算の `useEffect` 全体を削除（164〜204行目、`// スマホレイアウト: 画面高さに応じて...` のコメントから始まるブロック一式）:

```tsx
  // スマホレイアウト: 画面高さに応じてカードの高さを動的に調整
  useEffect(() => {
    const calculateCardHeight = () => {
      // ... （calculateCardHeight 定義、初回計算、resize/orientationchange の登録・解除すべて）
    };
    // ...
    return () => {
      window.removeEventListener('resize', calculateCardHeight);
      window.removeEventListener('orientationchange', calculateCardHeight);
    };
  }, [visibleActions.length]);
```

↑このブロックを丸ごと削除する。

(c) コンテナ `<div>` を以下に置き換える（235〜256行目付近）。`style` 属性を削除し、`gap-1.5` を `gap-2` に、`md:[grid-auto-rows:1fr]` を追加（デスクトップの行高さ均等を維持）。`ActionCard` への `cardHeight` 受け渡しを削除する。

```tsx
        <div className="flex h-full flex-col gap-2 md:grid md:h-auto md:grid-cols-4 md:gap-4 md:[grid-auto-rows:1fr]">
          {visibleActions.map(({ key, title, description, href, icon: DefaultIcon, badge }, index) => {
            const Icon = isChristmasMode ? CHRISTMAS_ICONS[key] || DefaultIcon : DefaultIcon;

            return (
              <ActionCard
                key={key}
                title={title}
                description={description}
                href={href}
                icon={Icon}
                badge={badge}
                index={index}
              />
            );
          })}
        </div>
```

- [ ] **Step 5: テストを実行して合格を確認**

Run: `npm run test:run -- app/page.test.tsx`
Expected: PASS（3テストすべて合格。`max-h-[112px]` クラスが付き、`--home-card-height` は空）

- [ ] **Step 6: コミット**

```bash
git add app/page.tsx components/home/ActionCard.tsx app/page.test.tsx
git commit -m "refactor: ホームのスマホ高さ計算をflexbox（flex-1+max-h）に置換"
```

---

## Task 2: クラフトラベル型（英字ラベル）を追加

**Files:**
- Modify: `app/page.test.tsx`
- Modify: `app/page.tsx`
- Modify: `components/home/ActionCard.tsx`

### 背景

各行に英字ラベル（`ASSIGNMENT / SCHEDULE / TASTING / DEFECTS / PRODUCTION / DRIP GUIDE / MORE`）を機能名の上に表示する。ラベルはスマホ専用（`md:hidden`）、琥珀アクセント（`text-spot`）の小さい大文字・字間広め。

- [ ] **Step 1: 英字ラベル表示のテストを追加（失敗させる）**

`app/page.test.tsx` の `describe('HomePage', ...)` 内に、以下のテストを追加する（既存テストはそのまま残す）。

```tsx
  it('機能名の上に英字ラベルを表示する', () => {
    render(<HomePage />);

    // 英字ラベルが表示される（クラフトラベル型）
    expect(screen.getByText('ASSIGNMENT')).toBeInTheDocument();
    expect(screen.getByText('PRODUCTION')).toBeInTheDocument();
    // アクセシブルネームは機能名のまま（aria-label）であること
    expect(screen.getByRole('button', { name: '担当表' })).toBeInTheDocument();
  });
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npm run test:run -- app/page.test.tsx`
Expected: FAIL（`ASSIGNMENT` 等のテキストがまだ存在しない）

- [ ] **Step 3: `Action` 型と `ACTIONS` に `label` を追加**

`app/page.tsx` の `Action` インターフェースに `label` を追加（28〜35行目付近）:

```tsx
interface Action {
  key: HomeFeatureKey;
  title: string;
  label: string;
  description: string;
  href: string;
  icon: IconType;
  badge?: string;
}
```

`ACTIONS` の各要素に `label` を追加（50〜100行目）。各要素は次の対応で `title` の直後に `label` を加える:

```tsx
const ACTIONS: Action[] = [
  {
    key: 'assignment',
    title: '担当表',
    label: 'ASSIGNMENT',
    description: '公平に担当を割り当て',
    href: '/assignment',
    icon: FaUsers,
  },
  {
    key: 'schedule',
    title: 'スケジュール',
    label: 'SCHEDULE',
    description: '一日の予定を確認',
    href: '/schedule',
    icon: RiCalendarScheduleFill,
  },
  {
    key: 'tasting',
    title: '試飲感想記録',
    label: 'TASTING',
    description: '試飲の感想を記録',
    href: '/tasting',
    icon: FaCoffee,
  },
  {
    key: 'defect-beans',
    title: '欠点豆図鑑',
    label: 'DEFECTS',
    description: '欠点豆の知識を共有',
    href: '/defect-beans',
    icon: RiBookFill,
  },
  {
    key: 'production-record',
    title: '生産記録',
    label: 'PRODUCTION',
    description: '月次の生産実績を記録',
    href: '/production-record',
    icon: MdFactory,
  },
  {
    key: 'drip-guide',
    title: 'ドリップガイド',
    label: 'DRIP GUIDE',
    description: '淹れ方の手順',
    href: '/drip-guide',
    icon: MdCoffeeMaker,
  },
  {
    key: 'settings',
    title: 'その他',
    label: 'MORE',
    description: '設定やアプリ情報など',
    href: '/settings',
    icon: IoSettings,
  },
];
```

- [ ] **Step 4: コンテナの分割代入と `ActionCard` 呼び出しに `label` を追加**

`app/page.tsx` のコンテナ（Task 1 Step 4 で編集した箇所）の分割代入に `label` を加え、`ActionCard` に渡す:

```tsx
          {visibleActions.map(({ key, title, label, description, href, icon: DefaultIcon, badge }, index) => {
            const Icon = isChristmasMode ? CHRISTMAS_ICONS[key] || DefaultIcon : DefaultIcon;

            return (
              <ActionCard
                key={key}
                title={title}
                label={label}
                description={description}
                href={href}
                icon={Icon}
                badge={badge}
                index={index}
              />
            );
          })}
```

- [ ] **Step 5: `ActionCard` に `label` prop とラベル表示を追加**

`components/home/ActionCard.tsx` の props に `label` を追加し、機能名の上にラベルを描画する。

interface と引数:

```tsx
interface ActionCardProps {
  title: string;
  label: string;
  description: string;
  href: string;
  icon: IconType;
  badge?: string;
  index: number;
}

export function ActionCard({ title, label, description, href, icon: Icon, badge, index }: ActionCardProps) {
```

メタ情報の `<div>`（機能名・説明文を含むブロック）を以下に置き換える。スマホでは縦積み（ラベル→機能名）にするため `items-center` を `flex-col justify-center` に変更し、`md:block` でデスクトップ表示を維持:

```tsx
      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center md:block md:flex-none md:text-center">
        <span className="block text-[10px] font-bold uppercase tracking-[0.2em] leading-none text-spot md:hidden">
          {label}
        </span>
        <p className="mt-1 truncate leading-none font-bold text-ink transition-colors group-hover:text-spot text-base md:mt-0 md:text-lg">
          {title}
        </p>
        <p className="hidden text-xs text-ink-muted transition-colors md:block md:text-sm">{description}</p>
      </div>
```

- [ ] **Step 6: テストを実行して合格を確認**

Run: `npm run test:run -- app/page.test.tsx`
Expected: PASS（英字ラベルのテストを含む全テスト合格）

- [ ] **Step 7: コミット**

```bash
git add app/page.tsx components/home/ActionCard.tsx app/page.test.tsx
git commit -m "feat: ホームのスマホ表示をクラフトラベル型（英字ラベル）に変更"
```

---

## Task 3: 検証

**Files:**
- 変更したすべてのファイル。

- [ ] **Step 1: ユニットテスト全体を実行**

Run: `npm run test:run`
Expected: PASS（全テスト合格）

- [ ] **Step 2: ビルド**

Run: `npm run build`
Expected: 成功（型エラー・ビルドエラーなし）

- [ ] **Step 3: フォーマットチェック**

Run: `npm run format:check`
Expected: PASS（CIのFormatジョブで落ちないことを事前確認）

- [ ] **Step 4: 開発サーバーでスマホ表示を目視確認**

Run: `npm run dev`
ブラウザのデバイスエミュレーション（例: 390×844）でホーム（`/`）を確認:
- 7項目が1画面にスクロールなしで収まり、画面の高さを使い切って下部に余白が出ないこと。
- 各行に英字ラベル＋機能名が縦に表示され、崩れないこと。
- 表示項目を1個だけにしても巨大ボタンにならないこと（`max-h` で頭打ち）。
- 設定でテーマを切り替え、ライト系・ダーク系の複数テーマで配色（紙地・枠線・ラベル色）が破綻しないこと。

- [ ] **Step 5: タブレット・PC表示の非退行を確認**

`md` 以上の幅で、4列カードグリッド（上アイコン＋機能名＋説明文＋ホバー演出）が従来どおりで、英字ラベルが表示されないこと。

- [ ] **Step 6: 余分な生成物がステージされていないこと**

`.superpowers/` 配下のブレインストーミング生成物がコミットに含まれていないことを確認する（`.gitignore` に未登録なら追加を検討）。
