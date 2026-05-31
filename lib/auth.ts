'use client';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { clearIndexedDbPersistence, terminate, waitForPendingWrites } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getE2EUser, isE2EMode, isE2ESignedIn, signOutE2EUser } from './e2eMode';

/**
 * Firebase Authenticationの初期化を待機するPromiseを返す
 * 静的エクスポート環境でも確実に初期化が完了するまで待機する
 */
function waitForAuthInit(): Promise<User | null> {
  return new Promise((resolve) => {
    // onAuthStateChangedの初期コールバックが呼ばれるまで待機
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

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
    let unsubscribe: (() => void) | null = null;

    // 初期化を待機してから、状態変更リスナーを設定
    waitForAuthInit()
      .then((initialUser) => {
        if (!isMounted) return;

        setUser(initialUser);
        setLoading(false);

        // 以降の認証状態変更を監視
        unsubscribe = onAuthStateChanged(auth, (user) => {
          if (isMounted) {
            setUser(user);
          }
        });
      })
      .catch((error) => {
        console.error('Firebase Authentication初期化エラー:', error);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { user, loading };
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
  }
}
