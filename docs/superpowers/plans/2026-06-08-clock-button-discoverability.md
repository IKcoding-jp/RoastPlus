# 時計ボタンの発見性改善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ホームヘッダー右上の時計ボタンを「アクセント色の枠線＋『時計』ラベル」の形に変え、気づきやすく・押せると分かるようにする。

**Architecture:** 位置は変えず、`components/home/HomeHeader.tsx` の時計ボタン1か所のみを変更する。アイコン専用の `IconButton`（正方形・`min-w-12`）をやめ、ヘッダーの既存トークン（`--header-accent` / `--header-btn-hover`）で組んだ素の `<button>`（枠線ピル＋ラベル）に置き換える。色は新規追加せず既存トークンを使うため全7テーマに自動追従する。

**Tech Stack:** Next.js (App Router) / React / Tailwind CSS v4（@theme トークン）/ Vitest + Testing Library / react-icons (`HiClock`)

---

## File Structure

- Modify: `components/home/HomeHeader.tsx` — 時計ボタンを枠線ピル＋ラベルへ変更。未使用になる `IconButton` import を削除。
- Test: `components/home/HomeHeader.test.tsx` — 「時計」ラベルが表示されることの検証を追加（既存のボタン存在・アクセシブル名の検証は維持）。

スコープ外（変更しない）: `/clock` ページ、`router.push('/clock')` の遷移先、プライバシーポリシー／利用規約（ページ追加・削除ではないためバージョン更新不要）。

---

## Task 1: 時計ボタンを枠線ピル＋ラベルに変更

**Files:**
- Modify: `components/home/HomeHeader.tsx:50-59`（時計ボタンの `IconButton`）, `components/home/HomeHeader.tsx:6`（`IconButton` の import）
- Test: `components/home/HomeHeader.test.tsx:57-60`（「デジタル時計ボタンを表示する」テスト）

- [ ] **Step 1: 失敗するテストを書く**

`components/home/HomeHeader.test.tsx` の既存テスト「デジタル時計ボタンを表示する」を、可視ラベル「時計」の検証を含む形に置き換える：

```tsx
  it('デジタル時計ボタンを表示する', () => {
    render(<HomeHeader />);
    const button = screen.getByRole('button', { name: 'デジタル時計を表示' });
    expect(button).toBeInTheDocument();
    // 可視ラベル「時計」が表示される（アイコンは aria-hidden のためテキストは「時計」のみ）
    expect(button).toHaveTextContent('時計');
  });
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npx vitest run components/home/HomeHeader.test.tsx`
Expected: 「デジタル時計ボタンを表示する」が FAIL（現状ボタンに「時計」テキストが無いため `toHaveTextContent('時計')` で失敗）。他のテストは PASS。

- [ ] **Step 3: 実装する（ボタンを枠線ピル＋ラベルへ）**

`components/home/HomeHeader.tsx` の時計ボタン（`<IconButton ...>...</IconButton>`）を、次の素の `<button>` に置き換える：

```tsx
          <button
            type="button"
            onClick={() => router.push('/clock')}
            aria-label="デジタル時計を表示"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-header-accent px-3 py-1.5 text-sm font-bold text-header-accent transition-colors hover:bg-header-btn-hover active:scale-95 focus:outline-none focus:ring-2 focus:ring-header-accent/50 focus:ring-offset-2"
          >
            <HiClock className="h-5 w-5" aria-hidden="true" />
            時計
          </button>
```

ポイント:
- `border-header-accent` / `text-header-accent`: アクセント色の枠＋文字（全テーマ追従）。
- `hover:bg-header-btn-hover` ＋ `active:scale-95`: 既存の押下挙動を踏襲。
- `min-h-11`（44px）: iPad のタップ領域を確保。
- `aria-hidden="true"`（アイコン）: 読み上げはラベルに任せる。
- `aria-label="デジタル時計を表示"` 維持: 可視テキスト「時計」を含むため WCAG「Label in Name」を満たす。
- `title` は付けない（可視ラベルと重複するため）。

- [ ] **Step 4: 未使用 import を削除**

`components/home/HomeHeader.tsx:6` の import から `IconButton` を取り除く（このファイルで他に使用していないことを確認した上で）。該当行：

```tsx
import { IconButton } from '@/components/ui';
```

この行を削除する。`HiClock` の import（`import { HiClock } from 'react-icons/hi';`）は引き続き使うので残す。

- [ ] **Step 5: テストを実行して通過を確認**

Run: `npx vitest run components/home/HomeHeader.test.tsx`
Expected: 3テストすべて PASS。

- [ ] **Step 6: Lint と整形チェック**

Run: `npm run lint`
Expected: エラーなし（未使用 import が残っていれば lint で検出されるので、その場合は Step 4 を見直す）。

Run: `npm run format:check`
Expected: 対象ファイルが整形済み（Pass）。失敗したら `npx prettier --write components/home/HomeHeader.tsx components/home/HomeHeader.test.tsx` を実行して再チェック。

- [ ] **Step 7: コミット**

> 注: プロジェクト方針により、コミットはユーザーの明示依頼がある場合のみ実行する。依頼が無ければこのステップは飛ばし、変更はワークツリーに残す。

```bash
git add components/home/HomeHeader.tsx components/home/HomeHeader.test.tsx
git commit -m "feat: ホームの時計ボタンを枠線ラベル付きにして発見性を改善"
```

---

## 完了確認（手動）

- [ ] `npm run dev` でホーム画面を開き、ヘッダー右上が「枠（アクセント色）＋時計アイコン＋『時計』」になっている。
- [ ] ボタンを押すと `/clock` に遷移する。
- [ ] テーマを切り替えても枠・文字色がそのテーマのアクセント色に追従する。
- [ ] ボタンにフォーカスリングが出る（キーボード操作）。

---

## 補足: クラスが効かない場合のフォールバック

`border-header-accent` や `focus:ring-header-accent/50` が Tailwind で生成されず枠線色が付かない場合は、枠線色のみインラインスタイルにフォールバックする：

```tsx
            style={{ borderColor: 'var(--header-accent)' }}
```

（`text-header-accent` と `bg-header-btn-hover` は既存コードで使用実績があるため、まずはクラスで動く想定。）
