# RoastPlus 全方位監査レポート（100倍化のための現状診断）

- **作成日**: 2026-05-31
- **対象**: RoastPlus（ドリップパックコーヒー製造の現場向け PWA）
- **方法**: 12次元を並列エージェントで深掘り監査（実コードを読み、ファイル名・行番号付きで評価）→ 横断ランキングで統合
- **総合スコア**: **6 / 10**

> 重要度の記号: 🔴 critical（データ損失・セキュリティ・業務停止級） / 🟠 high（日常的な大きな支障） / 🟡 medium（改善余地） / ⚪ low（些細）
> コスト記号: **S**＝数十分 / **M**＝半日 / **L**＝1〜2日 / **XL**＝数日（いずれも AI エージェント実装前提）

---

## 1. 総評

RoastPlus は「**設計図は一流、施工に致命的な穴が数カ所**」という状態のアプリです。実コードを確認した結果、強みは本物でした。

**本物の強み（初心者1名運用とは思えない水準）:**
- 型安全性：本番コードに `: any` 0件・`@ts-ignore` 0件・循環依存 0件、`tsc --noEmit` クリーン
- セキュリティ：owner isolation（本人のみ自分のデータ）を `firestore.rules`/`storage.rules` 全マッチで徹底し、**エミュレータ実テスト＋CI** で検証
- Cloud Functions の多層防御：App Check enforce・認証チェック・入力検証・レート制限
- 生産記録のサブコレクション設計＋集計の都度計算（集計と元データの乖離ゼロ）
- DESIGN.md とセマンティックトークンによる 7 テーマ基盤
- 94 ファイル 791 テスト＋9 並列 CI

**しかし、たった1つの根本原因が4次元の最重要問題を同時に生んでいます。**

`hooks/useAppData.ts:273-301` の `updateData` が「保存失敗を `console.error` で握りつぶし、**再 throw せず**、しかも失敗時にサーバーの古い値を再取得して画面を上書きする」挙動です。この1箇所のせいで、`schedule`/`tasting`/`defect-beans`/`notifications`/`home` の呼び出し側に書かれた try/catch＋エラートーストが**全て死にコード**になり、保存が失敗しても『保存しました』と表示され、次の同期で入力が黙って消えます。

さらに `lib/firebase.ts:27` はオフライン永続化なし、`navigator.onLine` によるオフライン検知ゼロ、`app/error.tsx`・`global-error.tsx`・ErrorBoundary も皆無で、レンダリング例外は白画面になります。**実際に Issue #458 で本番データ全消失（試飲4セッション+16記録+スケジュール12件）が起きており、理論上のリスクではなく再発する実害です。**

総じて「現場8名が毎日入力するデータの安全性と可視性」という業務アプリの核心が、堅牢な周辺（セキュリティ・型・テスト）に守られながらも、保存経路の中心で破れている。**逆に言えば、穴が局所的で根本原因が特定済みなので、少数の的を絞った修正で劇的に良くなる余地が極めて大きい**アプリです。

---

## 2. スコアカード（12次元）

| 次元 | スコア | 状態 |
|---|:---:|---|
| セキュリティ | 8 | 🟢 同規模個人開発の平均を大きく上回る |
| ビジュアルデザイン・UI一貫性 | 7 | 🟢 トークン基盤は秀逸、施工にムラ |
| アーキテクチャ・コード品質 | 7 | 🟢 型安全・循環ゼロ、規律が人手頼み |
| テスト・品質保証 | 7 | 🟢 認可・集計・CSVは手厚い、保存経路が手薄 |
| UX・ユーザーフロー | 6 | 🟡 基盤は堅い、現場の手元体験が未完 |
| パフォーマンス | 6 | 🟡 8名規模なら十分速い、構造的弱点2つ |
| プロダクト・機能機会 | 6 | 🟡 単機能は良質、機能間がサイロ化 |
| 保守性・開発者体験 | 6 | 🟡 ドキュメント厚い、本番異常を検知できない |
| アクセシビリティ | 5 | 🟠 フォーム基礎は良い、モーダル/コントラストに穴 |
| データモデル・Firestore設計 | 5 | 🟠 生産記録は手本、レガシー領域が配列パッキング |
| 信頼性・エラーハンドリング | 5 | 🟠 周辺は堅牢、保存経路の中心で破れている |
| **PWA・オフライン・現場耐性** | **3** | 🔴 「電波が切れても失わない」が満たせていない |

---

