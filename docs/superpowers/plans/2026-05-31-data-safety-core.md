# データ安全コア 実装計画（テーマA / rank1+2+3+4）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 現場の入力データが「オフラインでも消えず・失敗したら見え・通信断が分かり・例外で白画面にならない」状態にする。

**Architecture:** 既存の #458 防止ロジックは温存し、上に安全機能を追加的に重ねる。危険度の低い純追加（白画面防止・バナー）から始め、Firestore初期化変更、最後に最重要ファイル `useAppData` の再throw化を行う。再throw化の前に全 fire-and-forget 呼び出し元を安全化する。

**Tech Stack:** Next.js 16 App Router / React 19 / TypeScript strict / Firebase Firestore (modular SDK) / Vitest / Testing Library

**関連仕様:** `docs/superpowers/specs/2026-05-31-data-safety-core-design.md`

---

## ファイル構成

**新規作成:**
- `app/global-error.tsx` — ルートレイアウト例外の最終防壁（白画面防止）
- `app/error.tsx` — 各ルート例外の復旧UI
- `hooks/useOnlineStatus.ts` — `navigator.onLine` 購読フック
- `hooks/useOnlineStatus.test.ts` — 上記のテスト
- `components/OfflineBanner.tsx` — オフライン常設バナー

**変更:**
- `lib/firebase.ts` — Firestoreオフライン永続化（initializeFirestore + persistentLocalCache、3ガード付き）
- `app/layout.tsx` — `OfflineBanner` を配置
- `hooks/useScheduleOCR.ts` — `updateData` を await＋失敗時トースト、prop型を `Promise<void>` 化
- `hooks/useNotifications.ts` — add/update/delete を try/catch＋失敗トースト、移行の `void` を `.catch` 化
- `hooks/useHomeFeatureVisibility.ts` — 3箇所の `updateData` に `.catch` 追加
- `hooks/useAppData.ts` — `updateData` の catch で `throw saveError`（再throw）
- `hooks/useAppData.test.ts` — 保存失敗時に reject することを検証するテストへ更新

**実装順序（安全な順）:** Task 1（白画面防止）→ Task 2（バナー）→ Task 3（永続化）→ Task 4（呼び出し元の事前安全化）→ Task 5（再throw）→ Task 6（統合検証）。

**ブランチ:** `main` に直接コミットしない。実装前に `feat/data-safety-core`（または対応Issue番号付き）を切る。

---

### Task 1: 白画面防止（rank4）

**Files:**
- Create: `app/global-error.tsx`
- Create: `app/error.tsx`

純追加のため自動テストは設けず、`npm run build` 成功と手動確認で検証する。

- [ ] **Step 1: `app/global-error.tsx` を作成**

global-error はルートレイアウトを置き換えるため `html`/`body` を含み、`globals.css` に依存せずインラインスタイルで完結させる。

```tsx
'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif',
          background: '#f7f7f5',
          color: '#261a14',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>一時的な問題が発生しました</h1>
        <p style={{ fontSize: '14px', margin: 0, opacity: 0.8 }}>
          お手数ですが、再読み込みしてください。入力中のデータは保存されている場合があります。
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            minHeight: '44px',
            padding: '0 20px',
            borderRadius: '12px',
            border: 'none',
            background: '#e48003',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          再読み込み
        </button>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: `app/error.tsx` を作成**

各ルートの例外を受ける復旧UI。`globals.css` が読まれているのでトークンクラスを使う。

```tsx
'use client';

