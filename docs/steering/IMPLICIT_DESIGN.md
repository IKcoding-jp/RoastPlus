# 暗黙設計ドキュメント

**最終更新**: 2026-06-12

このファイルは、コードを読まないと分からない重要な設計判断をまとめたものです。
`docs/steering/TECH_SPEC.md` の補足として、実装の「なぜ」を記録します。

---

## 1. 書き込みキュー設計（`lib/firestore/userData/write-queue.ts`）

### 定数と根拠

| 定数 | 値 | 根拠 |
|------|-----|------|
| `SAVE_USER_DATA_DEBOUNCE_MS` | 300 ms | ユーザーの連続入力（スライダー・テキスト）を1件にまとめる最低限の待機時間 |
| `MAX_CONCURRENT_WRITES` | 1 | Firestoreの "write stream exhausted" エラー（接続過多）を防ぐため、同時書き込みを1本に絞る |
| `MAX_RETRY_COUNT` | 3 | write stream exhausted は一時的な輻輳に起因するため、指数バックオフで3回まで自動復帰を試みる |
| `MAX_BATCH_OPERATIONS` | 450 | Firestore の1バッチ上限500操作に対して余裕を持たせた値。複数フィールドを1バッチにまとめる際の安全弁 |
| `MIN_WRITE_INTERVAL` | 200 ms | 短期間に大量の小さな書き込みが発生した場合のバースト防止 |
| `MAX_QUEUE_SIZE` | 20 | キュー飽和時の無限待機防止。超過時はログを出してそのまま書き込みを続行する |

### リトライの仕組み

write stream exhausted（`resource-exhausted` エラーコード、またはメッセージに "write stream exhausted" を含む場合）のみリトライ対象。それ以外のエラー（ネットワーク断・権限エラー等）はリトライせず即時失敗する。

リトライ待機時間は指数バックオフ＋キューの混雑度に応じた追加待機で計算する（上限10秒）:

```
delay = min(RETRY_DELAY * 2^(retryCount - 1) + writeWaitQueue.length * 300, 10000) ms
```

### 最終失敗時の挙動

3回のリトライがすべて失敗した場合:
1. `lib/syncStatus.ts` の `reportSaveError()` が呼ばれ、**同期エラーバナー** がUIに表示される
2. `pendingPromise.reject(error)` で呼び出し元に例外を伝播する
3. **保留中のデータは失われる** — キューはクリアされ、ローカル変更はFirestoreに届いていない状態になる

---

## 2. オフライン時のデータ保証範囲

### IndexedDB 永続化（`lib/firebase.ts`）

`createFirestore()` はブラウザ環境かどうかで初期化方法を変える。

| 条件 | Firestoreの初期化方法 |
|------|---------------------|
| ブラウザ・エミュレータなし | `initializeFirestore` + `persistentLocalCache` + `persistentMultipleTabManager` |
| SSR（`typeof window === 'undefined'`）またはエミュレータ接続時 | `getFirestore(app)`（メモリキャッシュ） |
| IndexedDB 不可・二重初期化エラー | `getFirestore(app)` へフォールバック（アプリ起動は止めない） |

`persistentMultipleTabManager()` を使うことで、複数タブを開いても安全にオフライン同期が動作する。IndexedDB が使えない環境ではメモリキャッシュに落ちるが、アプリは起動し続ける（graceful degradation）。

### 競合解決

Firestoreは **last-write-wins** モデル。サーバータイムスタンプが最も新しい書き込みが勝つ。RoastPlus は1ユーザー1端末を基本運用とするため、複数端末からの同時書き込みは想定外シナリオ。

### ログアウト時の書き込み保証（`lib/auth.ts` の `signOut()`）

ログアウトは3段階で保留データを安全に送信してからサインアウトする。

```
1. flushPendingUserDataWrites(uid)
   → アプリのデバウンス待機中データを即時実行して完了を待つ
2. waitForPendingWrites(db)
   → Firestore SDK が内部でキューしている書き込みの完了を待つ
3. firebaseSignOut(auth)
   → Firebase Auth のサインアウト
```

その後 `terminate(db)` → `clearIndexedDbPersistence(db)` でローカルキャッシュを削除する。IndexedDB のクリアが失敗（多タブ競合等）しても `signOut` は正常完了させ、呼び出し側は必ずフルリロードする。

