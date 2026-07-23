# 誰でも新規アカウント作成可能にする Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** RoastPlus に誰でも使えるサインアップ機能を追加し、在庫データ（inventory）をアカウント単位に分離して、新規登録者が他人のデータに触れられない状態にする。

**Architecture:** Firebase Auth の `createUserWithEmailAndPassword` を使った薄いサインアップ機能を `lib/auth.ts` / `app/signup/page.tsx` に追加する。同時に唯一の共有 Firestore コレクションだった `inventory/{itemId}` を `users/{userId}/inventory/{itemId}` に構造変更し、既存の担当表・生産記録と同じ owner isolation パターンに統一する。

**Tech Stack:** Next.js (App Router) / React / TypeScript / Firebase Auth・Firestore / Vitest / `@firebase/rules-unit-testing`

## Global Constraints

- コメント・UI文言・コミットメッセージは日本語（プロジェクト規約）。
- Firestore の保存・購読は必ず `lib/firestore/` 経由。ページ・コンポーネントから Firestore SDK を直接呼ばない。
- 業務データの保存・購読エラーは黙って握りつぶさない（`console.error` のみで終わらせない）。既存の `subscribeInventoryItems` の `onError` コールバック連携パターンをそのまま踏襲する（変更しない）。
- `firestore.rules` を変更したら `tests/rules/firebase.rules.test.ts` を更新し `npm run test:rules` で検証する（Java 21+ 必須）。
- `app/` 配下にページを追加したら `data/legal/privacy-policy.ts` / `data/legal/terms.ts` / `lib/consent.ts` のバージョンを更新し `lib/consent.test.ts` を合わせる。
- コード変更後は最低限 `npm run typecheck` / `npm run lint` / `npm run test:run` を通す。
- UIに変化があるため、最終タスクで chrome-devtools MCP による iPad 幅のスクリーンショット確認を行う。
- 参照スペック: `docs/superpowers/specs/2026-07-24-public-signup-design.md`

---

### Task 1: `lib/auth.ts` にサインアップ関数を追加

**Files:**
- Modify: `lib/auth.ts`
- Test: `lib/auth.test.ts`

**Interfaces:**
- Produces: `signUpWithEmail(email: string, password: string): Promise<void>` — Firebase Auth でメール＋パスワードのアカウントを新規作成する。既存の `useAuth()` の `onAuthStateChanged` リスナーが自動で新しい `user` を検知するため、この関数自体はサインイン状態の更新を行わない。

- [ ] **Step 1: 失敗するテストを書く**

`lib/auth.test.ts` の既存 `vi.mock('firebase/auth', ...)` に `createUserWithEmailAndPassword` のモックを追加し、ファイル末尾に以下の `describe` を追加する。

```ts
// vi.mock('firebase/auth', () => ({ ... })) の中身を以下に置き換える
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, next: (user: User | null) => void, error?: (error: unknown) => void) => {
    listeners.next = next;
    listeners.error = error ?? null;
    return listeners.unsubscribe;
  },
  signOut: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
}));
```

```ts
// ファイル末尾に追加
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { signUpWithEmail } from './auth';

describe('signUpWithEmail', () => {
  it('createUserWithEmailAndPassword を呼び出す', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({} as never);

    await signUpWithEmail('new@example.com', 'password123');

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'new@example.com', 'password123');
  });

  it('失敗時はエラーをそのままthrowする', async () => {
    const authError = { code: 'auth/email-already-in-use' };
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValue(authError);

    await expect(signUpWithEmail('dup@example.com', 'password123')).rejects.toEqual(authError);
  });
});
```

