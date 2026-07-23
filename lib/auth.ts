'use client';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { clearIndexedDbPersistence, terminate, waitForPendingWrites } from 'firebase/firestore';
import { auth, db } from './firebase';
import { flushPendingUserDataWrites } from '@/lib/firestore';
import { getE2EUser, isE2EMode, isE2ESignedIn, signOutE2EUser } from './e2eMode';

/**
 * 認証初期化のタイムアウト（ミリ秒）。
 * onAuthStateChanged の初回コールバックは通常すぐ発火するが、iOS PWA で
 * IndexedDB 永続化が詰まる等で遅延・ハングすると loading が解除されず、
 * 全画面が「読み込み中」で固まる。getUserData（GET_USER_DATA_TIMEOUT_MS）と
 * 同じ保険をかけ、初回コールバックが来なくても loading を必ず解除する。
 */
export const AUTH_INIT_TIMEOUT_MS = 8000;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isE2EMode()) {
      const timeoutId = window.setTimeout(() => {
        setUser(isE2ESignedIn() ? getE2EUser() : null);
        setLoading(false);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    let isMounted = true;
    let settled = false;

    // loading の解除は初回1回だけ。アンマウント後は無視する。
    const finishLoading = () => {
      if (!isMounted || settled) return;
      settled = true;
      setLoading(false);
    };

    // 保険: 初回コールバックが来なくても loading を必ず解除する。
    // リスナーは貼ったままにし、後から認証状態が確定したら user が更新される。
    const timeoutId = window.setTimeout(finishLoading, AUTH_INIT_TIMEOUT_MS);

    // 初回・以降の認証状態変更を単一リスナーで監視する
    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        if (!isMounted) return;
        setUser(nextUser);
        finishLoading();
      },
      (error) => {
        console.error('Firebase Authentication初期化エラー:', error);
        finishLoading();
      }
    );

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  return { user, loading };
}

/** メールアドレス＋パスワードで新規アカウントを作成する。 */
export async function signUpWithEmail(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  if (isE2EMode()) {
    signOutE2EUser();
    return;
  }

  // オフライン時はログアウトを止める:
  // 1) 未送信のオフライン変更を失わないため 2) 共有端末でキャッシュを安全に消せないため
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const offlineError = new Error('オフラインのためログアウトできません');
    offlineError.name = 'OfflineLogoutError';
    throw offlineError;
  }

  // ここまでは db を終了していないので、失敗したら呼び出し側に伝えてそのまま留まれる
  const uid = auth.currentUser?.uid;
  // アプリ独自のデバウンス待機中の書き込みを先に送信してから、Firestore の保留書き込みを待つ
  if (uid) {
    await flushPendingUserDataWrites(uid);
  }
  await waitForPendingWrites(db);
  await firebaseSignOut(auth);

  // ここから先は db を terminate するため、呼び出し側は必ずフルリロードする。
  // terminate 後に clear が失敗(多タブ等)しても、db は終了済みなのでリロードは必須。
  // よってクリア失敗は再throwせずログのみに留め、signOut は正常終了させてリロードを保証する。
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch (cacheError) {
    console.error(
      'ログアウト時のローカルキャッシュのクリアに失敗しました(端末に一部データが残る可能性があります):',
      cacheError
    );
    try {
      window.localStorage.setItem('roastplus_cache_clear_failed', '1');
    } catch {
      // localStorage 不可環境は無視
    }
  }
}