**オフライン時はログアウトを拒否する**（理由: 未送信の変更が消えることへの安全弁。共有端末でキャッシュを安全に消せないため）。

### PWA復帰時の接続再確立（iOSゾンビ接続対策）

iOS（WebKit）はPWAをバックグラウンドで凍結し、ネットワーク接続を切断する。復帰後もFirestore SDKが切断に気付かないと、`getDoc` 等のPromiseが**エラーにもならず永遠に未解決**になり、無限「読み込み中」が発生する（タスクキルでしか復帰できない）。これに対し三層で防御している。

| 層 | 実装 | 内容 |
|----|------|------|
| 根本対処 | `hooks/useReconnectOnResume.ts`（`app/layout.tsx` に常駐） | 30秒以上バックグラウンドにいた後の復帰、またはbfcache復元（`pageshow` の `persisted`）で `disableNetwork` → `enableNetwork`（`lib/firestore/reconnect.ts`）を実行し接続を作り直す。短いタブ切替で健全な接続を壊さないようしきい値を設ける |
| 保険 | `lib/firestore/userData/crud.ts` の `getUserData` | サーバー応答が8秒（`GET_USER_DATA_TIMEOUT_MS`）でタイムアウトしたら `getDocFromCache` にフォールバック。キャッシュも無ければエラーを throw し呼び出し側のエラー処理へ |
| 最後の砦 | `components/Loading.tsx` | 読み込みが10秒（`RELOAD_PROMPT_DELAY_MS`）を超えたら「再読み込み」ボタンを表示。原因を問わず、タスクキルなしで復帰できる |

同じ理由で**認証初期化にも保険をかける**。`lib/auth.ts` の `useAuth` は `onAuthStateChanged` の初回コールバックが来なくても8秒（`AUTH_INIT_TIMEOUT_MS`）で `loading` を解除する。各ページは `useAuth().loading` の間 `<Loading />` を表示するため、ここがハングすると全画面が初回起動時に固まる（リスナーは貼ったままにし、後から確定した認証状態は `setUser` で追従する）。

---

## 3. 生産記録のドキュメントID戦略

生産記録は3種類のサブコレクションを持ち、それぞれ異なるID戦略をとる（`lib/firestore/productionRecords.ts`）。

| コレクション | ドキュメントID | 意味 |
|------------|--------------|------|
| `handpickEntries` | `{workDate}__{segment}__{encodeURIComponent(beanName.trim())}` | 同日・同区分・同豆名の重複を防ぐ自然キー |
| `roastEntries` | `{workDate}` | 1日1件の制約（同日の別の焙煎記録は作れない） |
| `packageEntries` | `{workDate}` | 1日1件の制約（同日の別のパッケージ記録は作れない） |

#### handpick のID設計詳細

区分（`first` / `second`）をキーに含めるのは、同日に同じ豆を2段階に分けてハンドピックする業務フローが存在するため。`beanName` を `encodeURIComponent` するのは、`/` や空白を含む豆名でも安全にFirestoreドキュメントIDとして使えるようにするため。

#### キー変更時のトランザクション挙動

編集でIDが変わる場合（例: `workDate` や `beanName` を変更）、保存関数はトランザクション内で以下を実行する:

1. 変更後の新IDで `transaction.get()` し、**既存レコードがあれば上書きを拒否**（「同じ日付・区分・豆名の記録が既にあります」エラーを返す）
2. 旧IDのドキュメントを `transaction.delete()`
3. 新IDのドキュメントを `transaction.set()`

これにより「編集先に別のレコードが存在する場合のデータ消失」を防ぐ。roast / package も同じパターン。

`createdAt` は既存ドキュメントから引き継ぐ（`restoreCreatedAt()`）。これにより編集してもレコードの作成日時が変わらない。

---

## 4. localStorage キャッシュ一覧

RoastPlusが書き込む localStorage キーの一覧。いずれも **表示ヒント・UI補助** 用途であり、消えても業務データには影響しない。