import Link from 'next/link';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-page">
      <h1 className="text-xl font-bold text-ink">一時的な問題が発生しました</h1>
      <p className="text-sm text-ink-sub">
        お手数ですが、再読み込みしてください。入力中のデータは保存されている場合があります。
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="min-h-[44px] px-5 rounded-xl bg-btn-primary text-white text-[15px] font-semibold"
        >
          再読み込み
        </button>
        <Link
          href="/"
          className="min-h-[44px] px-5 rounded-xl border border-edge text-ink text-[15px] font-semibold flex items-center"
        >
          ホームへ
        </Link>
      </div>
    </div>
  );
}
```

> 注: `text-ink-sub` / `bg-btn-primary` / `border-edge` は `app/globals.css` のトークン。存在しないクラスがあれば `app/globals.css` で定義済みの近いトークン（`text-ink` 等）に合わせる。可能なら共通 `Button` コンポーネントに置き換えてもよい（既存の import 慣習に合わせる）。

- [ ] **Step 3: ビルドで検証**

Run: `npm run build`
Expected: 成功（`app/error.tsx` と `app/global-error.tsx` がルートに認識される）。

- [ ] **Step 4: 手動確認（任意）**

`app/error.tsx` の先頭に一時的に `throw new Error('test')` を入れて `npm run dev` で復旧UIが出ることを確認 → 確認後に削除。

- [ ] **Step 5: コミット**

```bash
git add app/global-error.tsx app/error.tsx
git commit -m "feat: 例外時の白画面を復旧UIに置き換える(global-error/error)"
```

---

### Task 2: オフライン検知フックとバナー（rank3）

**Files:**
- Create: `hooks/useOnlineStatus.ts`
- Test: `hooks/useOnlineStatus.test.ts`
- Create: `components/OfflineBanner.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: 失敗するテストを書く**

`hooks/useOnlineStatus.test.ts`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

afterEach(() => {
  setOnline(true);
});