## 3. まず3つだけやるなら（最優先 Top3）

1. **`updateData` の保存失敗を再 throw し、エラートーストを復活させる**（信頼性 / 🔴 / **S**）
   `useAppData.ts` の catch 末尾に巻き戻し後の `throw` を1行足すだけで、全機能に既に書かれているエラーハンドリングが一斉に生き返る。アプリ最大の弱点を最小コストで塞ぐ、群を抜いて費用対効果の高い1点。Issue #458 再発防止の中核。

2. **Firestore オフライン永続化を有効化し、オフライン状態を画面に常設表示する**（PWA / 🔴 / **M+S**）
   `lib/firebase.ts` を `initializeFirestore + persistentLocalCache` に変えると、電波が切れても書き込みがローカルにキューされ復帰時に自動同期される。「打ったのに消えた」が構造的に消える。

3. **`app/global-error.tsx` ＋ ErrorBoundary を追加し、白画面で現場が詰む最悪ケースを防ぐ**（保守性 / 🟠 / **S〜M**）
   Next 標準機構で『再読み込み』ボタン付き復旧 UI を1〜2枚足すだけで、業務停止級の見え方を回避できる。

---

## 4. 横断ロードマップ（効果順 18件）

| # | 施策 | 次元 | 効果 | コスト | 重要度 |
|:--:|---|---|---|:--:|:--:|
| 1 | `updateData` の保存失敗を再 throw し全機能のエラートーストを復活 | 信頼性 | 変革的 | S | 🔴 |
| 2 | Firestore オフライン永続化（persistentLocalCache）を有効化 | PWA | 変革的 | M | 🔴 |
| 3 | オフライン検知フック＋常設バナーで通信断を見える化 | PWA | 高 | S | 🟠 |
| 4 | `global-error.tsx`＋ルート ErrorBoundary で白画面を復旧UIに | 保守性 | 高 | S | 🟠 |
| 5 | 保存状態インジケータ＋再試行付きトーストで自動保存を可視化 | UX | 高 | M | 🟠 |
| 6 | eslint で依存方向を機械強制＋madge/knip を CI 接続 | アーキ | 高 | M | 🟠 |
| 7 | NumberInput に inputMode を追加し全数値入力をテンキー最適化 | UX | 高 | S | 🟠 |
| 8 | 共通 Modal に role/aria-modal/フォーカストラップ/Escape を実装 | a11y | 高 | M | 🟠 |
| 9 | 主要ボタンのコントラストを WCAG AA 準拠に（変数1箇所） | a11y | 高 | S | 🟠 |
| 10 | SW で `_next/static` 不変チャンクを Cache First 配信に | パフォ | 高 | S | 🟡 |
| 11 | 本番クライアントエラーの最小ロガー（errorLogs）を1本通す | 保守性 | 高 | M | 🟡 |
| 12 | 賞味期限シール計算をアプリ実装（純関数＋テスト） | 機能 | 高 | M | 🟠 |
| 13 | 共通UI（Button/ProgressBar）のハードコード色をトークン化 | UI | 高 | M | 🟡 |
| 14 | 毎日使う生Tailwind製モーダルを共通Modal＋トークンに統一 | UI | 中 | L | 🟠 |
| 15 | tasting/schedule をサブコレクション化し配列パッキング解消 | データ | 変革的 | XL | 🔴 |
| 16 | 欠点豆の画像削除/保存順序を是正し孤児・壊れ画像を防ぐ | 信頼性 | 中 | M | 🟠 |
| 17 | 真のデッドコード3ファイル＋未使用依存4つを削除・README誤記是正 | アーキ | 中 | S | ⚪ |
| 18 | App Check enforce 状態の確認・文書化＋OpenAI予算上限設定 | セキュリティ | 中 | S | 🟡 |

---

## 5. 改善を束ねた6テーマ（方向性の選択肢）

### テーマA: データを絶対に失わない・消えたら分かる（最優先）
> このアプリの一番怖い穴は「打ったのに消える、しかも誰も気づかない」こと。たった1行の throw 追加・Firestore 永続化・オフラインバナーの3点で、現場8名が毎日感じる『残ったか分からない不安』が消え、アプリを心から信頼できるようになります。

rank 1, 2, 3, 5, 16、中期: 15

### テーマB: 壊れても・通信が悪くても止まらない現場耐性
> iPad が白画面になったら現場の作業が止まります。エラー画面と復旧ボタン、本番エラーが保守者に届く仕組みを入れれば、『何が起きたか分からないまま詰む』状態から『再読み込みすれば戻る・原因も追える』状態へ。