（`import { createUserWithEmailAndPassword } from 'firebase/auth';` と `import { signUpWithEmail } from './auth';` はファイル冒頭の既存 import 群に合流させ、末尾に追加した `describe` ブロックだけを新規追加する形にする。）

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm run test:run -- lib/auth.test.ts`
Expected: FAIL（`signUpWithEmail` が存在しない、または `createUserWithEmailAndPassword` が未エクスポートでエラー）

- [ ] **Step 3: 最小実装を書く**

`lib/auth.ts` の import 文を以下のように変更する（`onAuthStateChanged`, `signOut as firebaseSignOut` に加えて `createUserWithEmailAndPassword` を追加）。

```ts
import { User, onAuthStateChanged, signOut as firebaseSignOut, createUserWithEmailAndPassword } from 'firebase/auth';
```

`export async function signOut()` の直前に以下を追加する。

```ts
/** メールアドレス＋パスワードで新規アカウントを作成する。 */
export async function signUpWithEmail(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(auth, email, password);
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm run test:run -- lib/auth.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add lib/auth.ts lib/auth.test.ts
git commit -m "$(cat <<'EOF'
feat: メール+パスワードでのサインアップ関数を追加

EOF
)"
```

---

### Task 2: サインアップ画面 `app/signup/page.tsx` を新設

**Files:**
- Create: `app/signup/page.tsx`
- Test: `app/signup/page.test.tsx`

**Interfaces:**
- Consumes: `signUpWithEmail(email: string, password: string): Promise<void>`（Task 1）、`getSafeReturnUrl(rawReturnUrl: string | null, fallback: string): string`（既存 `lib/returnUrl.ts`）、`Input` / `Button`（既存 `components/ui`）

- [ ] **Step 1: 失敗するテストを書く**

`app/login/page.test.tsx` と同じ構成で `app/signup/page.test.tsx` を新規作成する。

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import SignupPage from './page';

const mocks = vi.hoisted(() => ({
  signUpWithEmail: vi.fn(),
  push: vi.fn(),
  getSearchParam: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  signUpWithEmail: mocks.signUpWithEmail,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => ({ get: mocks.getSearchParam }),
}));

vi.mock('@/lib/returnUrl', () => ({
  getSafeReturnUrl: (_url: string | null, fallback: string) => fallback,
}));

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSearchParam.mockReturnValue(null);
  });

  it('サインアップフォームが表示される', async () => {
    render(<SignupPage />);
    expect(await screen.findByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'アカウントを作成' })).toBeInTheDocument();
  });

  it('登録成功時にホームへリダイレクトする', async () => {
    mocks.signUpWithEmail.mockResolvedValue(undefined);
    render(<SignupPage />);

    fireEvent.change(await screen.findByLabelText('メールアドレス'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'アカウントを作成' }));

    await waitFor(() => {
      expect(mocks.signUpWithEmail).toHaveBeenCalledWith('new@example.com', 'password123');
      expect(mocks.push).toHaveBeenCalledWith('/');
    });
  });

  it('登録済みメールアドレスの場合エラーメッセージを表示する', async () => {
    mocks.signUpWithEmail.mockRejectedValue({ code: 'auth/email-already-in-use' });
    render(<SignupPage />);

    fireEvent.change(await screen.findByLabelText('メールアドレス'), {
      target: { value: 'dup@example.com' },
    });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'アカウントを作成' }));

    await waitFor(() => {
      expect(screen.getByText('このメールアドレスは既に使用されています')).toBeInTheDocument();
    });
  });

  it('パスワードが弱い場合エラーメッセージを表示する', async () => {
    mocks.signUpWithEmail.mockRejectedValue({ code: 'auth/weak-password' });
    render(<SignupPage />);

    fireEvent.change(await screen.findByLabelText('メールアドレス'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'アカウントを作成' }));

    await waitFor(() => {
      expect(screen.getByText('パスワードは6文字以上で入力してください')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm run test:run -- app/signup/page.test.tsx`
Expected: FAIL（`app/signup/page` が存在しない）

- [ ] **Step 3: 最小実装を書く**

`app/signup/page.tsx` を新規作成する。