| キー（プレフィックス） | 定義ファイル | 用途 | 消えても安全か |
|----------------------|------------|------|-------------|
| `roastplus_selected_member_id` | `lib/localStorage.ts` | 前回選択したメンバーIDの復元 | ✅ 安全（再選択すれば済む） |
| `roastplus_device_id` | `lib/localStorage.ts` | デバイスを識別する一時ID | ✅ 安全（再生成される） |
| `roastplus_last_46_taste` | `lib/localStorage.ts` | 4:6メソッドの前回の味わい選択 | ✅ 安全（UI初期値のみ） |
| `roastplus_last_46_strength` | `lib/localStorage.ts` | 4:6メソッドの前回の濃度選択 | ✅ 安全（UI初期値のみ） |
| `roastplus_prodrec_cache:v1:{userId}:{month}` | `lib/productionRecordCache.ts` | 生産記録の「数字のちらつき」防止用キャッシュ | ✅ 安全（Firestoreが正） |
| `roastplus_prodrec_months:v1:{userId}` | `lib/productionRecordCache.ts` | 月リストのポップイン防止キャッシュ | ✅ 安全（Firestoreが正） |
| `roastplus_defect_beans_master_cache` | `lib/defectBeanCache.ts` | 欠点豆マスターデータのstale-while-revalidateキャッシュ | ✅ 安全（Firestoreが正） |
| `roastplus_theme` | `next-themes` ライブラリが管理 | テーマ設定の永続化 | ✅ 安全（リセットされるが業務データではない） |
| `roastplus_cache_clear_failed` | `lib/auth.ts` | ログアウト時のキャッシュクリア失敗フラグ | ✅ 安全（次回ログアウト時に再確認） |

> 認証・本番データの保存には一切 localStorage を使わない。Firestore が唯一の信頼できるデータソース。

キー設計の方針:
- `userId` をキーに含めることで、同一端末での複数アカウント利用時のキャッシュ混在を防ぐ。
- `CACHE_VERSION` をキーに含めることで、データ構造変更時に古いキャッシュを自動的に無効化できる。

---

## 5. エラー処理ポリシー

`CLAUDE.md` の「データ保護ガードレール」にも記載のとおり、エラーの扱いは用途によって明確に分ける。

### 握りつぶしてよいもの（graceful degradation）

| 対象 | 理由 |
|------|------|
| localStorage の読み書き失敗（QuotaExceeded 等） | キャッシュがないだけで本体は動く |
| IndexedDB 永続化の初期化失敗 | メモリキャッシュにフォールバックし、アプリは起動し続ける |
| Service Worker の登録・更新失敗 | アプリは動くがオフラインキャッシュが効かないだけ |
| 音声再生の失敗（タイマー完了音等） | UI操作の補助機能 |
| ブラウザ通知API の失敗 | 権限がない端末もあるため |
| ログアウト後の IndexedDB クリア失敗 | アプリはリロードされ、次回ログイン時に上書きされる |
| 欠点豆マスターキャッシュの読み書き失敗 | Firestoreから再取得できる |

### 必ずユーザーに通知するもの

| 対象 | 通知手段 | 実装箇所 |
|------|---------|---------|
| ユーザーデータの Firestore 保存失敗 | 同期エラーバナー | `lib/firestore/userData/write-queue.ts` → `reportSaveError()` |
| Firestore リアルタイム購読エラー | トースト・バナー等（機能ごとに実装） | 各 `onSnapshot` のエラーハンドラ |
| オフライン時のログアウト試行 | エラースロー（UIがダイアログ表示） | `lib/auth.ts` の `signOut()` |

**新しいエラー処理を書くときのチェック**: `console.error` だけで終わっている場合は「業務データの読み書き」かどうかを確認し、該当する場合は `reportSaveError()` または UI 通知に接続する。

---

## 6. `firestore.rules` のルート直下 `allow false` ブロックの経緯

`firestore.rules` のルート直下には、`teams` / `members` / `managers` / `taskLabels` / `assignmentDays` / `shuffleEvents` / `shuffleHistory` / `assignmentSettings` と `_meta` に対して `allow read, write: if false` が設定されている。

これらは **設計当初からデータを `/users/{userId}/` 配下に置く構造** を採用しているため、ルート直下コレクションへの誤アクセスを明示的に拒否する意図で書かれている。実際のアクセス許可は `/users/{userId}/teams/{teamId}` 等、`users` 配下の match ルールで行う。

`defectBeans` に対する `allow write: if false` は別の理由: マスターデータはサーバー側（Firebase Admin SDK）でのみ管理し、クライアントからの書き換えを禁止するため。

詳細は `firestore.rules` のインラインコメントを参照すること。