rank 4, 11, 10

### テーマC: 手元の入力体験を毎日ラクにする
> 現場は手袋・片手・急ぎで数字を叩きます。テンキー最適化やモーダルの操作性は、1日何十回の入力の押し間違い（=集計ズレ）を直接減らします。

rank 7, 8、＋スケジュール「今日に戻る」・横移動ナビ・初回ヒント・生産記録のスマホ入力解放

### テーマD: どのテーマでも美しく・誰でも読める見た目
> 設計図（DESIGN.md とトークン）は一流なのに、一部のモーダルとボタンが図面を見ずに作られ、ダークテーマで白く浮いたり文字が読みにくかったりします。土台部品を直すだけで全画面に波及します。

rank 9, 13, 14

### テーマE: これ以上複雑にしない仕組み（初心者保守の防波堤）
> あなた（IK）が全コードを理解しきれなくても、『危険な変更は CI が止める』状態を作れます。依存方向の機械強制、デッドコード削除、ドキュメント誤記是正で、劣化を人の記憶ではなく仕組みで防ぎます。

rank 6, 17, 18、＋重要ディレクトリ限定のカバレッジしきい値

### テーマF: 現場の毎日を1本につなぐ業務OS化
> 機能が単体では良いのにバラバラで、現場の日次フロー全体をつなげていません。あなた自身が業務マニュアルで『次に作るべきもの』を言語化済みです。シール計算とマニュアル表示を実装すれば、手計算・紙運用が消え、属人化解消というこのアプリ本来の価値が初めて現場で動き出します。

rank 12、＋業務マニュアルのアプリ内表示・実プレミックス袋数の記録・月またぎ振り返り

---

## 6. 12次元の詳細findings

### 6.1 UX・ユーザーフロー（6/10）

ホームは7機能を最大4列カードで一覧化し、モバイル1タップで各機能へ到達できる迷わない設計。タップターゲット min-h-[56px]、入力欄 min-h-[44px]、aria-label も丁寧。空状態は EmptyState で統一、本日のスケジュールは自動保存（デバウンス500ms）。基盤は堅いが、現場の手元体験を詰め切れていない。

- 🔴 **保存失敗がユーザーに全く見えず、入力が静かに消える** [M]
  - 根拠: `hooks/useAppData.ts` updateData(279-292) が例外を console.error するだけで巻き戻し、トースト無し。`useTodayScheduleSync.ts` も同経路。
  - 改善: catch で showToast('保存に失敗しました…','error')。ヘッダーに保存状態インジケータ常設。
- 🟠 **数値入力が type=number のみでモバイル/iPadキーパッド未最適化** [S]
  - 根拠: `components/ui/NumberInput.tsx` に inputMode 指定なし。良品/不良品数・焙煎重量・時刻が対象。
  - 改善: 整数=`inputMode="numeric"`、重量=`"decimal"`。1コンポーネント修正で全数値入力に波及。
- 🟠 **生産記録がスマホで入力不可（iPad横向き必須）** [M]
  - 根拠: `app/production-record/page.tsx:360` の本体3列が `hidden md:grid`、536-543 で案内のみ。
  - 改善: 入力ボタンと入力モーダル（max-w-md 縦1列）だけスマホ解放。集計ビューは md 以上のままでよい。
- 🟡 **全ページの戻るがホーム直帰のみ、機能間を横移動できない** [M]
  - 根拠: `FloatingNav.tsx` の backHref が常に `/`。グローバルナビが layout に無い。
  - 改善: 下部ミニタブバー、まず schedule/assignment/production-record の相互リンク。
- 🟡 **スケジュールに「今日に戻る」ショートカットがない** [S] — isToday が false のとき「今日」ボタンを出すだけ。
- 🟡 **初回利用の案内・PWAインストール誘導・操作ヒントが皆無** [M] — 初回1枚ヒント＋beforeinstallprompt 捕捉。
- ⚪ **破壊的操作の確認が window.confirm 依存** [S] — `app/tasting/page.tsx:96,173`。既存 Dialog/Modal に統一。
- ⚪ **アプリ全体のエラーバウンダリが無い** [S] — error.tsx/global-error.tsx 追加。

**最大の機会**: 自動保存を「見える化」し、保存失敗を必ず伝えること。

### 6.2 ビジュアルデザイン・UI一貫性（7/10）

