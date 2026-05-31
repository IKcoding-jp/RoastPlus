# データ安全コア 設計仕様（テーマA / rank1+2+3+4）

- **作成日**: 2026-05-31
- **関連監査**: `docs/audits/2026-05-31-roastplus-100x-audit.md`（総合6/10、テーマA）
- **スコープ**: rank1（保存失敗の再throw）+ rank2（Firestoreオフライン永続化）+ rank3（オフライン検知バナー）+ rank4（白画面防止）
- **ステータス**: 設計承認済み（ユーザー承認 2026-05-31）→ レビュー待ち → 実装計画へ

---

## 1. 目的

現場8名が毎日入力する業務データ（焙煎スケジュール・試飲・欠点豆・通知など）が「保存に失敗しても気づけず、画面から黙って消える」状態を解消する。具体的には次の4点を1セットで満たす。

- **そもそも消えない**（オフラインでも入力がローカルに保存され、復帰時に自動同期）
- **消えたら分かる**（保存失敗がエラーとしてユーザーに見える）
- **通信断が分かる**（オフライン状態を画面に常設表示）
- **壊れても止まらない**（レンダリング例外で白画面にならず、再読み込みで復帰）

## 2. 背景となる問題

- `hooks/useAppData.ts` の `updateData`（関数は215-304行、該当の `catch` は279-292行）が保存失敗を `console.error` で握りつぶし、**再throwしない**。失敗時はサーバーの古い値を再取得して画面を上書きする。
- このため `schedule`/`tasting`/`defect-beans`/`notifications`/`home` の呼び出し元に書かれた try/catch＋エラートーストが**全て到達不能な死にコード**になり、保存失敗が嘘の『保存しました』で隠蔽される。
- `lib/firebase.ts:27` はオフライン永続化なし（素の `getFirestore`）。
- `navigator.onLine` によるオフライン検知がリポジトリ全体で0件。
- `app/error.tsx` / `app/global-error.tsx` / ErrorBoundary が一切存在せず、レンダリング例外で白画面になる。
- **実害**: Issue #458 で本番データ全消失（試飲4セッション+16記録+スケジュール12件）が発生済み。理論上のリスクではなく再発する実害。

## 3. 対象ユーザー

- 現場スタッフ約8名（iPad / スマホ、電波が不安定なことがある作業場でPWAを利用）
- 保守者1名（IK、初心者寄り。危険な変更を見抜き安全に運用したい）

## 4. 現在の挙動

- オフライン/通信断時に保存すると、`write-queue` 経由の書き込みが解決せず（または resource-exhausted で reject）、`updateData` は例外を握りつぶして成功扱いで解決。直後にサーバー値で画面が巻き戻り、入力が消える。
- 試飲の新規セッション保存（`app/tasting/sessions/new/page.tsx`）は `await updateData(...)` を try/catch で囲むが、`updateData` が reject しないため catch が発火せず、保存失敗でも一覧へ遷移する（false success）。
- オフラインかどうかをユーザーが知る手段がない。
- どこかのコンポーネントが例外を投げると画面全体が白くなり、現場は復旧できない。

## 5. 期待する挙動

- オフライン中の保存は失敗ではなく「ローカルに保存され、接続復帰時に自動同期」される（IndexedDB永続化）。
- 永続化で吸収できない本当の保存失敗（権限エラー・無効データ・write stream exhausted 枯渇など）は `updateData` が reject し、既存のエラートーストが表示される。
- オフライン時は画面上部に常設バナー「オフライン：変更は接続が戻ったときに保存されます」を表示。
- レンダリング例外時は白画面の代わりに「一時的な問題が発生しました。再読み込みしてください」＋再読み込みボタンを表示。

## 6. 設計詳細

### 基本方針：既存の #458 防止ロジックは「壊さず温存」

`useAppData` の消失防止ロジック（`applyIncomingSnapshot` の空スナップショット無視 98-119行、`lockedKeysRef` のフィールドロック、`FIRESTORE_ACK_TIMEOUT_MS` のackタイムアウト）は今回作り直さず、その上に安全機能を追加的に重ねる。永続化の導入後にこの機構を簡素化できる可能性はあるが、それは別途テストを固めてからの将来課題とする。

### A. rank2 — Firestoreオフライン永続化（`lib/firebase.ts`）

