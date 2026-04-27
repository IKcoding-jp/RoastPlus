# スケジュールページ UIデザイン改善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スケジュールページの「今日の日付がオレンジでダサい」「空状態の表示がダサい」を解消する。

**Architecture:** `EmptyScheduleState` 共通コンポーネントを新規作成し、`TodaySchedule` と `RoastSchedulerTab` の重複した空状態UIを置換。`page.tsx` で今日の日付に「TODAY」バッジを追加し、`onCamera` コールバックを各子コンポーネントに渡す。

**Tech Stack:** Next.js 16 / React 19 / TypeScript 5 / Tailwind CSS v4 / react-icons/hi / Vitest / @testing-library/react

---

## ファイル構成

| 種別 | パス | 役割 |
|---|---|---|
| 新規作成 | `components/schedule/EmptyScheduleState.tsx` | 共通空状態UIコンポーネント |
| 新規作成 | `components/schedule/EmptyScheduleState.test.tsx` | 上記のユニットテスト |
| 修正 | `components/TodaySchedule.tsx` | onCamera prop追加 + EmptyScheduleState使用 |
| 修正 | `components/RoastSchedulerTab.tsx` | onCamera prop追加 + EmptyScheduleState使用 |
| 修正 | `app/schedule/page.tsx` | TODAYバッジ + onCamera prop渡し |

---

## Task 1: EmptyScheduleState コンポーネントとテストを作成する

**Files:**
- Create: `components/schedule/EmptyScheduleState.tsx`
- Create: `components/schedule/EmptyScheduleState.test.tsx`

- [ ] **Step 1: テストファイルを作成する（Red）**

`components/schedule/EmptyScheduleState.test.tsx` を作成:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyScheduleState } from './EmptyScheduleState';