DESIGN.md（28KB）と globals.css のトークンシステムは秀逸。7テーマがセマンティック変数で完全定義、data-theme 切替で色が追従。コア共通UIの大半は適切。問題は実装の徹底度のムラ。

- 🟠 **ダーク系テーマで破綻する生Tailwind製モーダル/フォームが多数** [L]
  - 根拠: `TimeEditDialog.tsx`（毎日使用）が bg-white/text-gray-*/bg-amber-600 をハードコード。`NotificationModal.tsx`・`DatePickerModal.tsx`・`DefectBeanDetail.tsx`・`PasswordModal.tsx` も同型。DESIGN.md 11.1/11.4 で禁止のパターン。
  - 改善: 共通 Modal（contentClassName に bg-overlay）でラップ、bg-white→bg-overlay、text-gray→text-ink、border-gray→border-edge。毎日使う TimeEditDialog・NotificationModal から。
- 🟡 **モーダルのオーバーレイ濃度・z-index がファイルごとにバラバラ** [M] — bg-black/20〜/55 が5種混在、z-index も z-50〜z-[9999] 散在。Modal に集約。
- 🟡 **共通UI primitive 自身がトークンを使い切れていない** [M] — Button secondary が bg-gray-600 固定、primary が text-white、ProgressBar が bg-green/yellow/red-500。トークン化で全画面波及。
- 🟡 **assignment テーブルヘッダーのハードコードグレー** [M] — `DesktopTableHeader.tsx` の border-gray-700 等8箇所。
- ⚪ **タイポgrafが任意px値に散らばる** [M] — text-[12.5px] 等18ファイル41箇所。標準スケールへ寄せる。
- ⚪ **IconButton の sm/lg が44pxタッチ領域を満たさない可能性** [S]。
- ⚪ **dev/design-lab が本番ビルドに含まれハードコード色を持つ** [S] — 本番除外。

**最大の機会**: 生Tailwind再実装モーダル約10数個を共通Modal＋トークンに統一 → 7テーマすべてで破綻しない9点級へ。

### 6.3 アクセシビリティ（5/10）

フォーム系プリミティブ（Input/Select/Switch）は label 紐付け・useId・aria-invalid・role="alert" まで丁寧。html lang="ja"・ズーム阻害なし・axe-core を9ページで CI 実行。一方で構造面に穴。「自動テストは緑だが実際の WCAG AA は未達」という偽の安心状態。

- 🟠 **主要ボタンのコントラストが WCAG AA 未達** [S] — 白文字 on #e48003 = 2.84:1、warning = 1.79:1（基準4.5:1）。`globals.css` の `--spot`/`--btn-primary` を一段暗く。変数1箇所で全画面波及。
- 🟠 **axe の CI ゲートが critical のみで serious（コントラスト等）を素通り** [S] — `a11y.spec.ts:70-82`。serious をベースライン固定で失敗扱いに。
- 🟠 **共通 Modal に role/aria-modal/フォーカストラップ/復帰が無い** [M] — `Modal.tsx`、focus-trap 実装はコードベース全体で0件。1ファイル改修で全派生モーダルに効く。
- 🟠 **schedule の DatePickerModal が dialog でなく Escape テストが空振り** [M] — 共通Modal 不使用、role/Escape 無し、e2e は常に真で通る。
- 🟡 **prefers-reduced-motion が一部しか無効化していない** [M] — walk-characters/wobble/pulse-scale/gradient-shift が対象外。Framer は MotionConfig reducedMotion。
- 🟡 **Tabs/Accordion に aria-controls と矢印キー操作が無い** [M]。
- 🟡 **カメラ撮影オーバーレイが dialog 扱いでなくキーボード/SR非対応** [M] — alt も "Captured"/"Preview" と非説明的英語。
- ⚪ **Toast が事前生成ライブリージョンでなく role=alert 多重発火** [S]。
- ⚪ **Button に focus-visible リングが無い** [S]。

**最大の機会**: 共通 Modal に role/aria-modal/フォーカストラップ/Escape を一括実装 → 全モーダルがキーボード/SR操作可能に。

### 6.4 パフォーマンス（6/10）

8名・小データなら体感十分速い。ローカルwoff2＋display:swap、Lottie/Snowfall の dynamic 分離、時計の useSyncExternalStore、生産記録/担当表のサブコレクションは良い。体感を支配する構造的弱点が2つ。