- `getFirestore(app)`（27行）を `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })` に変更する。`persistentMultipleTabManager` は単一タブでも安全に動作する。
- **3つのガードを付ける**:
  1. **ブラウザ限定**: `typeof window !== 'undefined'` のときのみ永続化を有効化。静的エクスポートのビルド時（Node/SSR）と IndexedDB 非対応環境では従来どおり `getFirestore(app)`（メモリキャッシュ）にフォールバック。
  2. **エミュレータ時は無効**: `NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR === 'true'` のときは永続化を有効化しない（E2Eの決定性確保・キャッシュのテスト間汚染防止）。
  3. **フォールバック**: `initializeFirestore` が失敗（IndexedDB不可など）した場合は `getFirestore(app)` で続行し、機能を落とさない。
- `initializeFirestore` は他のFirestore利用より先に呼ぶ必要があるが、`lib/firebase.ts` が単一の初期化点のため順序は保証される。`connectFirestoreEmulator` は従来どおりその後に呼ぶ。
- **学習ポイント**: 永続化を入れても「保存完了の合図（サーバー応答）」はオンライン復帰まで返らない。変わるのは入力がローカルに durable に貯まり復帰時に自動同期されること。

### B. rank1 — `updateData` の保存失敗を再throw（`hooks/useAppData.ts`）

- `updateData` の `catch`（279-292行）末尾、巻き戻し処理（`getUserData`→`commitData`）の後で `throw saveError` する。`finally`（293-301行）の状態クリーンアップは維持。
- これにより、`await updateData(...)` を try/catch している呼び出し元のエラートーストが復活する。
- **未処理Rejection対策（必須）**: 再throwにより `await` していない呼び出し元（fire-and-forget）が未処理のPromiseRejectionを起こすため、以下を個別対応する。

| 呼び出し元 | 現状 | 対応 |
|---|---|---|
| `hooks/useScheduleOCR.ts:43, 87` | awaitなし | `await` 化し、失敗時に「スケジュールの保存に失敗しました」トースト。成功トーストは保存成功後のみ表示 |
| `hooks/useNotifications.ts:61` | `void updateData(...)` | `.catch` で握り、必要に応じてログ（既読同期の失敗・軽微） |
| `hooks/useHomeFeatureVisibility.ts:46, 64, 78` | awaitなし | `.catch(console.error)`（ホーム表示設定・軽微、UIは楽観反映済み） |
| `hooks/useDefectBeans.ts:83,148,184`, `hooks/useDefectBeanSettings.ts:29,66` | await＋try/catch | 変更不要（再throwで既存catchが生き返る。画像順序の是正=rank16は別スコープ） |
| `app/tasting/page.tsx:83,104,160,179`, `app/tasting/sessions/new/page.tsx:51` | await＋try/catch | 変更不要（再throwで既存catchが生き返り、false success も解消） |

### C. rank3 — オフライン検知バナー（新規 `hooks/useOnlineStatus.ts` ＋ `app/layout.tsx`）

- `hooks/useOnlineStatus.ts`: `navigator.onLine` を初期値に、`online`/`offline` イベントを購読して boolean を返す小フック。SSR安全（初期は `true` 扱い、マウント後に実値へ）。
- `app/layout.tsx`: オフライン時のみ画面上部に控えめな常設バナー「オフライン：変更は接続が戻ったときに保存されます」を表示。色・余白は `DESIGN.md` とトークン（例 `bg-warning`/`text-*`）に従い、既存の共通UI方針を踏襲。
- 保存ロジックには干渉しない純粋な追加。

### D. rank4 — 白画面防止（新規 `app/global-error.tsx`・`app/error.tsx`・軽量 ErrorBoundary）

- `app/global-error.tsx`: ルートレイアウトの例外を受ける最終防壁。`html`/`body` を含む最小UIで「一時的な問題が発生しました。再読み込みしてください」＋再読み込みボタン（`reset()` または `location.reload()`）。
- `app/error.tsx`: 各機能ルートの例外を受ける復旧UI（再読み込み＋ホームへ戻る導線）。
- 軽量 ErrorBoundary クラスコンポーネント: `app/layout.tsx` の children を包み、`error.tsx` が拾えない描画例外も白画面化させない（任意・段階導入可）。
- 静的エクスポート（`output: 'export'`）でも Next.js 標準のクライアント境界として動作する。

### E. 実装順序（安全な順・各ステップでテスト緑を確認）

1. **rank4**（白画面防止・無リスク、純追加）
2. **rank3**（バナー・無リスク、純追加）
3. **rank2**（永続化・中リスク、初期化変更）
4. **rank1**（再throw＋呼び出し元対応・中リスク、最重要ファイル）

