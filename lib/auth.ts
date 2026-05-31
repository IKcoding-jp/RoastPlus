'use client';

import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
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

  try {
    await firebaseSignOut(auth);
    // 共有端末対策: ログアウト時に端末ローカルのオフラインキャッシュ(IndexedDB)を消す。
    // 永続化したFirestoreデータがログアウトやブラウザ再起動後も端末に残らないようにする。
    // terminate でインスタンスを停止してから clearIndexedDbPersistence で消す必要がある。
    // この後は db が終了状態になるため、呼び出し側はフルリロードで再初期化する。
    try {
      await terminate(db);
      await clearIndexedDbPersistence(db);
    } catch (cacheError) {
      console.error('ローカルキャッシュのクリアに失敗しました:', cacheError);
    }
  } catch (error) {
    console.error('ログアウトエラー:', error);
    throw error;
  }
}