- 🟠 **同一ユーザードキュメントへの onSnapshot リスナー重複** [M] — defect-beans で `useDefectBeans` と `useDefectBeanSettings` が各々 useAppData を呼び2本張る。useAppData を Context 化で1本に収束。
- 🟠 **SW が不変な静的チャンクも Network First 配信し PWAキャッシュが効かない** [S] — `public/sw.js:204-212` が全GETを fetch 優先。`_next/static`（約2.6MB）も毎回ネット待ち。Cache First 分岐を追加。
- 🟠 **全機能データを単一ドキュメント配列に集約、1項目更新でも全配列書き戻し** [XL] — 記録蓄積で送受信ペイロードが線形肥大。サブコレクション移行で解消。
- 🟡 **Firebase SDK 一式を起動時に一括初期化（最大チャンク388KB）** [L] — ホームは Firestore 不要なのに全SDKロード。遅延ゲッター化。
- ⚪ **未使用の react-markdown/remark-gfm が残存** [S]。
- ⚪ **fetchRecentAssignments が日数分の個別 getDocs を並列発行** [S] — 範囲クエリ1回に。
- ⚪ **Loading がマウントのたび Lottie JSON を再fetch** [S] — モジュールスコープにメモ化。

**最大の機会**: useAppData の Context 化（1ページ1リスナー）＋ SW で静的チャンクを Cache First。XL移行より先に低〜中コストで効く。

### 6.5 PWA・オフライン・現場耐性（3/10）⚠最低スコア

アプリシェルのオフライン化と更新フローは丁寧（Network First＋ランタイムキャッシュ上限80、no-cache ヘッダ、waiting SW 検出の更新UI）。production-record モーダルは保存失敗時に入力保持＋エラー表示する良い設計。しかし「電波が弱い前提で入力中にデータを失わない」核心が満たせていない。

- 🔴 **メインデータ保存が失敗を握りつぶし、編集を無言でサーバーの古い値に巻き戻す** [M] — `useAppData.ts` updateData、`lib/firebase.ts` はオフライン永続化なし。initializeFirestore + persistentLocalCache へ。
- 🔴 **tasting 新規セッション保存が「失敗しても成功扱い」で一覧へ遷移し記録喪失** [M] — `app/tasting/sessions/new/page.tsx` の handleSave は catch 設計だが updateData が reject しないため到達不能。
- 🟠 **欠点豆登録: 画像アップ成功後にメタ保存が黙って失敗し、記録消失＋孤児画像** [M]。
- 🟠 **オフライン検知・接続状態表示が皆無** [S] — navigator.onLine がリポジトリ全体で0件。useOnlineStatus ＋常設バナー。
- 🟠 **production-record の保存が runTransaction でオフライン時は必ず失敗** [L] — トランザクションはサーバー往復必須。
- 🟡 **lib/timeSync.ts が完全な未使用コード（137行）** [S] — clock/notifications は端末ローカル時計依存。削除 or 配線。
- 🟡 **SW が無条件 skipWaiting+claim でバージョン混在を起こし得る** [S] — applyUpdate 経由の明示更新に統一。
- ⚪ **インストール（A2HS）体験がブラウザ任せ、iOS案内なし** [S]。

**最大の機会**: lib/firebase.ts のオフライン永続化＋ updateData の握りつぶし是正。最大の穴を塞ぐ単一施策。

### 6.6 アーキテクチャ・コード品質（7/10）

型安全性は非常に優秀（本番コードに :any 0件、as any はデッドコード内1件のみ、tsc クリーン、循環依存0）。依存方向ルールを明文化し、knip/lizard/madge を整備、独自ESLintルールで共通UI使用を強制。一方で「ルールを機械的に守らせる仕組み」が欠け、違反が静かに混入。

- 🟠 **useAppData が12フィールド異種混在の単一ドキュメントを管理する中央神フック** [L] — 最もデータ損失リスクが高く理解困難。新フィールド追加で3箇所同期が必要。フィールド定義リスト駆動化＋段階的サブコレクション分離。
- 🟠 **依存方向違反が3件、しかも自動検知ゼロ** [M] — `lib/drip-guide/useRecipes.ts` が hooks を import（逆流）等。eslint に no-restricted-imports 追加。
- 🟡 **assignment 機能だけ別の構造哲学（コロケーション）で組織方針が二重化** [M] — どちらを正にするか決めて REPOSITORY.md に明記。
- 🟡 **TableModals が34フィールドの prop interface を持つ神コンポーネント（CCN127）** [L] — 625行。機能別4ファイルに分割。
- 🟡 **app/production-record/page.tsx が約600行の単一ページ** [L] — 状態管理をフック抽出、表示を薄く。
- 🟡 **品質ゲート（knip/lizard/madge）が CI 未接続で手動頼み** [S] — ci.yml に madge --circular（エラー）と knip（警告）を追加。
- ⚪ **真にデッドなファイル・依存が放置、knip 出力が dev用ノイズで埋もれる** [S] — 真のデッド3ファイル＋依存4つ削除、knip.json の ignore 整備。