危険なものを後段にし、各ステップで `npm run test:run` を緑に保ちながら段階コミットする。

## 7. 具体例（受け入れシナリオ）

- **オフライン保存**: DevTools の Network を Offline にして本日のスケジュールを編集 → 入力が画面に残り、バナーが「オフライン」を表示。Online に戻すと自動的にFirestoreへ同期され、再読み込み後も入力が残っている。
- **本当の保存失敗**: 権限エラー等を擬似的に発生させると、エラートースト「保存に失敗しました…」が表示され、嘘の成功トーストは出ない。
- **試飲新規保存の失敗**: 保存が reject すると一覧へ遷移せずフォームに留まり、エラーが表示される。
- **描画例外**: 想定外データで例外が起きても白画面にならず、再読み込みボタン付きの復旧UIが出る。

## 8. 受け入れ条件

- [ ] オフライン中の保存入力が、再読み込み・接続復帰をまたいで失われない（IndexedDB永続化が有効）。
- [ ] 永続化で吸収できない保存失敗時に `updateData` が reject し、既存エラートーストが表示される。
- [ ] fire-and-forget の呼び出し元（OCR・通知・ホーム表示設定）が未処理Rejectionを起こさない。
- [ ] オフライン時に常設バナーが表示され、オンライン復帰で消える。
- [ ] レンダリング例外時に白画面でなく復旧UI（再読み込みボタン）が表示される。
- [ ] 既存の #458 防止ロジック（空スナップショット無視・フィールドロック）の挙動が回帰していない。
- [ ] `npm run test:run` と `npm run build` が緑。

## 9. 影響範囲

- **影響する画面**: 全機能（保存経路）、`app/layout.tsx`（バナー・境界）、`schedule`/`tasting`/`defect-beans`/`notifications`/`home`（エラートースト復活）。
- **影響するデータ**: なし（データ構造・スキーマ変更なし）。永続化は端末ローカルの IndexedDB キャッシュのみで、サーバー側データに無影響。
- **認証・認可・Firestore Rules / Storage Rules**: 影響なし（読み書きの宛先・権限モデルは不変）。
- **Cloud Functions**: 影響なし。
- **Service Worker / キャッシュ**: 影響なし（SWは別。永続化はFirestore SDKのIndexedDB）。
- **本番ビルド**: `lib/firebase.ts` の初期化変更。ブラウザ限定ガードで静的エクスポートのビルドに無影響。

## 10. テスト方針（TDD）

- `hooks/useAppData.test.ts`: 「保存失敗時に `updateData` が **reject する**」テストを追加（現状は「エラーがログされる」のみ検証）。巻き戻しが維持されることも確認。
- 新規 `hooks/useOnlineStatus.test.ts`: `online`/`offline` イベントで返り値が切り替わる。
- 呼び出し元: OCR/通知/ホーム表示設定が失敗時にトースト／`.catch` で安全に処理されることを確認。
- 手動確認: DevTools Network Offline で保存→復帰同期、権限エラー擬似で失敗トースト、描画例外で復旧UI。
- コマンド: `npm run test:run`、`npm run build`、必要に応じ `npm run test:e2e`。

## 11. 安全策・ロールバック

- データ構造・Rules を一切変えないため、**コードを戻すだけで完全に元に戻せる**。マイグレーション不要。
- 永続化は端末ローカルキャッシュのみでサーバーデータに無影響。
- 4ステップを段階コミットし、問題があればステップ単位で revert 可能にする。
- 実装はベースブランチ `main` に直接行わず、`feat/#<issue>-data-safety-core` 等のブランチで進める。

## 12. やらないこと（スコープ外）

- rank5（保存状態インジケータ＋再試行トースト）
- rank16（欠点豆の画像削除/保存順序の是正）
- rank15（tasting/schedule のサブコレクション移行・XL）
- `useAppData` 消失防止ロジックの簡素化/作り直し
- 上記は本スペック完了後、別スペックとして順次対応する。

## 13. 未決事項

- オフライン時の `await saveUserData` が「pending のままハングする」か「一定後に reject する」かの厳密な挙動は、実装時のTDDでテストで固定し、`updateData` の await 設計（タイムアウトの要否）を確定する。永続化導入でこの挙動が変わる可能性も含めて検証する。
- 軽量 ErrorBoundary をlayoutに常設するか、`error.tsx`/`global-error.tsx` のみで十分かは、実装時に挙動を見て判断（段階導入可）。