describe('useOnlineStatus', () => {
  it('navigator.onLine の初期値を返す', () => {
    setOnline(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('online/offline イベントで値が切り替わる', () => {
    setOnline(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npm run test:run -- hooks/useOnlineStatus.test.ts`
Expected: FAIL（`useOnlineStatus` が存在しない）。

- [ ] **Step 3: フックを実装**

`hooks/useOnlineStatus.ts`:

```ts
'use client';

import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

// SSR/ビルド時はオンライン扱い（バナー非表示）にする
function getServerSnapshot(): boolean {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npm run test:run -- hooks/useOnlineStatus.test.ts`
Expected: PASS（2件）。

- [ ] **Step 5: バナーコンポーネントを作成**

`components/OfflineBanner.tsx`:

```tsx
'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[60] bg-warning text-page text-center text-sm font-medium py-1.5 px-4"
    >
      オフライン：変更は接続が戻ったときに保存されます
    </div>
  );
}
```

> 注: `bg-warning text-page` は既存 `Button` の warning 変種と同じ配色慣習。コントラスト改善（監査 rank9）は別スコープ。

- [ ] **Step 6: `app/layout.tsx` にバナーを配置**

`import { OfflineBanner } from '@/components/OfflineBanner';` を追加し、`ToastProvider` 直下、`children` の前に置く。

変更前（69行付近）:
```tsx
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
```
変更後:
```tsx
        <ThemeProvider>
          <ToastProvider>
            <OfflineBanner />
            {children}
          </ToastProvider>
        </ThemeProvider>
```

- [ ] **Step 7: ビルドと全テストで検証**

Run: `npm run test:run -- hooks/useOnlineStatus.test.ts` → PASS
Run: `npm run build` → 成功

- [ ] **Step 8: コミット**

```bash
git add hooks/useOnlineStatus.ts hooks/useOnlineStatus.test.ts components/OfflineBanner.tsx app/layout.tsx
git commit -m "feat: オフライン検知フックと常設バナーを追加"
```

---

### Task 3: Firestoreオフライン永続化（rank2）

**Files:**
- Modify: `lib/firebase.ts`

- [ ] **Step 1: import を追加**

`lib/firebase.ts` の4行目を以下に変更（`initializeFirestore` / `persistentLocalCache` / `persistentMultipleTabManager` / 型 `Firestore` を追加）:

```ts
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
```

- [ ] **Step 2: 永続化付き初期化関数を追加し、`getFirestore(app)` を置き換える**

27行目 `const firestoreInstance = getFirestore(app);` を以下に置き換える:

```ts
function createFirestore(): Firestore {
  const useEmulator = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR === 'true';

  // ブラウザ以外（ビルド/SSR）、またはエミュレータ接続時はオフライン永続化を使わない
  if (typeof window === 'undefined' || useEmulator) {
    return getFirestore(app);
  }

  try {
    // IndexedDB にオフライン永続化。複数タブでも安全なマネージャを使用
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (error) {
    // IndexedDB 不可・二重初期化などのフォールバック（機能は落とさない）
    console.warn('Firestore offline persistence unavailable, using memory cache:', error);
    return getFirestore(app);
  }
}

const firestoreInstance = createFirestore();
```

> 注: `initializeFirestore` は他のFirestoreアクセスより前に呼ぶ必要があるが、`lib/firebase.ts` が唯一の初期化点でモジュール読込時に1回だけ実行されるため順序は保証される。エミュレータ接続（44-54行）は従来どおりこの後に行われる。

- [ ] **Step 3: 型チェックとビルドで検証**

Run: `npm run typecheck`
Expected: エラーなし。

Run: `npm run build`
Expected: 成功（ブラウザ限定ガードでビルド時はメモリキャッシュ）。

- [ ] **Step 4: 全ユニットテストで回帰確認**

Run: `npm run test:run`
Expected: 既存テストが全てPASS（firestore はテストでモックされるため影響なし）。

- [ ] **Step 5: 手動確認（推奨）**

`npm run dev` → DevTools の Application > IndexedDB に `firestore` 系DBが作られることを確認。Network を Offline にして本日のスケジュールを編集 → 入力が残り、Online 復帰で同期されることを確認。

- [ ] **Step 6: コミット**

```bash
git add lib/firebase.ts
git commit -m "feat: Firestoreオフライン永続化を有効化(ブラウザ限定・エミュレータ時無効)"
```

---

### Task 4: 呼び出し元の事前安全化（再throw化の前提）

再throw化（Task 5）の前に、`updateData` を await していない／エラー処理していない呼び出し元を安全化する。これにより未処理のPromiseRejectionを防ぐ。

**Files:**
- Modify: `hooks/useScheduleOCR.ts`
- Modify: `hooks/useNotifications.ts`
- Modify: `hooks/useHomeFeatureVisibility.ts`

- [ ] **Step 1: `useScheduleOCR.ts` の prop 型を `Promise<void>` に変更**

8行目:
```ts
  updateData: (data: AppData) => void;
```
を:
```ts
  updateData: (data: AppData) => Promise<void>;
```

- [ ] **Step 2: `handleOCRSuccess` を async 化し、保存を内部ヘルパーで await＋失敗トーストにする**

`replace`/`add` 各分岐の `updatedTodaySchedules`/`updatedRoastSchedules` はブロックスコープの `const` なので、分岐後の単一 try/catch からは参照できない。型を知らなくても安全に書けるよう、保存処理を `AppData` を受け取る内部ヘルパー `persist` に切り出し、各分岐の末尾でそれを `await` する。

具体的には:
1. コールバックを `async` にする（14行目 `(mode, timeLabels, roastSchedules) =>` の前に `async` を付ける）。
2. `if (!data) return;` の直後に内部ヘルパーを定義:

```tsx
      const persist = async (next: AppData) => {
        try {
          await updateData(next);
          showToast('スケジュールを読み取りました。', 'success');
        } catch (error) {
          console.error('Failed to save OCR schedule:', error);
          showToast('スケジュールの保存に失敗しました。通信を確認してもう一度お試しください。', 'error');
        }
      };
```

3. `replace` 分岐末尾（現43-47行）の `updateData({...})` を `await persist({...})` に変更:

```tsx
        await persist({
          ...data,
          todaySchedules: updatedTodaySchedules,
          roastSchedules: updatedRoastSchedules,
        });
```

4. `add` 分岐末尾（現87-91行）の `updateData({...})` も同様に `await persist({...})` に変更。
5. 分岐の外にある成功トースト（現94行 `showToast('スケジュールを読み取りました。', 'success');`）は `persist` 内へ移したので**削除**する。

依存配列 `[data, selectedDate, updateData, showToast]` は変更不要。

> 実装メモ: マージ計算ロジック（19-92行の `updatedTodaySchedules`/`updatedRoastSchedules` 構築）は一切変更しない。変更は「保存呼び出しを `await persist(...)` に置換」「分岐外の成功トーストを削除」のみ。`handleOCRSuccess` を呼ぶOCRモーダルは戻り値を await しないため、内部で catch して未処理Rejectionを防ぐ。

- [ ] **Step 3: `useNotifications.ts` に Toast を導入し、保存系を try/catch 化**

3行目付近に import を追加:
```ts
import { useToastContext } from '@/components/Toast';
```
`useNotifications` 本体先頭（10行目付近）に追加:
```ts
  const { showToast } = useToastContext();
```

移行処理の61行目 `void updateData({...})` を `.catch` 付きに変更:
```ts
            updateData({
              ...currentData,
              notifications: newNotifications,
            }).catch((error) => {
              console.error('Failed to migrate notifications:', error);
            });
```

`addNotification`（100-113行）、`updateNotification`（116-125行）、`deleteNotification`（128-145行）の各 `await updateData({...})` を try/catch で囲み、失敗時にトーストを出す。例（addNotification）:
```ts
      try {
        await updateData({
          ...data,
          notifications: updatedNotifications,
        });
      } catch (error) {
        console.error('Failed to save notification:', error);
        showToast('通知の保存に失敗しました。通信を確認してもう一度お試しください。', 'error');
      }
```
`updateNotification` / `deleteNotification` も同じ形で `await updateData({...})` を try/catch にし、同じエラートーストを出す。各 useCallback の依存配列に `showToast` を追加する。

> これにより通知ページ側（`app/notifications/page.tsx:97,123,146,204,206`）の fire-and-forget 呼び出しはフック内で安全化され、ページ変更は不要。

- [ ] **Step 4: `useHomeFeatureVisibility.ts` の3箇所に `.catch` を追加**

46行目（移行）、64行目（updateFeatureHidden）、78行目（resetVisibility）の `updateData((currentData) => ({...}))` の末尾に `.catch` を付ける。例:
```ts
      updateData((currentData: AppData) => ({
        ...currentData,
        userSettings: {
          ...currentData.userSettings,
          homeHiddenFeatureKeys: nextKeys,
        },
      })).catch((error) => {
        console.error('Failed to save home feature visibility:', error);
      });
```
3箇所すべて同様に `.catch((error) => { console.error('Failed to save home feature visibility:', error); })` を付ける（ホーム表示設定はローカル state を既に更新済みのため、失敗はログのみで可）。

- [ ] **Step 5: 型チェックと全テストで検証**

Run: `npm run typecheck` → エラーなし（特に `useScheduleOCR` の prop 型変更が `app/schedule/page.tsx` の呼び出しと整合することを確認。実 `updateData` は `Promise<void>` を返すため整合する）。
Run: `npm run test:run` → 既存テスト全てPASS。

- [ ] **Step 6: コミット**

```bash
git add hooks/useScheduleOCR.ts hooks/useNotifications.ts hooks/useHomeFeatureVisibility.ts
git commit -m "fix: updateDataの再throw化に備え呼び出し元のエラー処理を整備"
```

---

### Task 5: updateData の保存失敗を再throw（rank1）

**Files:**
- Modify: `hooks/useAppData.ts:279-301`
- Test: `hooks/useAppData.test.ts:491-519`

- [ ] **Step 1: 既存テストを「reject する」検証に更新（Red）**

`hooks/useAppData.test.ts` の `describe('updateData - リカバリエラーハンドリング', ...)`（491-519行）を以下に置き換える。保存失敗時に `updateData` が reject し、巻き戻し（getUserData）も呼ばれることを検証する。

```ts
  describe('updateData - リカバリエラーハンドリング', () => {
    it('保存失敗時に updateData が reject し、エラーがログされる', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const saveError = new Error('Save failed');
      mockSaveUserData.mockRejectedValue(saveError);

      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      await act(async () => {
        await expect(
          result.current.updateData({ ...mockUserData, encouragementCount: 10 })
        ).rejects.toThrow('Save failed');
        await vi.runAllTimersAsync();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save data:', saveError);
      consoleErrorSpy.mockRestore();
    });

    it('保存失敗後の再取得も失敗した場合、両方のエラーがログされ reject する', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const saveError = new Error('Save failed');
      const recoveryError = new Error('Recovery also failed');
      mockSaveUserData.mockRejectedValue(saveError);

      const { result } = renderHook(() => useAppData());

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      mockGetUserData.mockRejectedValue(recoveryError);

      await act(async () => {
        await expect(
          result.current.updateData({ ...mockUserData, encouragementCount: 10 })
        ).rejects.toThrow('Save failed');
        await vi.runAllTimersAsync();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save data:', saveError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to recover data:', recoveryError);
      consoleErrorSpy.mockRestore();
    });
  });
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npm run test:run -- hooks/useAppData.test.ts`
Expected: FAIL（現状の `updateData` は reject しないため `.rejects.toThrow` が失敗する）。

- [ ] **Step 3: `updateData` の catch 末尾で再throw する（Green）**

`hooks/useAppData.ts` の catch ブロック（279-292行）末尾、巻き戻しの `getUserData(...).then/catch` の後に `throw saveError;` を追加する。

変更後の catch（279行〜）:
```ts
      } catch (error) {
        saveError = error;
        console.error('Failed to save data:', error);
        lockedKeysRef.current.clear();
        pendingSaveCountRef.current = 0;
        isUpdatingRef.current = false;

        getUserData(user.uid)
          .then((freshData) => {
            commitData(freshData);
          })
          .catch((err) => {
            console.error('Failed to recover data:', err);
          });

        throw saveError;
      } finally {
```

> `finally`（293-301行）はそのまま。`throw` は `finally` 実行後に伝播する。

- [ ] **Step 4: テストを実行して成功を確認**

Run: `npm run test:run -- hooks/useAppData.test.ts`
Expected: PASS（更新した2件を含む）。

- [ ] **Step 5: 全テストで回帰確認**

Run: `npm run test:run`
Expected: 全PASS（Task 4 で呼び出し元を安全化済みのため、他テストに未処理Rejectionが出ない）。

- [ ] **Step 6: コミット**

```bash
git add hooks/useAppData.ts hooks/useAppData.test.ts
git commit -m "fix: updateDataの保存失敗を再throwし全機能のエラー通知を有効化"
```

---

### Task 6: 統合検証

**Files:** なし（検証のみ）

- [ ] **Step 1: 全ユニットテスト**

Run: `npm run test:run`
Expected: 全PASS。

- [ ] **Step 2: 型チェック・Lint・フォーマット**

Run: `npm run typecheck` → エラーなし
Run: `npm run lint` → エラー・warningゼロ
Run: `npm run format:check` → 差分なし（あれば `npm run format` 実行後に再コミット）

- [ ] **Step 3: 本番ビルド**

Run: `npm run build`
Expected: 成功。

- [ ] **Step 4: 手動オフライン検証（実機/ブラウザ）**

`npm run dev` で以下を確認:
1. DevTools Network = Offline → 上部にオフラインバナーが出る。本日のスケジュール/通知を編集 → 入力が残る。
2. Network = Online に戻す → 入力がFirestoreへ同期され、再読み込みしても残る。
3. 保存失敗の擬似（例: 一時的に Firestore Rules を拒否、または DevTools で Firestore リクエストをブロック）→ エラートーストが出て、嘘の成功トーストが出ない。
4. 試飲の新規セッション保存が失敗するケースで、一覧へ遷移せずフォームに留まりエラーが出る。
5. `app/error.tsx` に一時的な `throw` を入れて復旧UIが出る（確認後に削除）。

- [ ] **Step 5: 受け入れ条件の確認**

`docs/superpowers/specs/2026-05-31-data-safety-core-design.md` の「8. 受け入れ条件」を1項目ずつ確認し、未達があれば該当 Task に戻る。

- [ ] **Step 6: ブランチ完成処理**

`superpowers:finishing-a-development-branch` に従い、PR作成またはマージ方針をユーザーに確認する（コミット・push・PR作成はユーザーの明示依頼後）。