**最大の機会**: eslint で依存方向を機械強制＋madge/knip を CI 接続 → 「危険な変更が CI で止まる」防波堤。

### 6.7 セキュリティ（8/10）🟢最高スコア

同規模個人開発PWAの平均を大きく上回る。owner isolation が全マッチで一貫実装され、`tests/rules/firebase.rules.test.ts` でエミュレータ実テスト＋2つの CI で検証。Cloud Functions は App Check enforce・認証・入力検証・レート制限（OCR 30回/分析 80回）・CORS allowlist の多層防御。OpenAI APIキーは Functions secrets 管理。マスターデータは write:false で遮断。

- 🟡 **Firestore ルールにフィールド単位の検証が皆無、本人が自分のドキュメントを任意に破壊・肥大化できる** [M] — productionRecords に絞った型ガード追加が費用対効果高。
- 🟡 **App Check の enforce 範囲が Functions のみ明示、Firestore/Storage が確認できない** [S] — コンソールで確認し運用ドキュメントに明記＋復旧チェックリスト化。
- 🟡 **EmailJS 問い合わせフォームが未認証から送信可能、公開キー露出** [M] — Allowed Origins を本番ドメインに限定＋簡易レート制限。
- ⚪ **rate-limit のトランザクションが超過時もリトライされ得る微小な抜け** [S] — 実害ほぼゼロ、OpenAI 側の予算上限を別途設定。
- ⚪ **OCR画像のサイズ上限がルール層（5MB）と Functions 層（約14MB）で二重基準** [S]。
- ⚪ **E2Eモックユーザーの固定UID/トークンが本番混入しないことが env ガード依存** [S] — out/ を CI で grep 検査。

**最大の機会**: まず App Check が Firestore/Storage に enforce されているか確定・記録。残るリスクの中核は「正規アプリ以外からの直接APIアクセスによるコスト攻撃」で、これを止める唯一の砦。

### 6.8 データモデル・Firestore設計（5/10）

二極化。生産記録は手本（サブコレクション分割＋集計の都度計算＋runTransaction の原子的 upsert）。一方レガシー主要データ（roastSchedules/todaySchedules/tastingSessions/tastingRecords/notifications/dripRecipes）は単一 users/{uid} ドキュメントの配列に同居し、これが Issue #458 の本番データ消失を実際に招いた。

- 🔴 **単一ドキュメントへの配列パッキングが本番データ消失を実際に引き起こした（再発リスク継続）** [XL] — `docs/superpowers/specs/2026-05-28-tasting-data-loss-recovery.md` に PITR ログ付きで実消失が記録。tasting から段階移行（読み取り旧構造フォールバック付き）。
- 🟠 **配列が無期限に増え続け、Firestore 1MiB 上限にいずれ到達** [L] — プルーン処理なし。直近窓だけ購読＋保持期間ポリシー。
- 🟠 **全データが完全にユーザー個別サイロで、8名のチーム共有が成立していない** [XL] — A さんの焙煎スケジュールが B さんに見えない。まず運用実態を確認、共有が必要なデータと個別でよいデータを仕分け。
- 🟡 **firestore.indexes.json が空で、複合インデックスがコードの try-catch フォールバック依存** [S] — 移行で where+orderBy 導入時に複合インデックスを追記する運用に。
- ⚪ **集計と元データの乖離リスクは production-record で解消済み、他領域でも明文化すべき** [S] — encouragementCount は increment() へ。
- ⚪ **FirestoreTimestamp 型が string | {seconds,nanoseconds} のユニオンで時刻比較が散在** [M] — toMillisSafe を lib 共通へ昇格。

**最大の機会**: tasting/tastingRecords を皮切りに、配列パッキングを production-record と同じサブコレクション方式へ段階移行。設計の正解を既に持っているため横展開で済む。

### 6.9 信頼性・エラーハンドリング・データ保護（5/10）