describe('EmptyScheduleState', () => {
  it('message が表示される', () => {
    render(<EmptyScheduleState icon="clock" message="今日はまだありません" />);
    expect(screen.getByText('今日はまだありません')).toBeInTheDocument();
  });

  it('デフォルトのサブメッセージが表示される', () => {
    render(<EmptyScheduleState icon="clock" message="test" />);
    expect(screen.getByText('カメラで読み取るか、追加してください')).toBeInTheDocument();
  });

  it('カスタム subMessage が表示される', () => {
    render(<EmptyScheduleState icon="clock" message="test" subMessage="カスタムメッセージ" />);
    expect(screen.getByText('カスタムメッセージ')).toBeInTheDocument();
  });

  it('onCamera が渡されたとき「読み取る」ボタンが表示されクリックで呼ばれる', () => {
    const onCamera = vi.fn();
    render(<EmptyScheduleState icon="clock" message="test" onCamera={onCamera} />);
    const btn = screen.getByRole('button', { name: /読み取る/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onCamera).toHaveBeenCalledOnce();
  });

  it('onCamera が渡されないとき「読み取る」ボタンが表示されない', () => {
    render(<EmptyScheduleState icon="clock" message="test" />);
    expect(screen.queryByRole('button', { name: /読み取る/i })).not.toBeInTheDocument();
  });

  it('onAdd が渡されたとき追加ボタンが表示されクリックで呼ばれる', () => {
    const onAdd = vi.fn();
    render(<EmptyScheduleState icon="calendar" message="test" onAdd={onAdd} addLabel="スケジュールを追加" />);
    const btn = screen.getByRole('button', { name: /スケジュールを追加/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('onAdd が渡されないとき追加ボタンが表示されない', () => {
    render(<EmptyScheduleState icon="clock" message="test" />);
    expect(screen.queryByRole('button', { name: /手動追加/i })).not.toBeInTheDocument();
  });

  it('addLabel のデフォルト値は「手動追加」', () => {
    const onAdd = vi.fn();
    render(<EmptyScheduleState icon="clock" message="test" onAdd={onAdd} />);
    expect(screen.getByRole('button', { name: /手動追加/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する（ファイルが存在しないため）**

```bash
npx vitest run components/schedule/EmptyScheduleState.test.tsx
```

期待: エラー `Cannot find module './EmptyScheduleState'`

- [ ] **Step 3: EmptyScheduleState コンポーネントを実装する**

`components/schedule/EmptyScheduleState.tsx` を作成:

```tsx
'use client';

import { HiCamera, HiPlus } from 'react-icons/hi';
import { Button } from '@/components/ui';

interface EmptyScheduleStateProps {
  icon: 'clock' | 'calendar';
  message: string;
  subMessage?: string;
  onCamera?: () => void;
  onAdd?: () => void;
  addLabel?: string;
}

export function EmptyScheduleState({
  icon,
  message,
  subMessage = 'カメラで読み取るか、追加してください',
  onCamera,
  onAdd,
  addLabel = '手動追加',
}: EmptyScheduleStateProps) {
  return (
    <div className="text-center py-4">
      {icon === 'clock' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="w-12 h-12 text-ink-muted opacity-25 mx-auto mb-4"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="w-12 h-12 text-ink-muted opacity-25 mx-auto mb-4"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )}
      <p className="text-sm font-semibold text-ink mb-1">{message}</p>
      <p className="text-xs text-ink-muted mb-5">{subMessage}</p>
      {(onCamera || onAdd) && (
        <div className="flex gap-2 justify-center flex-wrap">
          {onCamera && (
            <Button variant="primary" size="sm" onClick={onCamera} className="gap-1.5">
              <HiCamera className="w-3.5 h-3.5" />
              読み取る
            </Button>
          )}
          {onAdd && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAdd}
              className="gap-1.5 !text-ink hover:!bg-ground"
            >
              <HiPlus className="w-3.5 h-3.5" />
              {addLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
npx vitest run components/schedule/EmptyScheduleState.test.tsx
```

期待: 全8件 PASS

- [ ] **Step 5: コミットする**

```bash
git add components/schedule/EmptyScheduleState.tsx components/schedule/EmptyScheduleState.test.tsx
git commit -m "feat: EmptyScheduleState 共通コンポーネントを追加"
```

---

## Task 2: TodaySchedule.tsx を修正する

**Files:**
- Modify: `components/TodaySchedule.tsx`

- [ ] **Step 1: props インターフェースと内部型に `onCamera` を追加する**

`TodayScheduleProps`（12〜17行目）と `TodayScheduleInnerProps`（19〜21行目）を変更:

```tsx
// 変更前
interface TodayScheduleProps {
  data: AppData | null;
  onUpdate: (data: AppData) => void;
  selectedDate: string;
  isToday: boolean;
}

interface TodayScheduleInnerProps extends TodayScheduleProps {
  currentSchedule: TodayScheduleType;
}
```

```tsx
// 変更後
interface TodayScheduleProps {
  data: AppData | null;
  onUpdate: (data: AppData) => void;
  selectedDate: string;
  isToday: boolean;
  onCamera?: () => void;
}

interface TodayScheduleInnerProps extends TodayScheduleProps {
  currentSchedule: TodayScheduleType;
}
```

- [ ] **Step 2: `TodayScheduleInner` の引数に `onCamera` を追加する**

39行目の関数シグネチャを変更:

```tsx
// 変更前
function TodayScheduleInner({ data, onUpdate, selectedDate, currentSchedule }: TodayScheduleInnerProps) {
```

```tsx
// 変更後
function TodayScheduleInner({ data, onUpdate, selectedDate, currentSchedule, onCamera }: TodayScheduleInnerProps) {
```

- [ ] **Step 3: 空状態 UI を EmptyScheduleState に置換する**

133〜153行目の空状態ブロックを置換:

```tsx
// 変更前
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0">
```

この `if (localTimeLabels.length === 0)` の true ブランチ（133〜153行目）を置換:

```tsx
// 変更前
      {localTimeLabels.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Card variant="guide" className="max-w-xs mx-auto">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-header-bg flex items-center justify-center shadow-md">
                <HiClock className="h-7 w-7 text-white" />
              </div>
            </div>
            <p className="text-base font-semibold text-ink mb-3">時間ラベルがありません</p>
            <div className="space-y-2.5 text-sm text-ink-muted text-left">
              <div className="flex items-center gap-2.5">
                <HiCamera className="h-4 w-4 flex-shrink-0" />
                <span>画像からAIで読み取る</span>
              </div>
              <div className="flex items-center gap-2.5">
                <HiPlusCircle className="h-4 w-4 flex-shrink-0" />
                <span>手動で時間を追加する</span>
              </div>
            </div>
          </Card>
        </div>
```

```tsx
// 変更後
      {localTimeLabels.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyScheduleState
            icon="clock"
            message="今日のスケジュールはまだありません"
            onCamera={onCamera}
          />
        </div>
```

- [ ] **Step 4: 不要になった import を削除し、EmptyScheduleState を追加する**

ファイル先頭のimportを変更:

```tsx
// 変更前
import { HiClock, HiUser, HiArrowDown, HiCamera, HiPlusCircle } from 'react-icons/hi';
// ...
import { Card } from '@/components/ui';
```

```tsx
// 変更後
import { HiUser, HiArrowDown } from 'react-icons/hi';
// ...（Card の import を削除）
import { EmptyScheduleState } from '@/components/schedule/EmptyScheduleState';
```

- [ ] **Step 5: ビルドエラーがないことを確認する**

```bash
npm run build 2>&1 | tail -20
```

期待: `✓ Compiled successfully` または `Route (app)` の出力でエラーなし

- [ ] **Step 6: コミットする**

```bash
git add components/TodaySchedule.tsx
git commit -m "refactor: TodaySchedule の空状態を EmptyScheduleState に置換"
```

---

## Task 3: RoastSchedulerTab.tsx を修正する

**Files:**
- Modify: `components/RoastSchedulerTab.tsx`

- [ ] **Step 1: props インターフェースに `onCamera` を追加する**

11〜16行目の `RoastSchedulerTabProps` を変更:

```tsx
// 変更前
interface RoastSchedulerTabProps {
  data: AppData | null;
  onUpdate: (data: AppData) => void;
  selectedDate: string;
  isToday: boolean;
}
```

```tsx
// 変更後
interface RoastSchedulerTabProps {
  data: AppData | null;
  onUpdate: (data: AppData) => void;
  selectedDate: string;
  isToday: boolean;
  onCamera?: () => void;
}
```

- [ ] **Step 2: 関数引数に `onCamera` を追加する**

18行目を変更:

```tsx
// 変更前
export function RoastSchedulerTab({ data, onUpdate, selectedDate, isToday: _isToday }: RoastSchedulerTabProps) {
```

```tsx
// 変更後
export function RoastSchedulerTab({ data, onUpdate, selectedDate, isToday: _isToday, onCamera }: RoastSchedulerTabProps) {
```

- [ ] **Step 3: 空状態 UI を EmptyScheduleState に置換する**

293〜313行目の空状態ブロックを置換:

```tsx
// 変更前
        <div className="flex-1 flex items-center justify-center">
          <Card variant="guide" className="max-w-xs mx-auto">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-header-bg flex items-center justify-center shadow-md">
                <HiCalendar className="h-7 w-7 text-white" />
              </div>
            </div>
            <p className="text-base font-semibold text-ink mb-3">スケジュールがありません</p>
            <div className="space-y-2.5 text-sm text-ink-muted text-left">
              <div className="flex items-center gap-2.5">
                <HiCamera className="h-4 w-4 flex-shrink-0" />
                <span>画像からAIで読み取る</span>
              </div>
              <div className="flex items-center gap-2.5">
                <HiPlus className="h-4 w-4 flex-shrink-0" />
                <span>手動でスケジュールを追加する</span>
              </div>
            </div>
          </Card>
        </div>
```

```tsx
// 変更後
        <div className="flex-1 flex items-center justify-center">
          <EmptyScheduleState
            icon="calendar"
            message="ローストスケジュールはまだありません"
            onCamera={onCamera}
            onAdd={handleAdd}
            addLabel="スケジュールを追加"
          />
        </div>
```

- [ ] **Step 4: 不要になった import を削除し、EmptyScheduleState を追加する**

7行目を変更:

```tsx
// 変更前
import { HiPlus, HiCalendar, HiCamera } from 'react-icons/hi';
import { RoastScheduleMemoDialog } from './RoastScheduleMemoDialog';
import { ScheduleCard } from './roast-scheduler/ScheduleCard';
import { Button, Card } from '@/components/ui';
```

```tsx
// 変更後
import { HiPlus } from 'react-icons/hi';
import { RoastScheduleMemoDialog } from './RoastScheduleMemoDialog';
import { ScheduleCard } from './roast-scheduler/ScheduleCard';
import { Button } from '@/components/ui';
import { EmptyScheduleState } from '@/components/schedule/EmptyScheduleState';
```

- [ ] **Step 5: ビルドエラーがないことを確認する**

```bash
npm run build 2>&1 | tail -20
```

期待: エラーなし

- [ ] **Step 6: コミットする**

```bash
git add components/RoastSchedulerTab.tsx
git commit -m "refactor: RoastSchedulerTab の空状態を EmptyScheduleState に置換"
```

---

## Task 4: page.tsx を修正する（TODAY バッジ + onCamera prop 渡し）

**Files:**
- Modify: `app/schedule/page.tsx`

- [ ] **Step 1: モバイル版の日付表示に TODAY バッジを追加する**

58〜91行目のモバイル日付ナビ内、日付ボタン部分（69〜80行目）を変更:

```tsx
// 変更前
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDatePickerOpen(true)}
            aria-label="日付を選択"
            className="!min-h-0 !px-1 !py-1"
          >
            <span className={`text-base font-bold tracking-tight font-sans whitespace-nowrap leading-tight ${isToday ? 'text-spot' : 'text-ink'}`}>
              {formatDateString(selectedDate)}
            </span>
          </Button>
```

```tsx
// 変更後
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDatePickerOpen(true)}
            aria-label="日付を選択"
            className="!min-h-0 !px-1 !py-1"
          >
            <span className="text-base font-bold tracking-tight font-sans whitespace-nowrap leading-tight text-ink">
              {formatDateString(selectedDate)}
            </span>
            {isToday && (
              <span className="text-[9px] font-bold tracking-wider text-white bg-header-bg rounded-full px-[7px] py-[2px] leading-none ml-1">
                TODAY
              </span>
            )}
          </Button>
```

- [ ] **Step 2: デスクトップ版の日付表示に TODAY バッジを追加する**

108〜119行目のデスクトップ日付ナビ内の日付ボタン部分を変更:

```tsx
// 変更前
              <Button
                variant="ghost"
                size="md"
                onClick={() => setIsDatePickerOpen(true)}
                aria-label="日付を選択"
                className="gap-2 md:gap-2.5"
              >
                <HiCalendar className="h-5 w-5 md:h-6 md:w-6 flex-shrink-0 text-spot" />
                <span className={`text-base md:text-lg font-bold tracking-tight font-sans whitespace-nowrap leading-tight ${isToday ? 'text-spot' : 'text-ink'}`}>
                  {formatDateString(selectedDate)}
                </span>
              </Button>
```

```tsx
// 変更後
              <Button
                variant="ghost"
                size="md"
                onClick={() => setIsDatePickerOpen(true)}
                aria-label="日付を選択"
                className="gap-2 md:gap-2.5"
              >
                <HiCalendar className="h-5 w-5 md:h-6 md:w-6 flex-shrink-0 text-spot" />
                <span className="text-base md:text-lg font-bold tracking-tight font-sans whitespace-nowrap leading-tight text-ink">
                  {formatDateString(selectedDate)}
                </span>
                {isToday && (
                  <span className="text-[9px] font-bold tracking-wider text-white bg-header-bg rounded-full px-[7px] py-[2px] leading-none">
                    TODAY
                  </span>
                )}
              </Button>
```

- [ ] **Step 3: モバイル版 TodaySchedule に `onCamera` を渡す**

182〜184行目（モバイル TabsContent 内）を変更:

```tsx
// 変更前
              <TodaySchedule key={selectedDate} data={data} onUpdate={updateData} selectedDate={selectedDate} isToday={isToday}  />
```

```tsx
// 変更後
              <TodaySchedule key={selectedDate} data={data} onUpdate={updateData} selectedDate={selectedDate} isToday={isToday} onCamera={() => setIsOCROpen(true)} />
```

- [ ] **Step 4: モバイル版 RoastSchedulerTab に `onCamera` を渡す**

185〜187行目を変更:

```tsx
// 変更前
              <RoastSchedulerTab data={data} onUpdate={updateData} selectedDate={selectedDate} isToday={isToday}  />
```

```tsx
// 変更後
              <RoastSchedulerTab data={data} onUpdate={updateData} selectedDate={selectedDate} isToday={isToday} onCamera={() => setIsOCROpen(true)} />
```

- [ ] **Step 5: デスクトップ版 TodaySchedule に `onCamera` を渡す**

192〜194行目（デスクトップ grid 内）を変更:

```tsx
// 変更前
              <TodaySchedule key={selectedDate} data={data} onUpdate={updateData} selectedDate={selectedDate} isToday={isToday}  />
```

```tsx
// 変更後
              <TodaySchedule key={selectedDate} data={data} onUpdate={updateData} selectedDate={selectedDate} isToday={isToday} onCamera={() => setIsOCROpen(true)} />
```

- [ ] **Step 6: デスクトップ版 RoastSchedulerTab に `onCamera` を渡す**

195〜197行目を変更:

```tsx
// 変更前
              <RoastSchedulerTab data={data} onUpdate={updateData} selectedDate={selectedDate} isToday={isToday}  />
```

```tsx
// 変更後
              <RoastSchedulerTab data={data} onUpdate={updateData} selectedDate={selectedDate} isToday={isToday} onCamera={() => setIsOCROpen(true)} />
```

- [ ] **Step 7: コミットする**

```bash
git add app/schedule/page.tsx
git commit -m "feat: スケジュールページに TODAY バッジ追加・onCamera prop を子コンポーネントへ渡す"
```

---

## Task 5: 最終検証

**Files:** なし（検証のみ）

- [ ] **Step 1: ビルドとユニットテストを一括実行する**

```bash
npm run build && npm run test:run
```

期待:
- `✓ Compiled successfully`
- 全テスト PASS（既存テストの回帰なし）

- [ ] **Step 2: 失敗があれば修正してリトライする**

lintエラーの場合:
```bash
npm run lint -- --fix
```

型エラーが出た場合は該当ファイルを確認し修正してから Step 1 を再実行する。

- [ ] **Step 3: 問題なければ最終コミット確認**

```bash
git log --oneline -5
```

期待: Task 1〜4 の4コミットが積み上がっている

---

## 受け入れ基準チェックリスト

- [ ] 今日の日付に「TODAY」バッジが表示され、文字色がオレンジでなくなっている
- [ ] 今日以外の日付では「TODAY」バッジが表示されない
- [ ] `TodaySchedule` の空状態で新UIが表示される
- [ ] `RoastSchedulerTab` の空状態で新UIが表示される
- [ ] 空状態の「読み取る」ボタンを押すと OCR モーダルが開く
- [ ] 空状態の「スケジュールを追加」ボタン（RoastScheduler のみ）を押すと追加ダイアログが開く
- [ ] 絵文字が使われていない
- [ ] `npm run build && npm run test:run` が通る