```tsx
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signUpWithEmail } from '@/lib/auth';
import { Loading } from '@/components/Loading';
import { Input, Button } from '@/components/ui';
import { getSafeReturnUrl } from '@/lib/returnUrl';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signUpWithEmail(email, password);
      const redirectUrl = getSafeReturnUrl(searchParams.get('returnUrl'), '/');
      router.push(redirectUrl);
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      const errorCode = errorObj.code;
      let errorMessage = 'エラーが発生しました';

      switch (errorCode) {
        case 'auth/invalid-email':
          errorMessage = 'メールアドレスの形式が正しくありません';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'このメールアドレスは既に使用されています';
          break;
        case 'auth/weak-password':
          errorMessage = 'パスワードは6文字以上で入力してください';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'ネットワークエラーが発生しました';
          break;
        default:
          errorMessage = errorObj.message || 'エラーが発生しました';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-md rounded-lg bg-surface p-8 shadow-md border border-edge">
        <div className="mb-8 flex flex-col items-center rounded-xl bg-[#3a261d] py-6 shadow-inner">
          <h1 className="text-4xl font-bold tracking-tight text-header-text font-[var(--font-playfair)]">
            Roast<span className="text-header-accent">Plus</span>
          </h1>
        </div>

        <p className="mb-6 text-center text-sm text-ink-sub">新しいアカウントを作成します。</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="メールアドレス"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@example.com"
            required
          />

          <Input
            label="パスワード"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6文字以上"
            required
            minLength={6}
            showPasswordToggle
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={loading} loading={loading} fullWidth>
            アカウントを作成
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-sub">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/login" className="text-header-accent underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-page px-4">
          <div className="w-full max-w-md rounded-lg bg-surface p-8 shadow-md border border-edge">
            <h1 className="mb-8 text-center text-2xl font-bold text-ink">RoastPlus</h1>
            <Loading fullScreen={false} />
          </div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm run test:run -- app/signup/page.test.tsx`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add app/signup/page.tsx app/signup/page.test.tsx
git commit -m "$(cat <<'EOF'
feat: サインアップ画面を追加

EOF
)"
```

---

### Task 3: ログイン画面の文言修正とサインアップ導線の追加

**Files:**
- Modify: `app/login/page.tsx:99` 付近
- Test: `app/login/page.test.tsx`

**Interfaces:**
- Consumes: `app/signup`（Task 2）へのリンク

- [ ] **Step 1: 失敗するテストを書く**

`app/login/page.test.tsx` の1件目のテストを以下のように拡張する（既存の `'ログインフォームが表示される'` テストを置き換える）。

```tsx
it('ログインフォームとサインアップ導線が表示される', async () => {
  render(<LoginPage />);
  expect(await screen.findByLabelText('メールアドレス')).toBeInTheDocument();
  expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'アカウントを作成' })).toHaveAttribute('href', '/signup');
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm run test:run -- app/login/page.test.tsx`
Expected: FAIL（`アカウントを作成` のリンクが見つからない）

- [ ] **Step 3: 実装を変更する**

`app/login/page.tsx` の先頭 import に `Link` を追加する。

```tsx
import Link from 'next/link';
```

99行目の文言を書き換える。

```tsx
<p className="mb-6 text-center text-sm text-ink-sub">メールアドレスでログインしてください。</p>
```

送信ボタン（128〜130行目）の直後、`</form>` の外側に以下を追加する。

```tsx
        </form>

        <p className="mt-6 text-center text-sm text-ink-sub">
          アカウントをお持ちでない方は{' '}
          <Link href="/signup" className="text-header-accent underline">
            アカウントを作成
          </Link>
        </p>
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm run test:run -- app/login/page.test.tsx`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add app/login/page.tsx app/login/page.test.tsx
git commit -m "$(cat <<'EOF'
feat: ログイン画面にサインアップ導線を追加し文言を修正

共有アカウント前提の文言を、個人アカウント前提に修正した。

EOF
)"
```

---

### Task 4: `firestore.rules` の inventory をアカウント単位に変更

**Files:**
- Modify: `firestore.rules:146-152`
- Test: `tests/rules/firebase.rules.test.ts:475-494`

**Interfaces:**
- Produces: `users/{userId}/inventory/{itemId}` パスへの `isOwner(userId)` ルール（Task 5 の `lib/firestore/inventory.ts` 変更がこのパスに依存する）

- [ ] **Step 1: 失敗するテストを書く**

`tests/rules/firebase.rules.test.ts` の475〜494行目にある既存の `describe('inventory', ...)` ブロックを、以下の内容に置き換える（旧ルート直下は拒否・新しい `users/{uid}/inventory` は owner isolation を検証）。