生産記録は runTransaction の upsert＋衝突ガード＋モーダルの正しいエラー表示。useAppData には write stream exhausted 対策の本格キュー（指数バックオフ・最大3回リトライ・バッチ分割）、データ消失防止ガード（localHasData 判定）まである。BACKUP_OPERATIONS.md も良質。一方で致命的な穴が2つ。

- 🔴 **updateData が保存失敗を握りつぶし成功扱いで返す（呼び出し側のエラー処理が全て死にコード）** [M] — catch 末尾に `throw saveError` 追加で全機能のエラートーストが生き返る。
- 🔴 **アプリ全体に Error Boundary / error.tsx / global-error.tsx が存在しない（白画面リスク）** [M] — Next 標準機構で復旧UI。
- 🟠 **Firestore オフライン永続化が無効** [M] — persistentLocalCache 導入。
- 🟠 **欠点豆削除/更新で Storage 画像を先に削除し Firestore 保存失敗を検知できない** [M] — 順序を「Firestore 成功確認後に Storage 削除」へ。
- 🟠 **バックアップが週1手動・自動ジョブ無し・復元の実地テスト未実施** [M] — 日次スケジュールバックアップ＋復元手順を一度通しでテスト＋代理実行者を1名。
- 🟡 **トーストが画面離脱/リロードで消え保存失敗の記録が残らない** [M] — error トーストは duration=0＋再試行ボタン。
- 🟡 **楽観的更新の巻き戻しが getUserData 1発に依存** [S]。
- ⚪ **通知の既読状態が localStorage のみでデバイス間非同期・消失しうる** [S]。

**最大の機会**: updateData を「保存失敗時に re-throw」する1点修正。投資対効果が群を抜く。

### 6.10 テスト・品質保証（7/10）

94ファイル791テストが CI で毎PR実行。owner isolation をエミュレータ実テストで網羅。生産記録の集計・CSV ロジックを550行で濃く保護。production-record.spec.ts が保存→集計→CSV を実エミュレータで通しE2E検証。Functions の入力検証・rate-limit もテスト済み。一方で「壊れると静かにデータが消える/化ける」経路が手薄。

- 🔴 **書き込みキューのリトライ・飽和・保留データ連鎖が実質ノーテスト** [M] — `write-queue.ts`（237行）の executeWrite リトライ/飽和/pendingData連鎖/バッチ分割が唯一のテスト2ケースで踏まれていない。オフライン耐性の心臓部。
- 🟠 **OCR結果を日次スケジュールへ上書きマージする処理が完全ノーテスト** [S] — `useScheduleOCR.ts`（テスト無し）が当日 todaySchedules を丸ごと差し替え。replace/add/null の3観点を追加。
- 🟠 **OCR Function の AI応答→スケジュール変換ロジックがテスト不能な構造で未検証** [M] — クロージャ private 関数。純粋関数 parseScheduleResponse に切り出して export＋テスト。
- 🟡 **Firestore 読み取り・購読のエラー経路（getUserData/subscribeUserData）が未テスト** [M]。
- 🟡 **通しE2Eが実Firestoreで走るのは生産記録のみ、試飲・欠点豆画像が薄い** [M]。
- ⚪ **カバレッジに数値ゲートが無く保護が劣化しても検知できない** [S] — 重要ディレクトリ限定の threshold。

**最大の機会**: write-queue.ts の executeWrite にテスト。データ安全性最優先のアプリで最も守るべき箇所が無防備。

### 6.11 プロダクト・機能機会（6/10・ドッグフーディング視点）

単機能の作り込みは良質（生産記録v1の一気通貫、試飲の memberId 連携）。一方で現場の日次フロー全体を1本につなぐ「業務OS」にはなっておらずサイロ化。決定的なのは、ユーザー自身が書いた `docs/roastplus_work_manual_hq_review_v0.3.md` §18.2 で「シール計算」「業務マニュアル表示」等を未実装の最優先候補と明記していること。"次に作るべきもの"は言語化済み。

