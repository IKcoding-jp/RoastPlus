# Features

**最終更新**: 2026-06-05

---

## 目次

1. [担当表（Assignment）](#1-担当表assignment)
2. [スケジュール（Schedule）](#2-スケジュールschedule)
3. [試飲感想記録（Tasting）](#3-試飲感想記録tasting)
4. [コーヒー豆図鑑（Defect Beans）](#4-コーヒー豆図鑑defect-beans)
5. [ドリップガイド（Drip Guide）](#5-ドリップガイドdrip-guide)
6. [生産記録（Production Record）](#6-生産記録production-record)
7. [その他](#7-その他)

---

## 1. 担当表（Assignment）

### 目的
作業分担の自動割り当て、過去履歴の不公平感解消

### 主要ユースケース
1. 担当表自動生成（シャッフルロジック、出欠考慮）
2. デスクトップテーブルビュー（大画面最適化）
3. モバイルビュー（カード形式）
4. 担当履歴の記録・参照

### UI実装ルール

#### 共通コンポーネント使用
- ✅ **必須**: `@/components/ui` のButton、Card、Modal等を使用
- ❌ **禁止**: Tailwindで直接ボタン/カード/入力を作成

#### テーマ対応
- テーマはCSS変数（`data-theme`属性）で自動適用。コンポーネントへのテーマprop渡しは不要
- セマンティックユーティリティ（`bg-page`, `text-ink`, `border-edge`等）を使用

### 技術要素

| 要素 | 内容 |
|-----|------|
| **ページ** | `app/assignment/page.tsx` |
| **コンポーネント** | `app/assignment/components/assignment-table/DesktopTableView.tsx`<br>`app/assignment/components/assignment-table/TableModals.tsx` |
| **Firestore** | `users/{userId}` ドキュメント内のフィールド + 担当データはサブコレクション |
| **状態管理** | React useState のみ |

### 上限制限

| 項目 | 上限値 | 定数名 | 定義ファイル |
|-----|--------|--------|-------------|
| **班（Team）** | 4 | `MAX_TEAMS` | `app/assignment/lib/constants.ts` |
| **作業ラベル（TaskLabel）** | 8 | `MAX_TASK_LABELS` | `app/assignment/lib/constants.ts` |
| **メンバー（Member）** | 15 | `MAX_MEMBERS` | `app/assignment/lib/constants.ts` |

- 上限到達時: 追加ボタンを非表示（DesktopTableView, TableModals）
- 上限到達時のハンドラー呼び出し: warning Toast で通知（useTableEditing）
- 最後の1つを追加した直後: info Toast で上限到達を通知

### 設計方針

#### データモデル
```typescript
interface Assignment {
  id: string;
  date: string;
  tasks: {
    taskName: string;
    assignedTo: string;
  }[];
  createdAt: Timestamp;
}
```

#### シャッフルロジック
- 過去の担当履歴を考慮
- 出欠状況（`isPresent`）を反映
- 公平性スコアで評価
- **班内シャッフル制約**: `crossTeamShuffle` 設定（デフォルト: OFF）により、OFFの場合はメンバーが自分の班内でのみタスクを入れ替え、ONの場合は班をまたいだ配置が可能
- **大域最適化方式**: 「担当の連続」「ペアの再発」の各違反に履歴の新しさ（現在 > 1回前 > 2回前）で重み付けし、合計ペナルティが最小の配置を分枝限定法で探索する。両立不可能な構成でも違反最小のバランス解が選ばれる。同点の解からはランダムに選択
- **未割当枠（穴）の固定**: 未割当スロットの位置は「その担当を何人でやるか」という人数配置を表すため、シャッフルで移動しない（例: ペア必須の担当が1人になることを防ぐ）
- **ペアの長期公平性**: 直近2回の回避とは別に、過去20回分の履歴から各ペアの「最後に組んでからの経過」を算出し、最近組んだペアほど小さな追加ペナルティを与える。回転サイクルから漏れたペアが長期間発生しない「ペア飢餓」を防ぐ
- **制約優先順位**: `priority` 設定（`'pair'` | `'row'`、デフォルト: `'pair'`）により、対応する違反のペナルティ重みを引き上げ、ペア回避と行回避のどちらを優先するかを切り替える
- **ハード制約**: 未割当スロットの位置・ペア除外設定・タスク除外設定・班内モードの班一致・配置可能メンバーの完全配置（不可能な場合のみ最大配置に緩和）は常に厳守

#### 詳細設定モーダル（`AssignmentSettingsModal`）
- セクション1: シャッフル設定（全ユーザー表示）— 「班をまたいでシャッフル」トグル + 「シャッフルの優先順位」ラジオボタン（「同じ人との組み合わせを避ける」/「同じ作業の連続を避ける」）
- セクション2: ペア除外設定（isDeveloperModeのみ表示）
- 設定はFirestore `users/{userId}/assignmentSettings/shuffle` に永続化

### 禁止事項
1. ❌ 独自のテーブルコンポーネント作成（既存のDesktopTableViewを使用）
2. ❌ シャッフルロジックの後方互換を壊す変更（Issue認可済みの拡張は許可）

### 関連ADR
- [ADR-010] 機能別モジュール分割パターン（`docs/steering/TECH_SPEC.md` 参照）

---

## 2. スケジュール（Schedule）

### 目的
業務予定のOCR読み取り、一覧表示

### 主要ユースケース
1. スケジュール画像のOCR（Firebase Cloud Functions経由でGPT-4o Vision）
2. スケジュール一覧・編集
3. 今日の予定表示

### UI実装ルール

#### 共通コンポーネント使用
- ✅ **必須**: `Button`, `IconButton`, `Card` を使用

#### テーマ対応
- CSS変数による自動テーマ適用
- **コーヒー色アクセント**: `header-bg` CSS変数を使用（7テーマ自動対応）
  - 空状態アイコン: `bg-header-bg text-white`
  - ホバー効果: `hover:bg-header-bg/[0.04]`, `hover:border-header-bg/30`
  - ハードコード色（`#4E3526`, `#211714`等）の使用禁止 → `header-bg` を使用

#### スケジュールUI仕様
- **モバイル日付ナビ**: FloatingNav右側に統合（`fixed top-3 left-16 right-3`）
- **タブナビ**: セグメントコントロール風（Framer Motion フェードアニメーション）
- **中央OCRボタン**: タブバー中央に二重丸（`ring-4 ring-surface` + `bg-spot`）
- **ScheduleCard**: タイプ別左カラーバー（予熱=orange, ロースト=amber, パージ=blue, 掃除=gray）
- **時間バッジ**: `bg-surface text-ink border border-edge`（クリーンホワイト）
- **空状態**: `Card variant="guide"` + `bg-header-bg` アイコン円

### 技術要素

| 要素 | 内容 |
|-----|------|
| **ページ** | `app/schedule/page.tsx` |
| **OCR** | Firebase Cloud Functions v2 `ocrScheduleFromImage`（GPT-4o Vision）<br>クライアント: `httpsCallable(functions, 'ocrScheduleFromImage')` |
| **ロジック** | `lib/scheduleOCR.ts`（Cloud Functions呼び出しラッパー） |
| **Firestore** | `users/{userId}` ドキュメント内のフィールド |

### 設計方針

#### OCR処理
- **ツール**: Firebase Cloud Functions v2 経由でOpenAI GPT-4o Vision
- **理由**: [ADR-004] Google Vision API → OpenAI統一
- **呼び出し**: `httpsCallable(functions, 'ocrScheduleFromImage')` でクライアントから呼び出し
- **シークレット管理**: OPENAI_API_KEY は Firebase Secret Manager で管理

### 禁止事項
1. ❌ OCR処理のGoogle Vision API への戻し（OpenAI統一を維持）
2. ❌ API Routeでの実装（静的エクスポートのためCloud Functionsを使用）

### 関連ADR
- [ADR-004] OCR処理のOpenAI統一（`docs/steering/TECH_SPEC.md` 参照）

---

## 3. 試飲感想記録（Tasting）

### 目的
コーヒーの味わい評価、AI分析

### 主要ユースケース
1. テイスティングセッション作成
2. 評価スコア入力（6軸: bitterness, acidity, body, sweetness, aroma, overallRating）
3. AI分析（Firebase Cloud Functions経由でgpt-4o-mini）自動実行
4. 他ユーザーの感想閲覧

### UI実装ルール

#### 共通コンポーネント使用
- ✅ **必須**: `Button`, `Card`, `Textarea` を使用
- ❌ **禁止**: 評価スコア入力を生のinputで再実装（既存の`TastingRecordFormScores`を使用）

#### テーマ対応
- CSS変数による自動テーマ適用

### 技術要素

| 要素 | 内容 |
|-----|------|
| **ページ** | `app/tasting/page.tsx` |
| **コンポーネント** | `components/TastingSessionList.tsx`<br>`components/TastingSessionCarousel.tsx`<br>`components/TastingSessionCardDesktop.tsx`<br>`components/TastingSessionCardMobile.tsx`<br>`components/TastingRecordForm.tsx`<br>`components/TastingRecordFormScores.tsx` |
| **AI** | Firebase Cloud Functions v2 `analyzeTastingSession`（gpt-4o-mini）<br>クライアント: `httpsCallable(functions, 'analyzeTastingSession')` |
| **Firestore** | `users/{userId}` ドキュメント内のフィールド |

### 設計方針

#### 評価スコア
- **6軸評価**: bitterness（苦味）, acidity（酸味）, body（ボディ）, sweetness（甘み）, aroma（香り）, overallRating（総合）
- **スコア**: 1〜5の5段階評価

#### AI分析
- **自動実行**: セッション内の評価記録を元に、自動的にAI分析を実行
- **実装**: Firebase Cloud Functions v2で`analyzeTastingSession`関数を呼び出し
- **モデル**: OpenAI gpt-4o-mini（テキスト生成）
- **プロンプト**: 評価スコアを元に、コーヒーの特徴を解析

#### データモデル
```typescript
interface TastingSession {
  id: string;
  userId: string;
  coffeeName: string;
  roastLevel?: string;
  aiAnalysis?: string;
  createdAt: Timestamp;
}
```

### 禁止事項
1. ❌ 評価スコア軸の互換性を壊す変更
2. ❌ AI分析の手動実行化（自動実行を維持）

### 関連ADR
- [ADR-005] AI分析を自動実行パターンに変更（`docs/steering/TECH_SPEC.md` 参照）

---

## 4. コーヒー豆図鑑（Defect Beans）

### 目的
欠点豆の種類・特徴・写真の参照

### 主要ユースケース
1. 欠点豆一覧の閲覧（検索・ソート対応）
2. 欠点豆の詳細表示（写真・説明）
3. 設定（表示件数・ソート順）の保存

### UI実装ルール

#### 共通コンポーネント使用
- ✅ **必須**: `Button`, `Card`, `Input` を使用
- ❌ **禁止**: 独自の検索・ソートUIを作成（`FilterMenu`コンポーネントを使用）

#### テーマ対応
- CSS変数による自動テーマ適用

### 技術要素

| 要素 | 内容 |
|-----|------|
| **ページ** | `app/defect-beans/page.tsx`（一覧・詳細表示を同一画面で扱う） |
| **コンポーネント** | `components/defect-beans/FilterMenu.tsx`（検索・絞り込み・ソートを統合したモーダル）<br>`components/defect-beans/EmptyState.tsx`<br>`components/DefectBeanCard.tsx`（フェードインアニメーション・優先度制御対応） |
| **フック** | `hooks/useDefectBeans.ts`（アップロード前の画像圧縮を統合）<br>`hooks/useDefectBeanSettings.ts` |
| **ユーティリティ** | `lib/imageCompression.ts`（Canvas APIベースのクライアントサイド画像圧縮） |
| **Firestore** | `defectBeans` コレクション（共有データ、全ユーザー共通） |
| **画像** | `public/images/`（静的コンテンツ） |

### 設計方針

#### データアクセス
- **共有データ**: `defectBeans` コレクションは全ユーザー共通（`users/{userId}` 配下ではない）
- **読み取り専用**: クライアントからの書き込みは禁止。Firebase Consoleまたは管理スクリプトで管理

#### 画像最適化
- **アップロード時圧縮**: Canvas APIで最大800px・JPEG品質80%に圧縮してからFirebase Storageにアップロード（`lib/imageCompression.ts`）
- **フェードイン表示**: 画像読み込み完了時に`opacity: 0→1`のトランジションで表示のばらつきを解消
- **優先度制御**: グリッド1行目（最大5枚）は`priority`で即時読み込み、2行目以降は遅延読み込み

### 禁止事項
1. ❌ クライアントからの欠点豆データ書き込み（読み取り専用）
2. ❌ 欠点豆データのユーザー個別管理（共有データを維持）

---

## 5. ドリップガイド（Drip Guide）

### 目的
ドリップ抽出手順の案内、レシピ管理

### 主要ユースケース
1. デフォルトレシピ（BYSN Standard / 井崎流 / 4:6メソッド）
2. カスタムレシピ作成・編集・削除
3. ガイド実行（タイマー付き、音声案内）
4. 人前（1〜8杯）のスケーリング

### UI実装ルール

#### 共通コンポーネント使用
- ✅ **必須**: `Button`, `Card`, `Input`, `Modal` を使用
- ❌ **禁止**: レシピ一覧・実行画面を生のTailwindだけで再実装（既存の`RecipeList`、`DripGuideRunner`を使用）

#### テーマ対応
- CSS変数による自動テーマ適用

### 技術要素

| 要素 | 内容 |
|-----|------|
| **ページ** | `app/drip-guide/page.tsx`（レシピ一覧）<br>`app/drip-guide/run/page.tsx`（ガイド実行） |
| **コンポーネント** | `components/drip-guide/RecipeList.tsx`<br>`components/drip-guide/RecipeForm.tsx`<br>`components/drip-guide/DripGuideRunner.tsx`<br>`components/drip-guide/runner/FocusGuideDisplay.tsx`<br>`components/drip-guide/runner/FooterControls.tsx` |
| **ロジック** | `lib/drip-guide/recipeCalculator.ts`（レシピ計算）<br>`lib/drip-guide/recipe46.ts` / `recipe46Content.ts`（4:6メソッド）<br>`lib/drip-guide/countdownAudio.ts`（カウントダウン音） |
| **フック** | `hooks/drip-guide/useRecipes.ts`、`hooks/drip-guide/useRunnerTimer.ts`、`hooks/drip-guide/useDialogKeyboard.ts` |
| **Firestore** | `users/{userId}` ドキュメント内のフィールド |

### 設計方針

#### デフォルトレシピの追加方針
- `lib/drip-guide/mockData.ts` の `MOCK_RECIPES` 配列に追加する（新規ファイル不要）
- 表示順は `components/drip-guide/RecipeList.tsx` の `defaultOrder` 配列で管理: `['recipe-001', 'recipe-003', 'recipe-046']`
- `isManualMode: true` のレシピは `StartHintDialog` に「手順はタップで進みます」の説明が表示される

#### レシピ計算
- **4:6メソッド**: `lib/drip-guide/recipe46.ts` で計算ロジック実装
- **スケーリング**: 人前（servings）に応じて豆量・湯量を調整（`lib/drip-guide/recipeCalculator.ts`）
- **BYSN Standard Drip の非線形スケーリング**: 公式早見表どおりの粉量を `beanAmountByServings`（1〜8人前）で持ち、線形倍率ではなくテーブル参照でスケールする。注湯量は線形（公式と一致）、蒸らし湯は粉量に連動。`beanAmountByServings` 未指定のレシピ（4:6・井崎流・アイス）は従来の線形倍率のまま。

#### 音声案内
- **Web Audio API**: タイマー完了時に音声再生
- **音声ファイル**: `public/sounds/` に配置

### 禁止事項
1. ❌ レシピ計算ロジックの根本的変更（拡張は可）
2. ❌ デフォルトレシピ（4:6メソッド）の削除

### 関連ADR
- [ADR-010] サブモジュール分割（`docs/steering/TECH_SPEC.md` 参照）

---

## 6. 生産記録（Production Record）

### 目的
月生産単位で、ハンドピック・焙煎・パッケージの実績を一画面にまとめ、本社向けの月合計CSVを出力する。

### 主要ユースケース
1. 月生産単位を選択する。
2. 月生産設定（生豆総量、豆の種類、配合比率、1袋あたり粉量）を保存する。
3. 生豆ハンドピック記録を入力する。
4. 焙煎前重量・焙煎後重量を入力し、歩留まりを確認する。
5. A班/B班の良品数・不良品数を入力し、月合計を確認する。
6. 本社向けの月合計CSVを出力する。

### UI実装ルール

#### 共通コンポーネント使用
- ✅ **必須**: `Button`, `Card`, `Modal`, `Input`, `NumberInput`, `Select` を使用
- ❌ **禁止**: 削除機能、原価入力、原価計算、詳細CSVを v1 に追加しない

#### レイアウト
- iPad横向きでの現場利用を優先し、3列構成（生豆ハンドピック / 焙煎 / パッケージ）を基本にする。
- 月設定・各記録の入力はモーダルで行う。
- 保存後はモーダルを閉じ、3列画面に戻る。
- 最新2件を編集対象として扱う。

### 技術要素

| 要素 | 内容 |
|-----|------|
| **ページ** | `app/production-record/page.tsx` |
| **コンポーネント** | `components/production-record/MonthSettingsModal.tsx`<br>`components/production-record/HandpickEntryModal.tsx`<br>`components/production-record/RoastEntryModal.tsx`<br>`components/production-record/PackageEntryModal.tsx` |
| **ロジック** | `lib/productionRecords.ts`（検証、集計、CSV生成、ファイル名生成） |
| **Firestore** | `users/{userId}/productionRecords/{month}` と配下サブコレクション |
| **フック** | `hooks/useProductionRecord.ts` |
| **型** | `types/production-record.ts` |
| **E2E** | `e2e/production-record.spec.ts` |

### データモデル

```text
users/{userId}/productionRecords/{YYYY-MM}
  handpickEntries/{entryId}
  roastEntries/{entryId}
  packageEntries/{entryId}
```

| 種別 | 役割 |
|------|------|
| 月doc | 月生産設定、生豆総量、配合、1袋あたり粉量 |
| `handpickEntries` | 豆ごとのハンドピック実績、欠点豆重量 |
| `roastEntries` | 焙煎前重量、焙煎後重量、焙煎歩留まり |
| `packageEntries` | A班/B班の良品数・不良品数 |

### 集計・CSV
- 月合計は `lib/productionRecords.ts` の `buildMonthlySummary` を正とする。
- CSVはBOM付きで生成し、Excel取り込みを前提にする。
- CSVファイル名は `production-record-{YYYY-MM}.csv`。

### v1でやらないこと
1. ❌ 原価入力・原価計算
2. ❌ アフターピック記録
3. ❌ 削除機能
4. ❌ 明細CSV
5. ❌ ロット管理
6. ❌ 自動繰越し

---

## 7. その他

### スプラッシュ画面（Splash Screen）

#### 目的
PWA起動時のブランドアニメーション表示、OSネイティブスプラッシュとのシームレス接続

#### 仕様
- **表示条件**: セッション中の初回起動のみ（sessionStorage `roastplus_splash_shown` キーで制御）
- **表示時間**: 2800ms（フェードアウト500ms含め計3300ms）
- **アニメーションパターン**: 5種類からランダム選択
  - Fade Up: ロゴが下から浮き上がりフェードイン
  - Scale Breathe: ロゴが拡大出現後、微呼吸パルス
  - Letter Stagger: 文字が1文字ずつ順番にフェードイン
  - Slide Reveal: 「Roast」左から、「Plus」右からスライドして合流
  - Glow Pulse: ブラーから出現+オレンジグロー
- **背景色**: `#261a14`（manifest.json の `background_color` と一致でシームレス遷移）

#### 実装ファイル
| ファイル | 役割 |
|---------|------|
| `components/splash/patterns.tsx` | 5パターンのアニメーションコンポーネント定義 |
| `components/SplashScreen.tsx` | 表示制御・タイマー管理・フェードアウト |
| `components/SplashScreenWrapper.tsx` | `dynamic import { ssr: false }` でSSR無効化 |

#### 実装上の注意
- **SSR無効化必須**: `SplashScreenWrapper` を `app/layout.tsx` 内で使用（sessionStorageにSSRからアクセス不可のため）
- **`breathe` keyframes**: `app/globals.css` に定義（`<style jsx global>` は Next.js 15+で動作しないため）
- **page.tsx の splashVisible**: スプラッシュ表示中に `<Loading />` を非表示にするためのタイマー制御（SplashScreen の実際の表示状態とは非同期）

---

### 共通UI（UI Components）

#### 目的
デザイン統一、マルチテーマ対応

#### コンポーネント一覧

最新のエクスポートは `components/ui/index.ts` を正とする。

**ボタン系**
- **Button**: 基本ボタン（variant: primary, secondary, ghost）
- **IconButton**: アイコンボタン

**フォーム系**
- **Input**: テキスト入力
- **NumberInput**: 数値入力
- **InlineInput**: インライン編集可能入力
- **Textarea**: 複数行テキスト入力
- **Select**: セレクトボックス
- **Checkbox**: チェックボックス
- **Switch**: トグルスイッチ

**コンテナ系**
- **Card**: カード（variant: default, table, feature）
- **Modal**: モーダルダイアログ
- **Dialog**: ダイアログ
- **FilterModal**: 絞り込み用モーダル

**表示系**
- **Badge**: バッジ
- **Tabs**: タブ（TabsList, TabsTrigger, TabsContent）
- **Accordion**: アコーディオン（AccordionItem, AccordionTrigger, AccordionContent）
- **ProgressBar**: プログレスバー
- **EmptyState**: 空状態表示

**ナビゲーション系**
- **BackLink**: 戻るリンク
- **FloatingNav**: フローティングナビゲーション
- **RoastLevelBadge**: 焙煎度バッジ

#### 技術要素

| 要素 | 内容 |
|-----|------|
| **ディレクトリ** | `components/ui/` |
| **エクスポート数** | 固定値を書かず、`components/ui/index.ts` を参照 |
| **確認方法** | `components/ui/index.ts` と各コンポーネントの `.test.tsx` を正とする |

#### UI実装ルール（重要：全機能共通）

**1. 共通コンポーネント使用必須**
- ✅ **必須**: `@/components/ui` のコンポーネントを使用
- ❌ **禁止**: 生のTailwindでボタン/カード/入力を作成

**2. テーマ対応はCSS変数で自動**
- テーマ切替は `data-theme` 属性 + CSS変数で自動適用（7テーマ対応）
- コンポーネント側でのテーマ判定は不要
- テーマ固有の装飾要素（snowfall等）のみ、CSS `[data-theme]` セレクタまたは `useAppTheme()` で条件レンダリング

```tsx
// ✅ テーマは自動適用。propは不要
<Button variant="primary">保存</Button>
<Card variant="table">...</Card>
<Input label="名前" />

// ✅ テーマ固有の装飾要素のみ条件レンダリング
const { isChristmasTheme } = useAppTheme();
{isChristmasTheme && <Snowfall />}

// ❌ テーマをpropで渡さない
<Button theme="christmas">保存</Button>
```

**3. 配色参照**
- ✅ **参照**: `DESIGN.md`、`docs/steering/FEATURES.md` のテーマシステム

**4. 新規コンポーネント追加時の登録**
新しい共通UIコンポーネントを作成した場合、**必ず以下の手順で登録すること**：

1. `components/ui/NewComponent.tsx` を作成
2. `components/ui/index.ts` にエクスポートを追加
3. 既存パターンに合わせた `.test.tsx` を追加する
4. 必要に応じて `FEATURES.md` / `REPOSITORY.md` の共通UI一覧を更新する

#### テーマシステム

**アーキテクチャ**
- **テーマ管理**: `next-themes` ライブラリ（SSR対応、フラッシュ防止、タブ間同期）
- **テーマ定義**: CSS変数（`@layer theme` in `globals.css`）
- **テーマプロバイダー**: `components/ThemeProvider.tsx`（アプリ全体をラップ）
- **テーマ定数**: `lib/theme.ts`（テーマプリセット定数、ThemePreset型、isDarkTheme関数）
- **テーマ保存**: localStorage（端末ごとに独立、Firestoreには保存しない）
- **テーマ切替属性**: `data-theme` 属性（`<html>` 要素に付与）

**利用可能テーマ（7種類）**

| テーマID | 表示名 | タイプ | コンセプト |
|---------|--------|--------|-----------|
| `default` | デフォルト | ライト | 暖かいコーヒー系ライトテーマ |
| `dark-roast` | ダークロースト | ダーク | 深煎りエスプレッソの高級感 |
| `light-roast` | ライトロースト | ライト | 浅煎りの朝のハンドドリップ感 |
| `matcha` | 抹茶ラテ | ダーク | 和カフェの落ち着き |
| `caramel` | キャラメルマキアート | ダーク | 秋の収穫祭の温かさ |
| `christmas` | クリスマス | ダーク | ホリデーシーズンの特別テーマ |
| `dark` | ダーク | ダーク | 汎用ダークモード・目の疲れ防止（WCAG AA 14.5:1） |

**セマンティックCSS変数トークン**

| カテゴリ | トークン | 用途 |
|---------|---------|------|
| 背景 | `bg-page` | ページ全体の背景 |
| 背景 | `bg-surface` | カード・パネル背景（半透明OK） |
| 背景 | `bg-overlay` | モーダル・ダイアログ背景（不透明必須） |
| 背景 | `bg-ground` | セクション背景・テーブルヘッダー |
| 背景 | `bg-field` | 入力フィールド背景 |
| テキスト | `text-ink` | 本文テキスト |
| テキスト | `text-ink-sub` | 補足テキスト |
| テキスト | `text-ink-muted` | 薄いテキスト |
| ボーダー | `border-edge` | 通常ボーダー |
| ボーダー | `border-edge-strong` | 強調ボーダー |
| アクセント | `bg-spot` / `text-spot` | アクセントカラー |
| アクセント | `bg-spot-hover` | ホバー時アクセント |
| アクセント | `bg-spot-subtle` / `bg-spot-surface` | 薄いアクセント背景 |

**CSS変数の使い分け（重要）**

| 変数 | 通常モード | ダークテーマ | 用途 |
|------|-----------|-------------|------|
| `bg-surface` | `#FFFFFF` | `rgba(255,255,255,0.05)` | カード・セクション（半透明OK） |
| `bg-overlay` | `#FFFFFF` | 不透明な暗色 | モーダル・ダイアログ（不透明必須） |
| `bg-ground` | `#F3F4F6` | `rgba(255,255,255,0.08)` | ページ背景・テーブルヘッダー |

**テーマhook**

| hook | 用途 |
|------|------|
| **`useAppTheme()`** | 汎用テーマhook（currentTheme, setTheme, presets, isDarkTheme, isChristmasTheme） |
| **`useChristmasMode()`** | クリスマステーマ切替用（toggleChristmasMode等。Design Lab等で使用） |

**テーマ固有装飾の実装方法**
1. **CSS `[data-theme]` セレクタ（推奨）**: `[data-theme="christmas"] .my-element { display: block; }`
2. **`useAppTheme().isChristmasTheme`**: JSX内の条件レンダリングが必要な場合
3. **用途限定**: 条件レンダリングのみ。コンポーネントへのテーマprop渡しには使わない

#### ESLintカスタムルールによる自動検出

ESLintカスタムルール（`no-raw-button`, `no-raw-checkbox`, `no-raw-select`）が、生のHTML要素（`<button>`, `<input type="checkbox">`, `<select>`）の使用を自動で検出する。共通UIコンポーネント（`Button`, `Checkbox`, `Select`）の使用漏れを防止する仕組み。

#### 共通UIの禁止事項
1. ❌ 共通コンポーネントの重複作成（既存コンポーネントを必ず確認）
2. ❌ 生のTailwindでのボタン/カード/入力作成
3. ❌ テーマをpropとしてコンポーネントに渡す（CSS変数で自動対応）
4. ❌ ハードコード色の使用（セマンティックCSS変数を使用すること）
5. ❌ モーダル背景に `bg-surface` を使用（ダークテーマで透過するため `bg-overlay` を使用）

### 通知（Notifications）
- **目的**: バージョン更新通知
- **技術**: トースト通知（`toast()`）

### 設定（Settings）
- **目的**: 開発者モード、テーマ設定、アプリバージョン管理
- **パス**: `/settings`（設定一覧）、`/settings/theme`（テーマ設定専用ページ）
- **技術**: localStorage（テーマ、開発者モード）
- **テーマ設定UI**: パターンBデザイン（デスクトップ4列/モバイル2列）で7テーマプリセットから選択。各カードはwhite背景+border、テーマカラーの48px丸カラードット（`previewGradient`グラデーション）、テーマ名（15px bold）、説明文（12.5px）、選択時は右上に黄金チェックマーク（20px丸）。アニメーションなし・LIGHT/DARKバッジなし・色スウォッチなし

### お問い合わせ（Contact）
- **目的**: ユーザーからの質問・不具合報告・要望受付
- **パス**: `/contact`
- **技術**: EmailJS（`@emailjs/browser`）、`NEXT_PUBLIC_EMAILJS_*` 環境変数
- **注意**: クライアント側で扱う公開設定のみを使用し、秘密情報は置かない

### デジタル時計（Clock）
- **目的**: iPadを現場に置き、遠距離から時刻・日付・曜日・次の作業区切りを確認できる大型デジタル時計表示
- **パス**: `/clock`
- **技術**: localStorage（表示設定・作業/休憩時間帯設定）、Web Audio API（作業チャイム音）
- **作業チャイム**: 設定した作業・休憩の時間帯から現在状態と次の区切りを表示し、休憩開始・作業開始の時刻にA案のやわらかい現場チャイム音と中央通知パネルで知らせる。音声アナウンスは初期値OFF

### データ安全・復旧UI
- **オフラインバナー**: `components/OfflineBanner.tsx` と `hooks/useOnlineStatus.ts` で通信断を表示する。
- **Firestoreオフライン永続化**: `lib/firebase.ts` でブラウザ環境のみIndexedDB永続化を有効化し、エミュレータ時は無効化する。
- **白画面防止**: `app/error.tsx` と `app/global-error.tsx` で再読み込み導線を表示する。
- **保存失敗の扱い**: 保存失敗は呼び出し元へ伝え、成功トーストだけで隠さない。

### 関連ADR
- [ADR-008] ロゴを画像からテキストベースに変更（`docs/steering/TECH_SPEC.md` 参照）
- [ADR-011] next-themes + Tailwind v4 CSS変数によるテーマシステム（`docs/steering/TECH_SPEC.md` 参照）

---

## Firestoreデータモデル概要

本アプリのユーザー別データは主に `users/{userId}` ドキュメント内のフィールド、または `users/{userId}` 配下のサブコレクションとして格納される。トップレベルに共有データを置く例は限定的。

| データ種別 | 格納場所 | 備考 |
|-----------|---------|------|
| ユーザー情報 | `users/{userId}` ドキュメント | プロファイル、設定等 |
| ドリップレシピ | `users/{userId}` のフィールド | |
| テイスティング | `users/{userId}` のフィールド | |
| スケジュール | `users/{userId}` のフィールド | |
| 担当表 | `users/{userId}` 配下のサブコレクション | Assignment固有のデータ構造 |
| 生産記録 | `users/{userId}/productionRecords/{YYYY-MM}` と配下サブコレクション | 月生産設定、ハンドピック、焙煎、パッケージ |
| 欠点豆 | `defectBeans` コレクション | 共有データ（全ユーザー共通） |
| メタデータ | `_meta` コレクション | システム管理用 |

---

## AI機能概要

本アプリではOpenAI APIをFirebase Cloud Functions v2経由で使用する。API Routeは使用しない（静的エクスポートのため）。

| 機能 | Cloud Function名 | AIモデル | 用途 |
|------|-----------------|---------|------|
| スケジュールOCR | `ocrScheduleFromImage` | GPT-4o（Vision） | 画像からスケジュール情報を抽出 |
| テイスティング分析 | `analyzeTastingSession` | gpt-4o-mini（テキスト） | フレーバー評価のAI分析 |

**呼び出し方法**: クライアント側で `httpsCallable(functions, 'functionName')` を使用
**シークレット管理**: OPENAI_API_KEY は Firebase Secret Manager で管理
**Cloud Functions配置**: `functions/src/` ディレクトリ
**利用制限**: `functions/src/rate-limit.ts` でユーザー・関数・日付単位の日次上限を確認する

---

## 共通禁止事項（全機能共通）

### 1. UI実装
- ❌ 独自のCSS作成（共通コンポーネント使用必須）
- ❌ `@/components/ui` を使わずにボタン/カード/入力を作成
- ❌ ハードコード色の使用（CSS変数テーマを使用すること）
- ❌ テーマをpropとしてコンポーネントに渡す

### 2. 状態管理
- ❌ 新しい状態管理ライブラリの導入（React useStateで統一）
- ❌ グローバル状態の乱用（ページローカル状態を優先）

### 3. API・バックエンド
- ❌ API Routeの作成（静的エクスポートのためCloud Functionsを使用）
- ❌ クライアント側でのOpenAI API直接呼び出し（Cloud Functions経由必須）

### 4. 設計変更
- ❌ 既存の設計方針を変更する（変更が必要な場合は相談）
- ❌ Firestoreスキーマの根本的変更（互換性維持）

### 5. セキュリティ
- ❌ APIキー・シークレットのコミット（`.env.local` に配置）
- ❌ Firestore Security Rules の緩和（認証必須を維持）

### 6. ドキュメント参照
- ❌ `docs/memory.md` への参照（ADRは `docs/steering/TECH_SPEC.md` に記載）

---

## 機能追加時のチェックリスト

新機能追加時は、以下を確認すること：

- [ ] `@/components/ui` の共通コンポーネントを使用
- [ ] CSS変数テーマが正しく適用されている（ハードコード色なし）
- [ ] 全7テーマで表示確認（特にライト系/ダーク系の切替）
- [ ] `docs/steering/UBIQUITOUS_LANGUAGE.md` に新規用語を追加
- [ ] `docs/steering/FEATURES.md` に機能を追記（本ファイル）
- [ ] Firestore Security Rules を更新（必要な場合）
- [ ] テストを作成（Vitest）
- [ ] 必要に応じてE2Eまたは手動確認を追加

---

## 参照

- **プロダクトビジョン**: `docs/steering/PRODUCT.md`
- **技術仕様・ADR**: `docs/steering/TECH_SPEC.md`
- **ユビキタス言語**: `docs/steering/UBIQUITOUS_LANGUAGE.md`
- **実装ガイドライン**: `docs/steering/GUIDELINES.md`
- **リポジトリ構造**: `docs/steering/REPOSITORY.md`