```ts
  describe('inventory (legacy root path)', () => {
    it('denies all access to the old root-level inventory collection', async () => {
      const item = { name: 'ドリップ袋', status: 'low' };
      await assertFails(firestoreFor(OWN_UID).doc('inventory/item_1').get());
      await assertFails(firestoreFor(OWN_UID).doc('inventory/item_1').set(item));
      await assertFails(firestoreFor().doc('inventory/item_1').get());
    });
  });

  describe('users/{uid}/inventory/{itemId}', () => {
    it('allows only the signed-in owner to read and write their inventory items', async () => {
      const item = { name: 'ドリップ袋', status: 'low' };
      const path = `users/${OWN_UID}/inventory/item_1`;
      const ownerDoc = firestoreFor(OWN_UID).doc(path);
      const otherDoc = firestoreFor(OTHER_UID).doc(path);
      const anonymousDoc = firestoreFor().doc(path);

      await assertFails(anonymousDoc.get());
      await assertFails(anonymousDoc.set(item));

      await assertSucceeds(ownerDoc.set(item));
      await assertSucceeds(ownerDoc.get());

      await assertFails(otherDoc.get());
      await assertFails(otherDoc.set(item));
    });
  });
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm run test:rules`
Expected: FAIL（現状の `firestore.rules` では旧 `inventory/item_1` への読み書きが成功してしまい、新しい `users/{uid}/inventory/item_1` への読み書きが拒否される）

- [ ] **Step 3: `firestore.rules` を変更する**

146〜152行目を以下に置き換える。

```
    // 在庫・不足品（旧: チーム共有・シングルテナント前提のルート直下コレクション）
    // ポートフォリオ公開に伴い誰でもサインアップ可能になったため、
    // 他の廃止済みルート直下コレクション（teams/members等）と同様に無効化した。
    // 実際のアクセス許可は下記「在庫・不足品（ユーザー配下）」を参照。
    match /inventory/{itemId} {
      allow read, write: if false;
    }
```

184〜211行目付近の「担当表機能（ユーザー配下）」ブロック内、`match /users/{userId}/pairExclusions/{exclusionId}` の直後に以下を追加する。

```
    // 在庫・不足品（ユーザー配下）: アカウントごとに分離
    match /users/{userId}/inventory/{itemId} {
      allow read, write: if isOwner(userId);
    }
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm run test:rules`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add firestore.rules tests/rules/firebase.rules.test.ts
git commit -m "$(cat <<'EOF'
feat: inventory をアカウント単位のFirestore構造に変更

誰でもサインアップ可能にするため、唯一の共有コレクションだった
inventory を users/{userId}/inventory に移し、他のデータと同じ
owner isolation に統一した。