- 🟠 **賞味期限シール計算がアプリ未実装（現場が手計算・紙運用、最優先候補）** [M] — §6.4 に確定式あり。`lib/productionRecords.ts` に純関数＋テストで実装、押印ミス（食品表示リスク）を下げる。
- 🟠 **業務マニュアルがアプリ内に無く、属人化解消というコアバリューを取りこぼしている** [M] — 既存マニュアルmdを Accordion で工程別表示。死んでいる app/brewing を受け皿に。
- 🟡 **パッケージ記録の A班/B班が担当表チーム（最大4班）と非連動・ハードコード** [M]。
- 🟡 **月をまたぐ振り返り（前月比・推移）がアプリ内に無く改善サイクルが回らない** [M] — 既存 subscribeRecentProductionMonths を活用した推移カード。
- 🟡 **豆マスタが3系統に分裂し機能間で豆データがつながらない** [L] — beanConfig を単一の出所に。
- 🟡 **プレミックス袋数が理論値表示のみで実測の記録手段が無い** [S] — RoastEntryInput に1フィールド追加、シール計算の入力源にも。
- ⚪ **app/brewing が「開発予定」の死にページで drip-guide と役割重複** [S]。
- ⚪ **スケジュールOCRと生産記録/担当表が分断、入力の二度手間** [L]。

**最大の機会**: 現場の日次フローを生産記録を軸に1本につなぎ、確定式のあるシール計算と業務マニュアル表示を実装。

### 6.12 保守性・開発者体験（6/10・初心者1名運用）

docs/steering/ の6文書は障害一次対応・依存方向・命名・テスト戦略まで網羅。CI は9並列ジョブ。write-queue の書き込みリトライは堅実。一方「本番で問題が起きたとき気づける仕組み」が完全欠落。static export でサーバーが無く、クライアント例外・Firestore 失敗は全て console.error に消える。

- 🟠 **本番クライアントエラーを検知する仕組みが皆無** [M] — error.tsx/global-error.tsx/ErrorBoundary/window.onerror すべて0件、Sentry 未導入。復旧UI＋errorLogs への最小ロガー。
- 🟡 **集約ロガーが無く console.* が49ファイル162箇所に散在（本番では不可視）** [M] — lib/logger.ts に薄い抽象。
- 🟡 **README と REPOSITORY.md に実態と異なる記述（存在しないスクリプト等）** [S] — 初心者がドキュメントを信じると確実に迷う。最優先で是正。
- 🟡 **CI のビルド環境変数が .env.example と乖離** [S] — 本番限定不具合の温床。棚卸し。
- 🟡 **Firestore 購読・書き込みの失敗時にユーザーへ通知する共通パターンが無い** [M]。
- ⚪ **maintenance スクリプトが Python製lizard に依存するが前提条件が未文書化** [S]。
- ⚪ **CI にデプロイ前の最終ゲートが無く firebase-hosting-merge が検証を再実装** [M]。
- ⚪ **無効化された claude.yml が .disabled のまま残置、メモリ記述と不一致** [S]。

**最大の機会**: 本番クライアント側の異常を「保守者が能動的に気づける」最小の経路を1本通す（復旧UI＋errorLogs ロガー）。

---

## 7. クイックウィン総まとめ（低コスト・高効果）

1. `useAppData.ts` の catch 末尾に `throw saveError` を1行追加 → 全機能のエラートーストが生き返り、嘘の『保存しました』を撲滅（**S**・影響は全機能）
2. `app/global-error.tsx` を1枚追加して『再読み込み』ボタン付き復旧UIに（**S**）
3. `NumberInput.tsx` に inputMode を追加（個数=numeric/重量=decimal）（**S**）
4. `useOnlineStatus` フック＋layout 常設オフラインバナー（**S**）
5. `public/sw.js` に `/_next/static/` を Cache First にする分岐を追加（**S**・効果大）
6. `ci.yml` に madge --circular を1ジョブ追加し循環依存を自動ブロック（**S**）
7. 真のデッド3ファイル（MarkdownRenderer.tsx, lib/sounds.ts, lib/timeSync.ts）＋未使用依存4つを削除（唯一の as any も消える）（**S**）
8. `globals.css` の `--spot`/`--btn-primary`/warning を AA 準拠の値に調整（**S**・変数1箇所）
9. README/REPOSITORY.md の実在しないスクリプト記述を実態に修正（**S**）

---

## 8. 次のステップ

「あらゆる面で100倍」は一度には実現できないため、**最も痛い穴（テーマA: データ安全性）を止めてから、テーマを1つずつ仕様→計画→実装**と進めるのが正攻法です。各テーマは独立した小さなプロジェクトとして、`docs/superpowers/specs/` に仕様、`docs/superpowers/plans/` に実装計画を残してから着手します。

**推奨の最初の一歩**: テーマA の Top3（rank 1〜4）。中核の rank 1 は数分で最大効果、Issue #458 の再発防止に直結します。