EOF
)"
```

---

### Task 5: `lib/firestore/inventory.ts` を userId 対応にする

**Files:**
- Modify: `lib/firestore/inventory.ts`
- Modify: `lib/firestore/inventory.test.ts`

**Interfaces:**
- Consumes: `getUserDocRef(userId: string)`（既存 `lib/firestore/common.ts`）
- Produces:
  - `subscribeInventoryItems(userId: string, callback: (items: InventoryItem[]) => void, onError?: (error: Error) => void): Unsubscribe`
  - `addInventoryItem(userId: string, input: InventoryItemInput): Promise<void>`
  - `updateInventoryItem(userId: string, id: string, input: InventoryItemInput): Promise<void>`
  - `setInventoryItemStatus(userId: string, id: string, status: InventoryItem['status']): Promise<void>`
  - `deleteInventoryItem(userId: string, id: string): Promise<void>`

- [ ] **Step 1: 失敗するテストを書く**

`lib/firestore/inventory.test.ts` を以下の内容に置き換える（`getUserDocRef` のモックを追加し、全呼び出しに `userId` を渡す）。

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAddDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockServerTimestamp = vi.fn(() => 'SERVER_TS');

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ __type: 'collection' })),
  doc: vi.fn(() => ({ __type: 'doc' })),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(() => ({ __type: 'orderBy' })),
  query: vi.fn(() => ({ __type: 'query' })),
}));

vi.mock('./common', () => ({
  getDb: vi.fn(() => ({ __type: 'db' })),
  getUserDocRef: vi.fn((userId: string) => ({ __type: 'userDoc', userId })),
}));

import { collection } from 'firebase/firestore';
import { getUserDocRef } from './common';
import { addInventoryItem, updateInventoryItem, setInventoryItemStatus, deleteInventoryItem } from './inventory';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('addInventoryItem', () => {
  it('userId の inventory サブコレクションに正規化した入力を addDoc する', async () => {
    await addInventoryItem('user-1', { name: ' ドリップ袋 ', status: 'low' });

    expect(getUserDocRef).toHaveBeenCalledWith('user-1');
    expect(collection).toHaveBeenCalledWith({ __type: 'userDoc', userId: 'user-1' }, 'inventory');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const saved = mockAddDoc.mock.calls[0][1];
    expect(saved).toMatchObject({
      name: 'ドリップ袋',
      status: 'low',
      createdAt: 'SERVER_TS',
      updatedAt: 'SERVER_TS',
    });
  });
});

describe('updateInventoryItem', () => {
  it('正規化した入力に updatedAt を付けて merge で setDoc する', async () => {
    await updateInventoryItem('user-1', 'item-1', { name: ' ドリップ袋 ', status: 'low' });
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, payload, options] = mockSetDoc.mock.calls[0];
    expect(payload).toMatchObject({ name: 'ドリップ袋', status: 'low', updatedAt: 'SERVER_TS' });
    expect(options).toEqual({ merge: true });
  });
});

describe('setInventoryItemStatus', () => {
  it('status と updatedAt を merge で更新する', async () => {
    await setInventoryItemStatus('user-1', 'item-1', 'out');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, payload, options] = mockSetDoc.mock.calls[0];
    expect(payload).toMatchObject({ status: 'out', updatedAt: 'SERVER_TS' });
    expect(options).toEqual({ merge: true });
  });
});

describe('deleteInventoryItem', () => {
  it('deleteDoc を呼ぶ', async () => {
    await deleteInventoryItem('user-1', 'item-1');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm run test:run -- lib/firestore/inventory.test.ts`
Expected: FAIL（現状の関数は `userId` 引数を受け取らない・`getUserDocRef` を使っていない）

- [ ] **Step 3: 実装を変更する**

`lib/firestore/inventory.ts` を以下のように書き換える。

```ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { getUserDocRef } from './common';
import { buildInventoryItemInput, normalizeInventoryStatus } from '@/lib/inventory';
import type { InventoryItem, InventoryItemInput } from '@/types';

function getInventoryCollectionRef(userId: string) {
  return collection(getUserDocRef(userId), 'inventory');
}

function normalizeInventoryItem(id: string, data: DocumentData): InventoryItem {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    status: normalizeInventoryStatus(data.status),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribeInventoryItems(
  userId: string,
  callback: (items: InventoryItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const itemsQuery = query(getInventoryCollectionRef(userId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    itemsQuery,
    (snapshot) => {
      // serverTimestamps: 'estimate' … 書き込み確定前の serverTimestamp を null にせず
      // ローカル推定時刻で埋める。これで状態変更直後に「最終更新」の日付が一瞬消えて
      // 再表示される（チラつく）のを防ぐ。推定と確定の差は表示の分単位では変わらない。
      callback(
        snapshot.docs.map((itemDoc) =>
          normalizeInventoryItem(itemDoc.id, itemDoc.data({ serverTimestamps: 'estimate' }))
        )
      );
    },
    (error) => {
      console.error('Failed to subscribe inventory items:', error);
      onError?.(error);
      callback([]);
    }
  );
}

/** 新規品目を追加（自動ID）。 */
export async function addInventoryItem(userId: string, input: InventoryItemInput): Promise<void> {
  const normalized = buildInventoryItemInput(input);
  await addDoc(getInventoryCollectionRef(userId), {
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** 既存品目の内容を更新（merge）。createdAt は触らない。 */
export async function updateInventoryItem(
  userId: string,
  id: string,
  input: InventoryItemInput
): Promise<void> {
  const normalized = buildInventoryItemInput(input);
  await setDoc(
    doc(getInventoryCollectionRef(userId), id),
    { ...normalized, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/** ステータスだけを1タップ変更（merge）。 */
export async function setInventoryItemStatus(
  userId: string,
  id: string,
  status: InventoryItem['status']
): Promise<void> {
  await setDoc(
    doc(getInventoryCollectionRef(userId), id),
    { status: normalizeInventoryStatus(status), updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function deleteInventoryItem(userId: string, id: string): Promise<void> {
  await deleteDoc(doc(getInventoryCollectionRef(userId), id));
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm run test:run -- lib/firestore/inventory.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add lib/firestore/inventory.ts lib/firestore/inventory.test.ts
git commit -m "$(cat <<'EOF'
refactor: inventory をユーザー配下のFirestoreパスに変更

EOF
)"
```

---

### Task 6: `hooks/useInventory.ts` を userId 対応にする

**Files:**
- Modify: `hooks/useInventory.ts`
- Modify: `hooks/useInventory.test.ts`

**Interfaces:**
- Consumes: `subscribeInventoryItems(userId: string, callback, onError?)`（Task 5）
- Produces: `useInventory(userId: string | null): { items: InventoryItem[]; isLoading: boolean }` — `userId` が `null` の間は購読を開始せず `items: []` / `isLoading: false` を返す。

- [ ] **Step 1: 失敗するテストを書く**

`hooks/useInventory.test.ts` を以下の内容に置き換える。

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockSubscribe = vi.fn();
vi.mock('@/lib/firestore', () => ({
  subscribeInventoryItems: (...args: unknown[]) => mockSubscribe(...args),
}));

import { useInventory } from './useInventory';
import type { InventoryItem } from '@/types';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useInventory', () => {
  it('userId が確定していれば購読し、callbackで受け取った items を返す', async () => {
    const sample: InventoryItem[] = [{ id: 'a', name: 'ドリップ袋', status: 'low' }];
    let captured: ((items: InventoryItem[]) => void) | undefined;
    mockSubscribe.mockImplementation((_userId: string, cb: (items: InventoryItem[]) => void) => {
      captured = cb;
      return () => {};
    });

    const { result } = renderHook(() => useInventory('user-1'));
    expect(mockSubscribe).toHaveBeenCalledWith('user-1', expect.any(Function), expect.any(Function));
    expect(result.current.isLoading).toBe(true);

    act(() => {
      captured?.(sample);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.items).toEqual(sample);
    });
  });

  it('userId が null の間は購読せず空配列を返す', () => {
    const { result } = renderHook(() => useInventory(null));

    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(result.current).toEqual({ items: [], isLoading: false });
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm run test:run -- hooks/useInventory.test.ts`
Expected: FAIL（現状の `useInventory()` は引数を取らず常に購読する）

- [ ] **Step 3: 実装を変更する**

`hooks/useInventory.ts` を以下の内容に置き換える。

```ts
'use client';

import { useEffect, useState } from 'react';
import { subscribeInventoryItems } from '@/lib/firestore';
import type { InventoryItem } from '@/types';

/**
 * `users/{userId}/inventory` をリアルタイム購読するフック。
 * @param userId 未確定（未ログイン判定前）の間は null を渡す。null の間は購読しない。
 * @returns { items, isLoading }
 */
export function useInventory(userId: string | null): { items: InventoryItem[]; isLoading: boolean } {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- 購読開始のローディング同期に必要
    setIsLoading(true);
    const unsubscribe = subscribeInventoryItems(
      userId,
      (next) => {
        setItems(next);
        setIsLoading(false);
      },
      (error) => {
        console.error('Failed to subscribe inventory items:', error);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  return { items, isLoading };
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm run test:run -- hooks/useInventory.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add hooks/useInventory.ts hooks/useInventory.test.ts
git commit -m "$(cat <<'EOF'
refactor: useInventory を userId 対応にする

EOF
)"
```

---

### Task 7: `app/inventory/page.tsx` の呼び出し側を userId 対応にする

**Files:**
- Modify: `app/inventory/page.tsx`
- Modify: `app/inventory/page.test.tsx`

**Interfaces:**
- Consumes: `useInventory(userId: string | null)`（Task 6）、`addInventoryItem(userId, input)` / `updateInventoryItem(userId, id, input)` / `setInventoryItemStatus(userId, id, status)` / `deleteInventoryItem(userId, id)`（Task 5）

- [ ] **Step 1: 失敗するテストを書く**

`app/inventory/page.test.tsx` の以下2箇所を変更する。

1〜32行目の mock 部分で `mockUseInventory` の呼び出しに引数が渡ることを確認できるよう、`vi.mock('@/hooks/useInventory', ...)` はそのままでよい（`mockUseInventory` は引数を無視して返り値を返すモックのため変更不要）。

87〜105行目の削除テストを以下に置き換える（`deleteInventoryItem` が `userId` 付きで呼ばれることを検証する）。

```tsx
  it('(D) 削除ボタンは即削除せず確認ダイアログを挟み、確定で削除する', async () => {
    const items: InventoryItem[] = [{ id: 'a', name: 'ドリップ袋', status: 'enough' }];
    mockUseInventory.mockReturnValue({ items, isLoading: false });
    render(<InventoryPage />);

    // 削除ボタン（アイコンボタン）押下では即時に削除されない
    fireEvent.click(screen.getByRole('button', { name: 'ドリップ袋を削除' }));
    expect(deleteInventoryItem).not.toHaveBeenCalled();

    // 確認ダイアログが表示される
    expect(screen.getByText('品目を削除しますか？')).toBeInTheDocument();

    // ダイアログの確定ボタン「削除」で初めて削除される。
    fireEvent.click(screen.getByRole('button', { name: '削除' }));
    await waitFor(() => expect(deleteInventoryItem).toHaveBeenCalledWith('u1', 'a'));
  });
```

（元のテストにあった `expect(screen.getByText('共有在庫なので全員に反映されます')).toBeInTheDocument();` は、在庫がアカウント単位になり実態と合わなくなるため削除する。対応する確認ダイアログ本文の変更は本ステップの Step 3 で行う。）

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm run test:run -- app/inventory/page.test.tsx`
Expected: FAIL（`deleteInventoryItem` が `'a'` のみで呼ばれ `'u1'` が渡っていない。また削除確認ダイアログの文言が変更前のまま）

- [ ] **Step 3: 実装を変更する**

`app/inventory/page.tsx` の該当箇所を修正する。まず10〜14行目の import・フック呼び出しを変更する。

```tsx
import { useAuth } from '@/lib/auth';
import { useInventory } from '@/hooks/useInventory';
import { useToastContext } from '@/components/Toast';
import { isE2EMode } from '@/lib/e2eMode';
import { addInventoryItem, updateInventoryItem, setInventoryItemStatus, deleteInventoryItem } from '@/lib/firestore';
```

29〜30行目を以下に変更する。

```tsx
  const { user, loading } = useAuth();
  const { items: liveItems, isLoading } = useInventory(user?.uid ?? null);
```

`updateInventoryItem(editing.id, input)` を `updateInventoryItem(user!.uid, editing.id, input)` に、`addInventoryItem(input)` を `addInventoryItem(user!.uid, input)` に、`setInventoryItemStatus(item.id, status)` を `setInventoryItemStatus(user!.uid, item.id, status)` に、`setInventoryItemStatus(item.id, 'enough')` を `setInventoryItemStatus(user!.uid, item.id, 'enough')` に、`deleteInventoryItem(deleteTarget.id)` を `deleteInventoryItem(user!.uid, deleteTarget.id)` に変更する（`if (!user)` の早期リターンより後段のコードなので `user` は非null）。

`app/inventory/page.tsx:211` の削除確認ダイアログの `description` を変更する。

```tsx
      <Dialog
        isOpen={deleteTarget !== null}
        title="品目を削除しますか？"
        description="この操作は取り消せません"
        variant="danger"
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm run test:run -- app/inventory/page.test.tsx`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add app/inventory/page.tsx app/inventory/page.test.tsx
git commit -m "$(cat <<'EOF'
refactor: inventory ページの呼び出しを userId 対応にする

EOF
)"
```

---

### Task 8: 法的ドキュメントとバージョンの更新

**Files:**
- Modify: `data/legal/privacy-policy.ts`
- Modify: `data/legal/terms.ts`
- Modify: `lib/consent.ts`
- Modify: `lib/consent.test.ts`

**Interfaces:**
- Produces: `TERMS_VERSION = '1.3.0'`, `PRIVACY_POLICY_VERSION = '1.4.0'`

- [ ] **Step 1: 失敗するテストを書く**

`lib/consent.test.ts` の7〜13行目を以下に変更する。

```ts
    it('TERMS_VERSIONが定義されている', () => {
      expect(TERMS_VERSION).toBe('1.3.0');
    });

    it('PRIVACY_POLICY_VERSIONが定義されている', () => {
      expect(PRIVACY_POLICY_VERSION).toBe('1.4.0');
    });
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm run test:run -- lib/consent.test.ts`
Expected: FAIL（現状の定数は `'1.2.0'` / `'1.3.0'`）

- [ ] **Step 3: 実装とドキュメントを変更する**

`lib/consent.ts` の4〜5行目を変更する。

```ts
export const TERMS_VERSION = '1.3.0';
export const PRIVACY_POLICY_VERSION = '1.4.0';
```

`data/legal/privacy-policy.ts` の33行目を変更する。

```ts
      '・在庫・不足品（品目名、在庫状態など。アカウントごとに保存されます）',
```

`data/legal/privacy-policy.ts` の163行目（`PRIVACY_POLICY_LAST_UPDATED`）を今日の日付に更新する。

```ts
export const PRIVACY_POLICY_LAST_UPDATED = '2026年7月24日';
```

`data/legal/terms.ts` の20行目（第2条）を変更する。

```ts
      '主な機能として、担当表、スケジュール、生産記録、試飲感想記録、ドリップガイド、欠点豆図鑑、在庫・不足品の管理などを提供します。',
```

`data/legal/terms.ts` の103行目（`TERMS_LAST_UPDATED`）を今日の日付に更新する。

```ts
export const TERMS_LAST_UPDATED = '2026年7月24日';
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npm run test:run -- lib/consent.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add data/legal/privacy-policy.ts data/legal/terms.ts lib/consent.ts lib/consent.test.ts
git commit -m "$(cat <<'EOF'
docs: inventoryのアカウント分離に合わせて法的文書を更新

サインアップ画面追加とinventoryのアカウント単位化に伴い、
プライバシーポリシー・利用規約の記述とバージョンを更新した。

EOF
)"
```

---

### Task 9: 最終検証

**Files:** なし（検証のみ）

- [ ] **Step 1: 型チェック**

Run: `npm run typecheck`
Expected: エラーなし

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: エラーなし

- [ ] **Step 3: 単体テスト一括実行**

Run: `npm run test:run`
Expected: 全テストPASS

- [ ] **Step 4: Firestore/Storage Rules テスト**

Run: `npm run test:rules`
Expected: 全テストPASS（Java 21+ が必要。未導入ならユーザーに確認する）

- [ ] **Step 5: ドキュメント整合性チェック**

Run: `npm run docs:check`
Expected: 不整合なし。指摘があれば `docs/steering/PRODUCT.md`・`docs/steering/TECH_SPEC.md` の認証方式・共有アカウント前提の記述を見直して修正する。

- [ ] **Step 6: iPad幅でのスクリーンショット確認**

chrome-devtools MCP を使い、iPad幅（`emulate`）でログイン画面（`/login`）とサインアップ画面（`/signup`）を開いてスクリーンショットを撮り、レイアウト崩れがないか目視確認する。

- [ ] **Step 7: 動作確認（手動）**

開発サーバーを起動し、実際に新規アカウントを作成 → ログイン → 在庫ページで品目を追加 → 別アカウントでログインし直して品目が見えないことを確認する。

Run: `npm run dev`

- [ ] **Step 8: 最終コミット（あれば）**

Step 5 で `docs/steering/` の修正が発生した場合のみ、まとめてコミットする。

```bash
git add docs/steering
git commit -m "$(cat <<'EOF'
docs: 認証方式・在庫データの記述を新しい設計に合わせて更新

EOF
)"
```
