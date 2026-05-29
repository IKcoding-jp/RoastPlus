# 生産記録 v1 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ドリップパックコーヒー製造の月生産記録（生豆ハンドピック・焙煎・パッケージ）を iPad 横向き 3 列画面で記録し、本社向け月合計 CSV（12 項目）を出力する機能を、既存「パッケージ記録」を置き換える形で実装する。

**Architecture:** 既存 `productionPackRecords` と同じ 3 層構成を踏襲する。純粋ロジック層（`lib/productionRecords.ts`：計算・バリデーション・CSV 生成）／ Firestore 層（`lib/firestore/productionRecords.ts`：月ドキュメント + 3 サブコレクションの CRUD・購読）／ ページ・UI 層（`app/production-record/page.tsx` + `components/production-record/*` モーダル）。計算系は TDD（Red/Green/Refactor）で実装する。

**Tech Stack:** Next.js 16 App Router（本番は静的エクスポート `output: 'export'`）／ React 19 ／ TypeScript 5 strict ／ Firebase Firestore（owner isolation）／ Tailwind CSS 4 ／ Vitest（co-located テスト）。

**仕様書:** `docs/superpowers/specs/2026-05-29-production-record-v1-design.md`（本社承認済みの確定版）

---

## ファイル構造

| 操作   | パス                                                                                                                                                                          | 役割                                                                        |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Create | `types/production-record.ts`                                                                                                                                                  | 型定義（Month/Handpick/Roast/Package の Input・Record、Summary）            |
| Create | `lib/productionRecords.ts` (+ `.test.ts`)                                                                                                                                     | 純粋ロジック（欠点率・歩留まり・30kg理論袋数・月累計・CSV・バリデーション） |
| Create | `lib/firestore/productionRecords.ts` (+ `.test.ts`)                                                                                                                           | Firestore：月doc + 3サブコレクションの CRUD・onSnapshot 購読                |
| Create | `hooks/useProductionRecord.ts` (+ `.test.ts`)                                                                                                                                 | 月doc + 3サブコレクションをまとめて購読するフック                           |
| Create | `components/production-record/MonthSettingsModal.tsx`                                                                                                                         | 月生産設定モーダル（生豆総量・配合・粉量）                                  |
| Create | `components/production-record/HandpickEntryModal.tsx`                                                                                                                         | 欠点豆入力モーダル                                                          |
| Create | `components/production-record/RoastEntryModal.tsx`                                                                                                                            | 焙煎入力モーダル                                                            |
| Create | `components/production-record/PackageEntryModal.tsx`                                                                                                                          | パッケージ入力モーダル                                                      |
| Create | `app/production-record/page.tsx`                                                                                                                                              | 3列メインページ（iPad横向き）+ CSV出力                                      |
| Modify | `types/index.ts`                                                                                                                                                              | `export * from './production-record'` 追加                                  |
| Modify | `lib/firestore/index.ts`                                                                                                                                                      | 新規 Firestore 関数の re-export 追加                                        |
| Modify | `firestore.rules`                                                                                                                                                             | `productionRecords` の owner isolation ルール追加                           |
| Modify | `tests/rules/firebase.rules.test.ts`                                                                                                                                          | `productionRecords` のルールテスト追加                                      |
| Modify | `lib/homeFeatures.ts`                                                                                                                                                         | 生産記録の機能登録（最終フェーズでパッケージ記録を除去）                    |
| Modify | `app/page.tsx`                                                                                                                                                                | ホーム導線追加（最終フェーズでパッケージ記録を除去）                        |
| Delete | `app/production-packs/**`、`lib/productionPackRecords.*`、`lib/firestore/productionPackRecords.*`、`types/production-pack-record.ts`、`e2e/production-packs.spec.ts` ほか参照 | 既存パッケージ記録一式（**最終フェーズ F** で削除）                         |

---

## フェーズ順序と依存

```
A（型・純粋ロジック） → B（Firestore層） → C（Rules・購読フック） → D（入力モーダル×4） → E（3列ページ・CSV） → F（ホーム導線・旧パッケージ記録の削除）
```

- A〜C は計算・データ層で TDD（Red→Green→Commit）。D・E は UI で完全な実装コード + 手動確認。
- **F の削除は、生産記録が動作確認できてから最後に行う**。各削除後に `npm run build && npm run test:run` で参照漏れがないことを確認する。
- 各コミット前に `npm run build && npm run test:run && npm run format:check` を実行する（format 漏れで CI が落ちる既知の落とし穴）。

---

## フェーズA: 型定義と純粋ロジック層

このフェーズでは Firestore に一切依存しない型定義と純粋ロジック関数を実装する。すべての関数はTDD(Red/Green/コミット)で作る。雛形は `lib/productionPackRecords.ts` / `lib/productionPackRecords.test.ts` のスタイルを踏襲するが、計算式・型・CSV列は生産記録固有のため完全なコードで示す。

各テストは `npx vitest run lib/productionRecords.test.ts` で実行する。実装は1ファイル `lib/productionRecords.ts` に関数を継ぎ足していくので、テストファイルも同一ファイルに `describe` を追記していく。

---

### Task: A-1 型定義 types/production-record.ts を作成し index.ts に export 追加

**Files:**

- Create: `types/production-record.ts`
- Modify: `types/index.ts`

このタスクは型定義のみのため純粋関数TDDではなく、型ファイル作成 → ビルドで型エラーゼロ確認、で進める。

- [ ] **Step 1: 型ファイルを作成する**
      `types/production-record.ts` を以下の内容で新規作成する(契約の型定義 完全形)。

  ```typescript
  import type { FirestoreTimestamp } from './common';

  export interface BlendItem {
    beanName: string;
    ratioPercent: number;
  }

  export interface ProductionRecordMonthInput {
    month: string;
    greenBeanTotalGram: number;
    powderPerPackGram: number;
    blendItems: BlendItem[];
  }

  export interface ProductionRecordMonth extends ProductionRecordMonthInput {
    createdAt?: FirestoreTimestamp;
    updatedAt?: FirestoreTimestamp;
  }

  export type HandpickSegment = 'first' | 'second';

  export interface HandpickEntryInput {
    workDate: string;
    beanName: string;
    segment: HandpickSegment;
    greenBeanWeightGram: number;
    defectBeanWeightGram: number;
  }

  export interface HandpickEntry extends HandpickEntryInput {
    id: string;
    createdAt?: FirestoreTimestamp;
    updatedAt?: FirestoreTimestamp;
  }

  export interface RoastEntryInput {
    workDate: string;
    beforeRoastWeightGram: number;
    afterRoastWeightGram: number;
  }

  export interface RoastEntry extends RoastEntryInput {
    id: string;
    createdAt?: FirestoreTimestamp;
    updatedAt?: FirestoreTimestamp;
  }

  export interface TeamCounts {
    goodCount: number;
    defectiveCount: number;
  }

  export interface PackageEntryInput {
    workDate: string;
    teamA: TeamCounts;
    teamB: TeamCounts;
  }

  export interface PackageEntry extends PackageEntryInput {
    id: string;
    createdAt?: FirestoreTimestamp;
    updatedAt?: FirestoreTimestamp;
  }

  export interface ProductionRecordMonthlySummary {
    month: string;
    blendLabel: string;
    greenBeanTotalGram: number;
    defectBeanTotalGram: number;
    defectRate: number;
    roastBeforeTotalGram: number;
    roastAfterTotalGram: number;
    roastYield: number;
    moistureLossRate: number;
    premixBags: number;
    premixRemainderGram: number;
    thirtyKgTheoryPacks: number;
    monthlyGoodCount: number;
    monthlyDefectiveCount: number;
    monthlyProducedCount: number;
    packageLossRate: number;
  }
  ```

- [ ] **Step 2: バレルエクスポートに追加する**
      `types/index.ts` の最後の行 `export * from './production-pack-record';` の直後に1行追加する。

  ```typescript
  export * from './production-record';
  ```

  (production-pack-record の export は フェーズF の削除タスクで除去するため、ここでは残したまま追加のみ行う。)

- [ ] **Step 3: 型エラーがないことを確認する**
      `npm run build` を実行する。期待: ビルドが成功し型エラーが出ないこと(生産記録機能はまだ未使用なので型定義の構文エラーのみ検出する)。

- [ ] **Step 4: コミットする**
  ```
  git add types/production-record.ts types/index.ts
  git commit -m "feat: 生産記録機能の型定義を追加"
  ```

---

### Task: A-2 月/作業日バリデーション isValidProductionMonth / isValidWorkDate

**Files:**

- Create: `lib/productionRecords.ts`
- Test: `lib/productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く**
      `lib/productionRecords.test.ts` を新規作成する。

  ```typescript
  import { describe, expect, it } from 'vitest';
  import { isValidProductionMonth, isValidWorkDate } from './productionRecords';

  describe('isValidProductionMonth', () => {
    it('accepts real yyyy-MM months only', () => {
      expect(isValidProductionMonth('2026-08')).toBe(true);
      expect(isValidProductionMonth('2026-01')).toBe(true);
      expect(isValidProductionMonth('2026-12')).toBe(true);
      expect(isValidProductionMonth('2026-00')).toBe(false);
      expect(isValidProductionMonth('2026-13')).toBe(false);
      expect(isValidProductionMonth('2026-8')).toBe(false);
      expect(isValidProductionMonth('2026/08')).toBe(false);
      expect(isValidProductionMonth('2026-08-01')).toBe(false);
    });
  });

  describe('isValidWorkDate', () => {
    it('accepts real yyyy-MM-dd dates only', () => {
      expect(isValidWorkDate('2026-08-15')).toBe(true);
      expect(isValidWorkDate('2024-02-29')).toBe(true);
      expect(isValidWorkDate('2026-02-29')).toBe(false);
      expect(isValidWorkDate('2026-13-01')).toBe(false);
      expect(isValidWorkDate('2026-08-32')).toBe(false);
      expect(isValidWorkDate('2026-8-15')).toBe(false);
      expect(isValidWorkDate('2026-08')).toBe(false);
    });
  });
  ```

- [ ] **Step 2: テストを実行して失敗を確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: FAIL。`Failed to resolve import "./productionRecords"`(ファイル未作成)、もしくは `isValidProductionMonth is not a function`。

- [ ] **Step 3: 最小実装を書く**
      `lib/productionRecords.ts` を新規作成する。

  ```typescript
  const WORK_MONTH_PATTERN = /^\d{4}-\d{2}$/;
  const WORK_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  export function isValidProductionMonth(month: string): boolean {
    if (!WORK_MONTH_PATTERN.test(month)) {
      return false;
    }

    const [, monthText] = month.split('-');
    const monthNumber = Number(monthText);
    return monthNumber >= 1 && monthNumber <= 12;
  }

  export function isValidWorkDate(date: string): boolean {
    if (!WORK_DATE_PATTERN.test(date)) {
      return false;
    }

    const [year, month, day] = date.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  }
  ```

- [ ] **Step 4: テストを実行してPASSを確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: PASS(2 passed)。

- [ ] **Step 5: コミットする**
  ```
  git add lib/productionRecords.ts lib/productionRecords.test.ts
  git commit -m "feat: 生産記録の月・作業日バリデーション関数を追加"
  ```

---

### Task: A-3 欠点率・使用可能生豆・プレミックス袋数の計算

**Files:**

- Modify: `lib/productionRecords.ts`
- Test: `lib/productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く**
      `lib/productionRecords.test.ts` の import 行に関数を追加し、末尾に `describe` を追記する。

  import 行を以下に置き換える。

  ```typescript
  import {
    calculateDefectRate,
    calculatePremixBags,
    calculateUsableGreenGram,
    isValidProductionMonth,
    isValidWorkDate,
  } from './productionRecords';
  ```

  末尾に追記する。

  ```typescript
  describe('calculateDefectRate', () => {
    it('returns defect / handpicked as a ratio', () => {
      expect(calculateDefectRate(620, 20000)).toBeCloseTo(0.031, 5);
      expect(calculateDefectRate(50, 200)).toBe(0.25);
    });

    it('returns 0 when handpicked total is 0 or negative', () => {
      expect(calculateDefectRate(620, 0)).toBe(0);
      expect(calculateDefectRate(620, -100)).toBe(0);
    });
  });

  describe('calculateUsableGreenGram', () => {
    it('subtracts defect grams from handpicked grams', () => {
      expect(calculateUsableGreenGram(20000, 620)).toBe(19380);
    });

    it('never returns a negative value', () => {
      expect(calculateUsableGreenGram(100, 500)).toBe(0);
    });
  });

  describe('calculatePremixBags', () => {
    it('splits usable grams into 500g bags and a remainder', () => {
      expect(calculatePremixBags(19380)).toEqual({ bags: 38, remainderGram: 380 });
      expect(calculatePremixBags(1000)).toEqual({ bags: 2, remainderGram: 0 });
    });

    it('treats negative usable grams as 0', () => {
      expect(calculatePremixBags(-1)).toEqual({ bags: 0, remainderGram: 0 });
    });
  });
  ```

- [ ] **Step 2: テストを実行して失敗を確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: FAIL。`calculateDefectRate is not a function` 等。

- [ ] **Step 3: 最小実装を書く**
      `lib/productionRecords.ts` の先頭(パターン定数の直後)に定数を追加する。

  ```typescript
  export const DEFAULT_POWDER_PER_PACK_GRAM = 8.5;
  export const PREMIX_BAG_GRAM = 500;
  export const THIRTY_KG_BASE_GRAM = 30000;
  export const MAX_BLEND_ITEMS = 4;
  ```

  続けてファイル末尾に関数を追加する。

  ```typescript
  export function calculateDefectRate(defectTotalGram: number, handpickedTotalGram: number): number {
    if (handpickedTotalGram <= 0) {
      return 0;
    }
    return defectTotalGram / handpickedTotalGram;
  }

  export function calculateUsableGreenGram(handpickedTotalGram: number, defectTotalGram: number): number {
    return Math.max(0, handpickedTotalGram - defectTotalGram);
  }

  export function calculatePremixBags(usableGreenGram: number): { bags: number; remainderGram: number } {
    const usable = usableGreenGram < 0 ? 0 : usableGreenGram;
    return {
      bags: Math.floor(usable / PREMIX_BAG_GRAM),
      remainderGram: usable % PREMIX_BAG_GRAM,
    };
  }
  ```

- [ ] **Step 4: テストを実行してPASSを確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: PASS(全 describe が緑)。

- [ ] **Step 5: コミットする**
  ```
  git add lib/productionRecords.ts lib/productionRecords.test.ts
  git commit -m "feat: 欠点率・使用可能生豆・プレミックス袋数の計算を追加"
  ```

---

### Task: A-4 焙煎歩留まり・水分蒸発率・理論袋数の計算

**Files:**

- Modify: `lib/productionRecords.ts`
- Test: `lib/productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く**
      import に関数を追加する。

  ```typescript
  import {
    calculateDailyTheoryPacks,
    calculateDefectRate,
    calculateMoistureLossRate,
    calculatePremixBags,
    calculateRoastYield,
    calculateThirtyKgTheoryPacks,
    calculateUsableGreenGram,
    isValidProductionMonth,
    isValidWorkDate,
  } from './productionRecords';
  ```

  末尾に追記する。仕様書サンプル(焙煎前2000g/後1660g=歩留83%・蒸発率17%)で検算する。

  ```typescript
  describe('calculateRoastYield', () => {
    it('returns after / before as a ratio', () => {
      expect(calculateRoastYield(2000, 1660)).toBeCloseTo(0.83, 5);
    });

    it('returns 0 when before total is 0 or negative', () => {
      expect(calculateRoastYield(0, 1660)).toBe(0);
      expect(calculateRoastYield(-100, 1660)).toBe(0);
    });
  });

  describe('calculateMoistureLossRate', () => {
    it('returns 1 - roastYield', () => {
      expect(calculateMoistureLossRate(0.83)).toBeCloseTo(0.17, 5);
    });

    it('returns 0 when roastYield is 0 or negative', () => {
      expect(calculateMoistureLossRate(0)).toBe(0);
      expect(calculateMoistureLossRate(-0.1)).toBe(0);
    });
  });

  describe('calculateDailyTheoryPacks', () => {
    it('floors after-roast grams divided by powder per pack', () => {
      expect(calculateDailyTheoryPacks(1660, 8.5)).toBe(195);
    });

    it('returns 0 when powder per pack is 0 or negative', () => {
      expect(calculateDailyTheoryPacks(1660, 0)).toBe(0);
      expect(calculateDailyTheoryPacks(1660, -1)).toBe(0);
    });
  });

  describe('calculateThirtyKgTheoryPacks', () => {
    it('floors 30000 * (1 - defectRate) * roastYield / powder', () => {
      // 30000 * (1 - 0.031) * 0.83 / 8.5 = 2838.07... -> 2838
      expect(calculateThirtyKgTheoryPacks(0.031, 0.83, 8.5)).toBe(2838);
    });

    it('returns 0 when powder or roastYield is 0 or negative', () => {
      expect(calculateThirtyKgTheoryPacks(0.031, 0.83, 0)).toBe(0);
      expect(calculateThirtyKgTheoryPacks(0.031, 0, 8.5)).toBe(0);
      expect(calculateThirtyKgTheoryPacks(0.031, -0.1, 8.5)).toBe(0);
    });
  });
  ```

- [ ] **Step 2: テストを実行して失敗を確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: FAIL。`calculateRoastYield is not a function` 等。

- [ ] **Step 3: 最小実装を書く**
      `lib/productionRecords.ts` 末尾に追加する。

  ```typescript
  export function calculateRoastYield(beforeTotalGram: number, afterTotalGram: number): number {
    if (beforeTotalGram <= 0) {
      return 0;
    }
    return afterTotalGram / beforeTotalGram;
  }

  export function calculateMoistureLossRate(roastYield: number): number {
    if (roastYield <= 0) {
      return 0;
    }
    return 1 - roastYield;
  }

  export function calculateDailyTheoryPacks(afterRoastGram: number, powderPerPackGram: number): number {
    if (powderPerPackGram <= 0) {
      return 0;
    }
    return Math.floor(afterRoastGram / powderPerPackGram);
  }

  export function calculateThirtyKgTheoryPacks(
    defectRate: number,
    roastYield: number,
    powderPerPackGram: number
  ): number {
    if (powderPerPackGram <= 0 || roastYield <= 0) {
      return 0;
    }
    return Math.floor((THIRTY_KG_BASE_GRAM * (1 - defectRate) * roastYield) / powderPerPackGram);
  }
  ```

- [ ] **Step 4: テストを実行してPASSを確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: PASS。

- [ ] **Step 5: コミットする**
  ```
  git add lib/productionRecords.ts lib/productionRecords.test.ts
  git commit -m "feat: 焙煎歩留まり・水分蒸発率・理論袋数の計算を追加"
  ```

---

### Task: A-5 パッケージ集計 calculatePackageTotals と配合ラベル buildBlendLabel

**Files:**

- Modify: `lib/productionRecords.ts`
- Test: `lib/productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く**
      import と型 import を追加する。calculatePackageTotals と buildBlendLabel を import に足し、`TeamCounts` / `BlendItem` を型 import する。テストファイル先頭の最初の import 群の直後に型 import を追加する。

  ```typescript
  import type { BlendItem, TeamCounts } from '@/types';
  ```

  関数 import に `buildBlendLabel`, `calculatePackageTotals` を追加する。末尾に追記する。仕様書サンプル(良品2840/不良82=不良率2.8%)で検算する。

  ```typescript
  describe('calculatePackageTotals', () => {
    it('sums both teams and computes the defect rate', () => {
      const teamA: TeamCounts = { goodCount: 1500, defectiveCount: 50 };
      const teamB: TeamCounts = { goodCount: 1340, defectiveCount: 32 };
      // good=2840, defective=82, produced=2922, defectRate=82/2922=0.02806...
      expect(calculatePackageTotals(teamA, teamB)).toEqual({
        goodTotal: 2840,
        defectiveTotal: 82,
        producedTotal: 2922,
        defectRate: 82 / 2922,
      });
    });

    it('returns defectRate 0 when produced total is 0', () => {
      const empty: TeamCounts = { goodCount: 0, defectiveCount: 0 };
      expect(calculatePackageTotals(empty, empty)).toEqual({
        goodTotal: 0,
        defectiveTotal: 0,
        producedTotal: 0,
        defectRate: 0,
      });
    });
  });

  describe('buildBlendLabel', () => {
    it('joins blend items as "name ratio%" separated by " / "', () => {
      const items: BlendItem[] = [
        { beanName: 'ブラジル', ratioPercent: 80 },
        { beanName: 'グアテマラ', ratioPercent: 20 },
      ];
      expect(buildBlendLabel(items)).toBe('ブラジル 80% / グアテマラ 20%');
    });

    it('handles a single blend item', () => {
      expect(buildBlendLabel([{ beanName: 'ブラジル', ratioPercent: 100 }])).toBe('ブラジル 100%');
    });

    it('returns an empty string for no items', () => {
      expect(buildBlendLabel([])).toBe('');
    });
  });
  ```

- [ ] **Step 2: テストを実行して失敗を確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: FAIL。`calculatePackageTotals is not a function` 等。

- [ ] **Step 3: 最小実装を書く**
      `lib/productionRecords.ts` の先頭に型 import を追加する(ファイルの最上部、定数より前)。

  ```typescript
  import type { BlendItem, TeamCounts } from '@/types';
  ```

  末尾に関数を追加する。

  ```typescript
  export function calculatePackageTotals(
    teamA: TeamCounts,
    teamB: TeamCounts
  ): { goodTotal: number; defectiveTotal: number; producedTotal: number; defectRate: number } {
    const goodTotal = teamA.goodCount + teamB.goodCount;
    const defectiveTotal = teamA.defectiveCount + teamB.defectiveCount;
    const producedTotal = goodTotal + defectiveTotal;
    const defectRate = producedTotal <= 0 ? 0 : defectiveTotal / producedTotal;

    return { goodTotal, defectiveTotal, producedTotal, defectRate };
  }

  export function buildBlendLabel(blendItems: BlendItem[]): string {
    return blendItems.map((item) => `${item.beanName} ${item.ratioPercent}%`).join(' / ');
  }
  ```

- [ ] **Step 4: テストを実行してPASSを確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: PASS。

- [ ] **Step 5: コミットする**
  ```
  git add lib/productionRecords.ts lib/productionRecords.test.ts
  git commit -m "feat: パッケージ集計と配合ラベル生成を追加"
  ```

---

### Task: A-6 エントリ集計関数 sumHandpick / sumRoast / sumPackage

**Files:**

- Modify: `lib/productionRecords.ts`
- Test: `lib/productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く**
      型 import に `HandpickEntry`, `RoastEntry`, `PackageEntry` を追加し、関数 import に `sumHandpick`, `sumPackage`, `sumRoast` を追加する。テストファイルの型 import 行を以下に置き換える。

  ```typescript
  import type { BlendItem, HandpickEntry, PackageEntry, RoastEntry, TeamCounts } from '@/types';
  ```

  末尾に追記する。

  ```typescript
  describe('sumHandpick', () => {
    it('sums green bean and defect grams across entries', () => {
      const entries: HandpickEntry[] = [
        {
          id: 'h1',
          workDate: '2026-08-01',
          beanName: 'ブラジル',
          segment: 'first',
          greenBeanWeightGram: 10000,
          defectBeanWeightGram: 320,
        },
        {
          id: 'h2',
          workDate: '2026-08-02',
          beanName: 'ブラジル',
          segment: 'second',
          greenBeanWeightGram: 10000,
          defectBeanWeightGram: 300,
        },
      ];
      expect(sumHandpick(entries)).toEqual({ handpickedTotalGram: 20000, defectTotalGram: 620 });
    });

    it('returns zero totals for an empty list', () => {
      expect(sumHandpick([])).toEqual({ handpickedTotalGram: 0, defectTotalGram: 0 });
    });
  });

  describe('sumRoast', () => {
    it('sums before and after grams across entries', () => {
      const entries: RoastEntry[] = [
        { id: 'r1', workDate: '2026-08-01', beforeRoastWeightGram: 1000, afterRoastWeightGram: 830 },
        { id: 'r2', workDate: '2026-08-02', beforeRoastWeightGram: 1000, afterRoastWeightGram: 830 },
      ];
      expect(sumRoast(entries)).toEqual({ beforeTotalGram: 2000, afterTotalGram: 1660 });
    });

    it('returns zero totals for an empty list', () => {
      expect(sumRoast([])).toEqual({ beforeTotalGram: 0, afterTotalGram: 0 });
    });
  });

  describe('sumPackage', () => {
    it('sums good, defective, and produced totals across entries', () => {
      const entries: PackageEntry[] = [
        {
          id: 'p1',
          workDate: '2026-08-01',
          teamA: { goodCount: 1000, defectiveCount: 30 },
          teamB: { goodCount: 500, defectiveCount: 20 },
        },
        {
          id: 'p2',
          workDate: '2026-08-02',
          teamA: { goodCount: 500, defectiveCount: 20 },
          teamB: { goodCount: 840, defectiveCount: 12 },
        },
      ];
      expect(sumPackage(entries)).toEqual({ goodTotal: 2840, defectiveTotal: 82, producedTotal: 2922 });
    });

    it('returns zero totals for an empty list', () => {
      expect(sumPackage([])).toEqual({ goodTotal: 0, defectiveTotal: 0, producedTotal: 0 });
    });
  });
  ```

- [ ] **Step 2: テストを実行して失敗を確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: FAIL。`sumHandpick is not a function` 等。

- [ ] **Step 3: 最小実装を書く**
      `lib/productionRecords.ts` の先頭の型 import を以下に置き換える。

  ```typescript
  import type { BlendItem, HandpickEntry, PackageEntry, RoastEntry, TeamCounts } from '@/types';
  ```

  末尾に関数を追加する。

  ```typescript
  export function sumHandpick(entries: HandpickEntry[]): {
    handpickedTotalGram: number;
    defectTotalGram: number;
  } {
    return entries.reduce(
      (acc, entry) => ({
        handpickedTotalGram: acc.handpickedTotalGram + entry.greenBeanWeightGram,
        defectTotalGram: acc.defectTotalGram + entry.defectBeanWeightGram,
      }),
      { handpickedTotalGram: 0, defectTotalGram: 0 }
    );
  }

  export function sumRoast(entries: RoastEntry[]): { beforeTotalGram: number; afterTotalGram: number } {
    return entries.reduce(
      (acc, entry) => ({
        beforeTotalGram: acc.beforeTotalGram + entry.beforeRoastWeightGram,
        afterTotalGram: acc.afterTotalGram + entry.afterRoastWeightGram,
      }),
      { beforeTotalGram: 0, afterTotalGram: 0 }
    );
  }

  export function sumPackage(entries: PackageEntry[]): {
    goodTotal: number;
    defectiveTotal: number;
    producedTotal: number;
  } {
    return entries.reduce(
      (acc, entry) => {
        const totals = calculatePackageTotals(entry.teamA, entry.teamB);
        return {
          goodTotal: acc.goodTotal + totals.goodTotal,
          defectiveTotal: acc.defectiveTotal + totals.defectiveTotal,
          producedTotal: acc.producedTotal + totals.producedTotal,
        };
      },
      { goodTotal: 0, defectiveTotal: 0, producedTotal: 0 }
    );
  }
  ```

- [ ] **Step 4: テストを実行してPASSを確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: PASS。

- [ ] **Step 5: コミットする**
  ```
  git add lib/productionRecords.ts lib/productionRecords.test.ts
  git commit -m "feat: ハンドピック・焙煎・パッケージの集計関数を追加"
  ```

---

### Task: A-7 月次サマリ合成 buildMonthlySummary

**Files:**

- Modify: `lib/productionRecords.ts`
- Test: `lib/productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く**
      型 import に `ProductionRecordMonth` を追加し、関数 import に `buildMonthlySummary` を追加する。テストファイルの型 import 行を以下に置き換える。

  ```typescript
  import type { BlendItem, HandpickEntry, PackageEntry, ProductionRecordMonth, RoastEntry, TeamCounts } from '@/types';
  ```

  末尾に追記する。仕様書サンプル全体(欠点620g/生豆20000g=3.1%、焙煎前2000g/後1660g=歩留83%・蒸発率17%、良品2840/不良82=不良率2.8%)で検算する。

  ```typescript
  describe('buildMonthlySummary', () => {
    const monthDoc: ProductionRecordMonth = {
      month: '2026-08',
      greenBeanTotalGram: 20000,
      powderPerPackGram: 8.5,
      blendItems: [
        { beanName: 'ブラジル', ratioPercent: 80 },
        { beanName: 'グアテマラ', ratioPercent: 20 },
      ],
    };

    const handpickEntries: HandpickEntry[] = [
      {
        id: 'h1',
        workDate: '2026-08-01',
        beanName: 'ブラジル',
        segment: 'first',
        greenBeanWeightGram: 10000,
        defectBeanWeightGram: 320,
      },
      {
        id: 'h2',
        workDate: '2026-08-02',
        beanName: 'ブラジル',
        segment: 'second',
        greenBeanWeightGram: 10000,
        defectBeanWeightGram: 300,
      },
    ];

    const roastEntries: RoastEntry[] = [
      { id: 'r1', workDate: '2026-08-01', beforeRoastWeightGram: 1000, afterRoastWeightGram: 830 },
      { id: 'r2', workDate: '2026-08-02', beforeRoastWeightGram: 1000, afterRoastWeightGram: 830 },
    ];

    const packageEntries: PackageEntry[] = [
      {
        id: 'p1',
        workDate: '2026-08-01',
        teamA: { goodCount: 1000, defectiveCount: 30 },
        teamB: { goodCount: 500, defectiveCount: 20 },
      },
      {
        id: 'p2',
        workDate: '2026-08-02',
        teamA: { goodCount: 500, defectiveCount: 20 },
        teamB: { goodCount: 840, defectiveCount: 12 },
      },
    ];

    it('composes a monthly summary from month doc and all entries', () => {
      const summary = buildMonthlySummary(monthDoc, handpickEntries, roastEntries, packageEntries);

      const expectedDefectRate = 620 / 20000; // 0.031
      const expectedRoastYield = 1660 / 2000; // 0.83
      const expectedThirtyKg = Math.floor((30000 * (1 - expectedDefectRate) * expectedRoastYield) / 8.5);
      // usable = 20000 - 620 = 19380 -> 38 bags, remainder 380

      expect(summary).toEqual({
        month: '2026-08',
        blendLabel: 'ブラジル 80% / グアテマラ 20%',
        greenBeanTotalGram: 20000,
        defectBeanTotalGram: 620,
        defectRate: expectedDefectRate,
        roastBeforeTotalGram: 2000,
        roastAfterTotalGram: 1660,
        roastYield: expectedRoastYield,
        moistureLossRate: 1 - expectedRoastYield,
        premixBags: 38,
        premixRemainderGram: 380,
        thirtyKgTheoryPacks: expectedThirtyKg,
        monthlyGoodCount: 2840,
        monthlyDefectiveCount: 82,
        monthlyProducedCount: 2922,
        packageLossRate: 82 / 2922,
      });
    });

    it('guards against division by zero with empty entries', () => {
      const emptyMonthDoc: ProductionRecordMonth = {
        month: '2026-09',
        greenBeanTotalGram: 0,
        powderPerPackGram: 8.5,
        blendItems: [],
      };
      const summary = buildMonthlySummary(emptyMonthDoc, [], [], []);

      expect(summary).toEqual({
        month: '2026-09',
        blendLabel: '',
        greenBeanTotalGram: 0,
        defectBeanTotalGram: 0,
        defectRate: 0,
        roastBeforeTotalGram: 0,
        roastAfterTotalGram: 0,
        roastYield: 0,
        moistureLossRate: 0,
        premixBags: 0,
        premixRemainderGram: 0,
        thirtyKgTheoryPacks: 0,
        monthlyGoodCount: 0,
        monthlyDefectiveCount: 0,
        monthlyProducedCount: 0,
        packageLossRate: 0,
      });
    });
  });
  ```

  注: `premixBags`/`premixRemainderGram` は `calculateUsableGreenGram(handpickedTotalGram, defectTotalGram)` を `calculatePremixBags` に渡して算出する(契約の「使用可能生豆」をハンドピック実績から計算)。`greenBeanTotalGram` はサマリの値としては `monthDoc.greenBeanTotalGram` をそのまま使う。

- [ ] **Step 2: テストを実行して失敗を確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: FAIL。`buildMonthlySummary is not a function`。

- [ ] **Step 3: 最小実装を書く**
      `lib/productionRecords.ts` の先頭の型 import に `ProductionRecordMonth` と `ProductionRecordMonthlySummary` を追加する。型 import を以下に置き換える。

  ```typescript
  import type {
    BlendItem,
    HandpickEntry,
    PackageEntry,
    ProductionRecordMonth,
    ProductionRecordMonthlySummary,
    RoastEntry,
    TeamCounts,
  } from '@/types';
  ```

  末尾に関数を追加する。

  ```typescript
  export function buildMonthlySummary(
    monthDoc: ProductionRecordMonth,
    handpickEntries: HandpickEntry[],
    roastEntries: RoastEntry[],
    packageEntries: PackageEntry[]
  ): ProductionRecordMonthlySummary {
    const handpickTotals = sumHandpick(handpickEntries);
    const roastTotals = sumRoast(roastEntries);
    const packageTotals = sumPackage(packageEntries);

    const defectRate = calculateDefectRate(handpickTotals.defectTotalGram, handpickTotals.handpickedTotalGram);
    const roastYield = calculateRoastYield(roastTotals.beforeTotalGram, roastTotals.afterTotalGram);
    const moistureLossRate = calculateMoistureLossRate(roastYield);
    const usableGreenGram = calculateUsableGreenGram(
      handpickTotals.handpickedTotalGram,
      handpickTotals.defectTotalGram
    );
    const premix = calculatePremixBags(usableGreenGram);
    const thirtyKgTheoryPacks = calculateThirtyKgTheoryPacks(defectRate, roastYield, monthDoc.powderPerPackGram);
    const packageLossRate =
      packageTotals.producedTotal <= 0 ? 0 : packageTotals.defectiveTotal / packageTotals.producedTotal;

    return {
      month: monthDoc.month,
      blendLabel: buildBlendLabel(monthDoc.blendItems),
      greenBeanTotalGram: monthDoc.greenBeanTotalGram,
      defectBeanTotalGram: handpickTotals.defectTotalGram,
      defectRate,
      roastBeforeTotalGram: roastTotals.beforeTotalGram,
      roastAfterTotalGram: roastTotals.afterTotalGram,
      roastYield,
      moistureLossRate,
      premixBags: premix.bags,
      premixRemainderGram: premix.remainderGram,
      thirtyKgTheoryPacks,
      monthlyGoodCount: packageTotals.goodTotal,
      monthlyDefectiveCount: packageTotals.defectiveTotal,
      monthlyProducedCount: packageTotals.producedTotal,
      packageLossRate,
    };
  }
  ```

- [ ] **Step 4: テストを実行してPASSを確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: PASS。

- [ ] **Step 5: コミットする**
  ```
  git add lib/productionRecords.ts lib/productionRecords.test.ts
  git commit -m "feat: 月次サマリ合成 buildMonthlySummary を追加"
  ```

---

### Task: A-8 入力正規化 normalizeWeightInput / normalizeCountInput

**Files:**

- Modify: `lib/productionRecords.ts`
- Test: `lib/productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く**
      関数 import に `normalizeCountInput`, `normalizeWeightInput` を追加する。末尾に追記する。

  ```typescript
  describe('normalizeWeightInput', () => {
    it('accepts zero and positive finite numbers', () => {
      expect(normalizeWeightInput(0)).toBe(0);
      expect(normalizeWeightInput(8.5)).toBe(8.5);
      expect(normalizeWeightInput(20000)).toBe(20000);
    });

    it('throws for negative, NaN, or non-finite values', () => {
      expect(() => normalizeWeightInput(-1)).toThrow('0以上の数値で入力してください');
      expect(() => normalizeWeightInput(Number.NaN)).toThrow('0以上の数値で入力してください');
      expect(() => normalizeWeightInput(Number.POSITIVE_INFINITY)).toThrow('0以上の数値で入力してください');
    });
  });

  describe('normalizeCountInput', () => {
    it('accepts zero and positive integers', () => {
      expect(normalizeCountInput(0)).toBe(0);
      expect(normalizeCountInput(2840)).toBe(2840);
    });

    it('throws for negative, decimal, NaN, or non-finite values', () => {
      expect(() => normalizeCountInput(-1)).toThrow('0以上の整数で入力してください');
      expect(() => normalizeCountInput(1.5)).toThrow('0以上の整数で入力してください');
      expect(() => normalizeCountInput(Number.NaN)).toThrow('0以上の整数で入力してください');
      expect(() => normalizeCountInput(Number.POSITIVE_INFINITY)).toThrow('0以上の整数で入力してください');
    });
  });
  ```

- [ ] **Step 2: テストを実行して失敗を確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: FAIL。`normalizeWeightInput is not a function`。

- [ ] **Step 3: 最小実装を書く**
      `lib/productionRecords.ts` のパターン定数の近く(定数群の直後)にエラーメッセージ定数を追加する。

  ```typescript
  const WEIGHT_INPUT_ERROR = '0以上の数値で入力してください';
  const COUNT_INPUT_ERROR = '0以上の整数で入力してください';
  ```

  末尾に関数を追加する。

  ```typescript
  export function normalizeWeightInput(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(WEIGHT_INPUT_ERROR);
    }
    return value;
  }

  export function normalizeCountInput(value: number): number {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(COUNT_INPUT_ERROR);
    }
    return value;
  }
  ```

  注: `Number.isInteger` は `NaN`・`Infinity` に対して false を返すため、整数チェックだけで非有限値も弾ける。

- [ ] **Step 4: テストを実行してPASSを確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: PASS。

- [ ] **Step 5: コミットする**
  ```
  git add lib/productionRecords.ts lib/productionRecords.test.ts
  git commit -m "feat: 重量・個数の入力正規化関数を追加"
  ```

---

### Task: A-9 配合バリデーション validateBlendItems

**Files:**

- Modify: `lib/productionRecords.ts`
- Test: `lib/productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く**
      関数 import に `validateBlendItems` を追加する。末尾に追記する。

  ```typescript
  describe('validateBlendItems', () => {
    it('accepts 1 to 4 items whose ratios sum to exactly 100', () => {
      expect(() =>
        validateBlendItems([
          { beanName: 'ブラジル', ratioPercent: 80 },
          { beanName: 'グアテマラ', ratioPercent: 20 },
        ])
      ).not.toThrow();
      expect(() => validateBlendItems([{ beanName: 'ブラジル', ratioPercent: 100 }])).not.toThrow();
    });

    it('throws when there are no items or more than 4', () => {
      expect(() => validateBlendItems([])).toThrow();
      expect(() =>
        validateBlendItems([
          { beanName: 'a', ratioPercent: 20 },
          { beanName: 'b', ratioPercent: 20 },
          { beanName: 'c', ratioPercent: 20 },
          { beanName: 'd', ratioPercent: 20 },
          { beanName: 'e', ratioPercent: 20 },
        ])
      ).toThrow();
    });

    it('throws when a ratio is negative', () => {
      expect(() =>
        validateBlendItems([
          { beanName: 'a', ratioPercent: 120 },
          { beanName: 'b', ratioPercent: -20 },
        ])
      ).toThrow();
    });

    it('throws when ratios do not sum to exactly 100', () => {
      expect(() =>
        validateBlendItems([
          { beanName: 'a', ratioPercent: 80 },
          { beanName: 'b', ratioPercent: 10 },
        ])
      ).toThrow();
    });
  });
  ```

- [ ] **Step 2: テストを実行して失敗を確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: FAIL。`validateBlendItems is not a function`。

- [ ] **Step 3: 最小実装を書く**
      `lib/productionRecords.ts` のエラーメッセージ定数群に追加する。

  ```typescript
  const BLEND_ITEMS_ERROR = '配合は1〜4件、各比率は0以上、合計100%で入力してください';
  ```

  末尾に関数を追加する。

  ```typescript
  export function validateBlendItems(items: BlendItem[]): void {
    if (items.length < 1 || items.length > MAX_BLEND_ITEMS) {
      throw new Error(BLEND_ITEMS_ERROR);
    }

    let sum = 0;
    for (const item of items) {
      if (!Number.isFinite(item.ratioPercent) || item.ratioPercent < 0) {
        throw new Error(BLEND_ITEMS_ERROR);
      }
      sum += item.ratioPercent;
    }

    if (sum !== 100) {
      throw new Error(BLEND_ITEMS_ERROR);
    }
  }
  ```

- [ ] **Step 4: テストを実行してPASSを確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: PASS。

- [ ] **Step 5: コミットする**
  ```
  git add lib/productionRecords.ts lib/productionRecords.test.ts
  git commit -m "feat: 配合バリデーション validateBlendItems を追加"
  ```

---

### Task: A-10 月ドキュメント組み立て buildProductionRecordMonth

**Files:**

- Modify: `lib/productionRecords.ts`
- Test: `lib/productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く**
      型 import に `ProductionRecordMonthInput` を追加し、関数 import に `buildProductionRecordMonth` を追加する。末尾に追記する。

  ```typescript
  describe('buildProductionRecordMonth', () => {
    const validInput: ProductionRecordMonthInput = {
      month: '2026-08',
      greenBeanTotalGram: 20000,
      powderPerPackGram: 8.5,
      blendItems: [
        { beanName: 'ブラジル', ratioPercent: 80 },
        { beanName: 'グアテマラ', ratioPercent: 20 },
      ],
    };

    it('returns the validated input shape', () => {
      expect(buildProductionRecordMonth(validInput)).toEqual(validInput);
    });

    it('throws for an invalid month', () => {
      expect(() => buildProductionRecordMonth({ ...validInput, month: '2026-13' })).toThrow();
    });

    it('throws when green bean total is not greater than 0', () => {
      expect(() => buildProductionRecordMonth({ ...validInput, greenBeanTotalGram: 0 })).toThrow();
    });

    it('throws when powder per pack is not greater than 0', () => {
      expect(() => buildProductionRecordMonth({ ...validInput, powderPerPackGram: 0 })).toThrow();
    });

    it('throws when blend items are invalid', () => {
      expect(() =>
        buildProductionRecordMonth({
          ...validInput,
          blendItems: [{ beanName: 'a', ratioPercent: 90 }],
        })
      ).toThrow();
    });
  });
  ```

  型 import 行に `ProductionRecordMonthInput` を追加する(`@/types` の import に並べる)。

- [ ] **Step 2: テストを実行して失敗を確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: FAIL。`buildProductionRecordMonth is not a function`。

- [ ] **Step 3: 最小実装を書く**
      `lib/productionRecords.ts` の型 import に `ProductionRecordMonthInput` を追加する。エラーメッセージ定数群に追加する。

  ```typescript
  const MONTH_INPUT_ERROR = '対象月が正しくありません';
  const GREEN_BEAN_TOTAL_ERROR = '生豆総量は0より大きい値で入力してください';
  const POWDER_PER_PACK_ERROR = '1袋粉量は0より大きい値で入力してください';
  ```

  末尾に関数を追加する。

  ```typescript
  export function buildProductionRecordMonth(input: ProductionRecordMonthInput): ProductionRecordMonthInput {
    if (!isValidProductionMonth(input.month)) {
      throw new Error(MONTH_INPUT_ERROR);
    }
    validateBlendItems(input.blendItems);
    if (!(input.greenBeanTotalGram > 0)) {
      throw new Error(GREEN_BEAN_TOTAL_ERROR);
    }
    if (!(input.powderPerPackGram > 0)) {
      throw new Error(POWDER_PER_PACK_ERROR);
    }

    return {
      month: input.month,
      greenBeanTotalGram: input.greenBeanTotalGram,
      powderPerPackGram: input.powderPerPackGram,
      blendItems: input.blendItems,
    };
  }
  ```

- [ ] **Step 4: テストを実行してPASSを確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: PASS。

- [ ] **Step 5: コミットする**
  ```
  git add lib/productionRecords.ts lib/productionRecords.test.ts
  git commit -m "feat: 月ドキュメント組み立て buildProductionRecordMonth を追加"
  ```

---

### Task: A-11 エントリ組み立て buildHandpickEntry / buildRoastEntry / buildPackageEntry

**Files:**

- Modify: `lib/productionRecords.ts`
- Test: `lib/productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く**
      型 import に `HandpickEntryInput`, `PackageEntryInput`, `RoastEntryInput` を追加し、関数 import に `buildHandpickEntry`, `buildPackageEntry`, `buildRoastEntry` を追加する。末尾に追記する。

  ```typescript
  describe('buildHandpickEntry', () => {
    const validInput: HandpickEntryInput = {
      workDate: '2026-08-01',
      beanName: 'ブラジル',
      segment: 'first',
      greenBeanWeightGram: 10000,
      defectBeanWeightGram: 320,
    };

    it('returns the validated input shape', () => {
      expect(buildHandpickEntry(validInput)).toEqual(validInput);
    });

    it('accepts the second segment and zero defect weight', () => {
      expect(buildHandpickEntry({ ...validInput, segment: 'second', defectBeanWeightGram: 0 })).toEqual({
        ...validInput,
        segment: 'second',
        defectBeanWeightGram: 0,
      });
    });

    it('throws for invalid work date, segment, or weights', () => {
      expect(() => buildHandpickEntry({ ...validInput, workDate: '2026-08' })).toThrow();
      expect(() => buildHandpickEntry({ ...validInput, segment: 'third' as HandpickEntryInput['segment'] })).toThrow();
      expect(() => buildHandpickEntry({ ...validInput, greenBeanWeightGram: 0 })).toThrow();
      expect(() => buildHandpickEntry({ ...validInput, defectBeanWeightGram: -1 })).toThrow();
    });
  });

  describe('buildRoastEntry', () => {
    const validInput: RoastEntryInput = {
      workDate: '2026-08-01',
      beforeRoastWeightGram: 2000,
      afterRoastWeightGram: 1660,
    };

    it('returns the validated input shape', () => {
      expect(buildRoastEntry(validInput)).toEqual(validInput);
    });

    it('throws for invalid date, non-positive weights, or after > before', () => {
      expect(() => buildRoastEntry({ ...validInput, workDate: '2026/08/01' })).toThrow();
      expect(() => buildRoastEntry({ ...validInput, beforeRoastWeightGram: 0 })).toThrow();
      expect(() => buildRoastEntry({ ...validInput, afterRoastWeightGram: 0 })).toThrow();
      expect(() =>
        buildRoastEntry({ ...validInput, beforeRoastWeightGram: 1000, afterRoastWeightGram: 1100 })
      ).toThrow();
    });
  });

  describe('buildPackageEntry', () => {
    const validInput: PackageEntryInput = {
      workDate: '2026-08-01',
      teamA: { goodCount: 1000, defectiveCount: 30 },
      teamB: { goodCount: 500, defectiveCount: 20 },
    };

    it('returns the validated input shape', () => {
      expect(buildPackageEntry(validInput)).toEqual(validInput);
    });

    it('throws for invalid date or non-integer/negative counts', () => {
      expect(() => buildPackageEntry({ ...validInput, workDate: '2026-08' })).toThrow();
      expect(() => buildPackageEntry({ ...validInput, teamA: { goodCount: -1, defectiveCount: 0 } })).toThrow();
      expect(() => buildPackageEntry({ ...validInput, teamB: { goodCount: 1.5, defectiveCount: 0 } })).toThrow();
    });
  });
  ```

  型 import 行に `HandpickEntryInput`, `PackageEntryInput`, `RoastEntryInput` を追加する。

- [ ] **Step 2: テストを実行して失敗を確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: FAIL。`buildHandpickEntry is not a function`。

- [ ] **Step 3: 最小実装を書く**
      `lib/productionRecords.ts` の型 import に `HandpickEntryInput`, `HandpickSegment`, `PackageEntryInput`, `RoastEntryInput` を追加する。エラーメッセージ定数群に追加する。

  ```typescript
  const WORK_DATE_ERROR = '作業日が正しくありません';
  const HANDPICK_SEGMENT_ERROR = '区分は1回目または2回目を選択してください';
  const HANDPICK_GREEN_ERROR = '今回生豆重量は0より大きい値で入力してください';
  const ROAST_WEIGHT_ERROR = '焙煎前後の重量を正しく入力してください';
  ```

  末尾に関数を追加する。

  ```typescript
  export function buildHandpickEntry(input: HandpickEntryInput): HandpickEntryInput {
    if (!isValidWorkDate(input.workDate)) {
      throw new Error(WORK_DATE_ERROR);
    }
    if (input.segment !== 'first' && input.segment !== 'second') {
      throw new Error(HANDPICK_SEGMENT_ERROR);
    }
    if (!(input.greenBeanWeightGram > 0)) {
      throw new Error(HANDPICK_GREEN_ERROR);
    }
    const defectBeanWeightGram = normalizeWeightInput(input.defectBeanWeightGram);

    return {
      workDate: input.workDate,
      beanName: input.beanName,
      segment: input.segment,
      greenBeanWeightGram: input.greenBeanWeightGram,
      defectBeanWeightGram,
    };
  }

  export function buildRoastEntry(input: RoastEntryInput): RoastEntryInput {
    if (!isValidWorkDate(input.workDate)) {
      throw new Error(WORK_DATE_ERROR);
    }
    if (!(input.beforeRoastWeightGram > 0) || !(input.afterRoastWeightGram > 0)) {
      throw new Error(ROAST_WEIGHT_ERROR);
    }
    if (input.afterRoastWeightGram > input.beforeRoastWeightGram) {
      throw new Error(ROAST_WEIGHT_ERROR);
    }

    return {
      workDate: input.workDate,
      beforeRoastWeightGram: input.beforeRoastWeightGram,
      afterRoastWeightGram: input.afterRoastWeightGram,
    };
  }

  export function buildPackageEntry(input: PackageEntryInput): PackageEntryInput {
    if (!isValidWorkDate(input.workDate)) {
      throw new Error(WORK_DATE_ERROR);
    }

    return {
      workDate: input.workDate,
      teamA: {
        goodCount: normalizeCountInput(input.teamA.goodCount),
        defectiveCount: normalizeCountInput(input.teamA.defectiveCount),
      },
      teamB: {
        goodCount: normalizeCountInput(input.teamB.goodCount),
        defectiveCount: normalizeCountInput(input.teamB.defectiveCount),
      },
    };
  }
  ```

  注: `HandpickSegment` 型は `input.segment !== 'first'` 比較で TypeScript が `'third'` をリテラル外として扱わないようテストでは `as` キャストを使用しているが、実装では実行時チェックで弾く。`HandpickSegment` を import に含めるのは将来の補助関数のためだが未使用なら省略してよい。lint(未使用 import 禁止)を満たすため、使わない場合は import から外すこと。

- [ ] **Step 4: テストを実行してPASSを確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: PASS。

- [ ] **Step 5: コミットする**
  ```
  git add lib/productionRecords.ts lib/productionRecords.test.ts
  git commit -m "feat: ハンドピック・焙煎・パッケージのエントリ組み立て関数を追加"
  ```

---

### Task: A-12 表示フォーマット formatPercent / formatKg

**Files:**

- Modify: `lib/productionRecords.ts`
- Test: `lib/productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く**
      関数 import に `formatKg`, `formatPercent` を追加する。末尾に追記する。

  ```typescript
  describe('formatPercent', () => {
    it('formats a ratio as a percentage with one decimal place', () => {
      expect(formatPercent(0.031)).toBe('3.1%');
      expect(formatPercent(0.17)).toBe('17.0%');
      expect(formatPercent(0)).toBe('0.0%');
    });
  });

  describe('formatKg', () => {
    it('formats grams as kilograms with two decimal places', () => {
      expect(formatKg(20100)).toBe('20.10');
      expect(formatKg(1660)).toBe('1.66');
      expect(formatKg(0)).toBe('0.00');
    });
  });
  ```

- [ ] **Step 2: テストを実行して失敗を確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: FAIL。`formatPercent is not a function`。

- [ ] **Step 3: 最小実装を書く**
      `lib/productionRecords.ts` 末尾に追加する。

  ```typescript
  export function formatPercent(rate: number): string {
    return `${(rate * 100).toFixed(1)}%`;
  }

  export function formatKg(gram: number): string {
    return (gram / 1000).toFixed(2);
  }
  ```

- [ ] **Step 4: テストを実行してPASSを確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: PASS。

- [ ] **Step 5: コミットする**
  ```
  git add lib/productionRecords.ts lib/productionRecords.test.ts
  git commit -m "feat: 表示フォーマット formatPercent・formatKg を追加"
  ```

---

### Task: A-13 CSV エスケープ escapeCsvCell

**Files:**

- Modify: `lib/productionRecords.ts`
- Test: `lib/productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く**
      関数 import に `escapeCsvCell` を追加する。末尾に追記する。

  ```typescript
  describe('escapeCsvCell', () => {
    it('leaves a plain value untouched', () => {
      expect(escapeCsvCell('ブラジル')).toBe('ブラジル');
      expect(escapeCsvCell(20000)).toBe('20000');
    });

    it('wraps values containing comma, quote, or newline in quotes (RFC4180)', () => {
      expect(escapeCsvCell('a,b')).toBe('"a,b"');
      expect(escapeCsvCell('a"b')).toBe('"a""b"');
      expect(escapeCsvCell('a\nb')).toBe('"a\nb"');
      expect(escapeCsvCell('a\rb')).toBe('"a\rb"');
    });
  });
  ```

- [ ] **Step 2: テストを実行して失敗を確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: FAIL。`escapeCsvCell is not a function`。

- [ ] **Step 3: 最小実装を書く**
      `lib/productionRecords.ts` 末尾に追加する(雛形 `productionPackRecords.ts` と同じ実装だが、契約どおり export する)。

  ```typescript
  export function escapeCsvCell(value: string | number): string {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }
  ```

- [ ] **Step 4: テストを実行してPASSを確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: PASS。

- [ ] **Step 5: コミットする**
  ```
  git add lib/productionRecords.ts lib/productionRecords.test.ts
  git commit -m "feat: CSVセルエスケープ escapeCsvCell を追加"
  ```

---

### Task: A-14 CSV 生成 buildProductionRecordCsv とファイル名 getProductionRecordCsvFileName

**Files:**

- Modify: `lib/productionRecords.ts`
- Test: `lib/productionRecords.test.ts`

CSV 12項目はこの順序で固定(本社確定): 1 対象月 / 2 配合 / 3 生豆重量kg / 4 欠点豆重量g / 5 欠点率 / 6 焙煎後重量kg / 7 水分蒸発率 / 8 30kg理論袋数 / 9 月良品数 / 10 月不良品数 / 11 月生産個数 / 12 パッケージロス率。先頭にBOM、改行はCRLF、kg列は `formatKg`、パーセント列は `formatPercent`、袋数/個数は整数(そのまま)。

- [ ] **Step 1: 失敗するテストを書く**
      型 import に `ProductionRecordMonthlySummary` を追加し、関数 import に `buildProductionRecordCsv`, `getProductionRecordCsvFileName` を追加する。末尾に追記する。仕様書サンプル値で12列を検算する。

  ```typescript
  describe('buildProductionRecordCsv', () => {
    it('builds a BOM csv with a 12-column header and one CRLF data row', () => {
      const summary: ProductionRecordMonthlySummary = {
        month: '2026-08',
        blendLabel: 'ブラジル 80% / グアテマラ 20%',
        greenBeanTotalGram: 20000,
        defectBeanTotalGram: 620,
        defectRate: 0.031,
        roastBeforeTotalGram: 2000,
        roastAfterTotalGram: 1660,
        roastYield: 0.83,
        moistureLossRate: 0.17,
        premixBags: 38,
        premixRemainderGram: 380,
        thirtyKgTheoryPacks: 2838,
        monthlyGoodCount: 2840,
        monthlyDefectiveCount: 82,
        monthlyProducedCount: 2922,
        packageLossRate: 82 / 2922,
      };

      const header =
        '対象月,配合,生豆重量kg,欠点豆重量g,欠点率,焙煎後重量kg,水分蒸発率,30kg理論袋数,月良品数,月不良品数,月生産個数,パッケージロス率';
      // 配合はスラッシュを含むがカンマを含まないためクォート不要
      const dataRow = '2026-08,ブラジル 80% / グアテマラ 20%,20.00,620,3.1%,1.66,17.0%,2838,2840,82,2922,2.8%';

      expect(buildProductionRecordCsv(summary)).toBe(`\uFEFF${header}\r\n${dataRow}`);
    });
  });

  describe('getProductionRecordCsvFileName', () => {
    it('uses the target month in the file name', () => {
      expect(getProductionRecordCsvFileName('2026-08')).toBe('production-record-2026-08.csv');
    });
  });
  ```

  型 import 行に `ProductionRecordMonthlySummary` を追加する(既に Task A-7 のテストで使用済みの場合は重複させない)。

- [ ] **Step 2: テストを実行して失敗を確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: FAIL。`buildProductionRecordCsv is not a function`。

- [ ] **Step 3: 最小実装を書く**
      `lib/productionRecords.ts` 末尾に追加する。列順は契約の12項目に厳密一致させる。

  ```typescript
  export function buildProductionRecordCsv(summary: ProductionRecordMonthlySummary): string {
    const header = [
      '対象月',
      '配合',
      '生豆重量kg',
      '欠点豆重量g',
      '欠点率',
      '焙煎後重量kg',
      '水分蒸発率',
      '30kg理論袋数',
      '月良品数',
      '月不良品数',
      '月生産個数',
      'パッケージロス率',
    ];

    const dataRow: Array<string | number> = [
      summary.month,
      summary.blendLabel,
      formatKg(summary.greenBeanTotalGram),
      summary.defectBeanTotalGram,
      formatPercent(summary.defectRate),
      formatKg(summary.roastAfterTotalGram),
      formatPercent(summary.moistureLossRate),
      summary.thirtyKgTheoryPacks,
      summary.monthlyGoodCount,
      summary.monthlyDefectiveCount,
      summary.monthlyProducedCount,
      formatPercent(summary.packageLossRate),
    ];

    const rows = [header, dataRow.map((cell) => String(cell))];
    return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}`;
  }

  export function getProductionRecordCsvFileName(month: string): string {
    return `production-record-${month}.csv`;
  }
  ```

  注: ヘッダの各セルもカンマ等を含まないため `escapeCsvCell` を通しても変化しない。`配合` 列は半角スラッシュ区切りでカンマを含まないためクォートされない。期待値はこの前提で固定している。

- [ ] **Step 4: テストを実行してPASSを確認する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: PASS。

- [ ] **Step 5: コミットする**
  ```
  git add lib/productionRecords.ts lib/productionRecords.test.ts
  git commit -m "feat: 月合計CSV生成とファイル名関数を追加"
  ```

---

### Task: A-15 フェーズA 全体検証(build / test:run / format:check)

**Files:**

- (検証のみ。新規変更なし)

- [ ] **Step 1: 純粋ロジック層の全テストを実行する**
      `npx vitest run lib/productionRecords.test.ts`
      期待: PASS。Task A-2〜A-14 で追加した全 describe が緑。

- [ ] **Step 2: ビルドを実行する**
      `npm run build`
      期待: 成功(型エラー・未使用 import エラーなし)。未使用 import があれば該当箇所を修正してから再実行する。

- [ ] **Step 3: 全ユニットテストを実行する**
      `npm run test:run`
      期待: 全テスト PASS。既存テストへの影響がないこと(types/index.ts への export 追加は既存に影響しない)。

- [ ] **Step 4: フォーマットを確認する**
      `npm run format:check`
      期待: 警告なし。漏れがあれば `npx prettier --write lib/productionRecords.ts lib/productionRecords.test.ts types/production-record.ts types/index.ts` を実行して整形し、`git add` + `git commit -m "style: 生産記録ロジックのPrettier整形"` でコミットする。

- [ ] **Step 5: フェーズ完了をコミット(整形差分があった場合のみ)**
      整形差分がなければこのステップはスキップ。差分があれば Step 4 のコミットで完了。

---

フェーズA成果物の最終ファイルパス(後続フェーズ参照用):

- `D:\Dev\roastplus\types\production-record.ts` (全型定義)
- `D:\Dev\roastplus\types\index.ts` (export \* 追加済み)
- `D:\Dev\roastplus\lib\productionRecords.ts` (純粋ロジック関数すべて、定数 `DEFAULT_POWDER_PER_PACK_GRAM`/`PREMIX_BAG_GRAM`/`THIRTY_KG_BASE_GRAM`/`MAX_BLEND_ITEMS` を export)
- `D:\Dev\roastplus\lib\productionRecords.test.ts` (純粋関数テスト、モックなし)

後続フェーズ(B: Firestore層、C: フック、D: UI)は `lib/productionRecords.ts` の `buildProductionRecordMonth`/`buildHandpickEntry`/`buildRoastEntry`/`buildPackageEntry`/`buildMonthlySummary`/`buildProductionRecordCsv`/`getProductionRecordCsvFileName`/`formatPercent`/`formatKg`/`DEFAULT_POWDER_PER_PACK_GRAM` を import して利用すること。

---

## フェーズB: Firestore層

このフェーズでは Firestore データアクセス層 `lib/firestore/productionRecords.ts` を実装する。フェーズA(純粋ロジック層 `lib/productionRecords.ts`)が完了し、`buildProductionRecordMonth` / `buildHandpickEntry` / `buildRoastEntry` / `buildPackageEntry` / `isValidProductionMonth` / `normalizeWeightInput` / `normalizeCountInput` がエクスポート済みであることを前提とする。型は `types/production-record.ts`(フェーズAで作成済み、`types/index.ts` から re-export 済み)を使用する。

参照元の構造は `lib/firestore/productionPackRecords.ts`(参照ヘルパー・`runTransaction` による createdAt 維持 upsert・`subscribe` 系の `onSnapshot` パターン)と `lib/firestore/productionPackRecords.test.ts`(`vi.hoisted` モック束ね・`vi.mock('../firebase')` を `{default:{}}` に・モック後の動的 import)に完全一致させる。月docは `productionPackRecords` と同様の日付/月ベース doc ID(月docは `month` を doc ID とする)を採用し、サブコレクション entry は `doc(colRef)` 自動IDで追加する。delete はv1スコープ外のため実装しない。

すべてのタスクは TDD(Step1: 失敗するテスト → Step2: FAIL確認 → Step3: 最小実装 → Step4: PASS確認 → Step5: コミット)で進める。テストは co-located の `lib/firestore/productionRecords.test.ts` に集約し、タスクごとに `describe` ブロックを追記していく。

---

### Task: モック土台とコレクション/ドキュメント参照ヘルパー

**Files:**

- Create: `D:\Dev\roastplus\lib\firestore\productionRecords.ts`
- Test: `D:\Dev\roastplus\lib\firestore\productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く。** `lib/firestore/productionRecords.test.ts` を新規作成し、`vi.hoisted` モック束ね・`firebase/firestore` モジュールモック・`../firebase` を `{default:{}}` にするモック、共通スナップショットファクトリ、参照ヘルパーの `describe` を書く。`productionPackRecords.test.ts` の Step1〜44行の `vi.hoisted` ブロック構造を完全コピーし、`addDoc` / `setDoc` を追加する(entry 追加で使うため)。

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FirestoreTransactionMock {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

const firestoreMocks = vi.hoisted(() => {
  const transaction: FirestoreTransactionMock = {
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  return {
    transaction,
    getFirestore: vi.fn(() => ({ app: 'mock-firestore' })),
    collection: vi.fn((first: { path?: string } | unknown, ...segments: string[]) => {
      const basePath =
        first && typeof first === 'object' && 'path' in first && typeof first.path === 'string' ? first.path : '';
      const path = basePath ? [basePath, ...segments].join('/') : segments.join('/');
      return { path };
    }),
    doc: vi.fn((first: { path?: string } | unknown, ...segments: string[]) => {
      const basePath =
        first && typeof first === 'object' && 'path' in first && typeof first.path === 'string' ? first.path : '';
      // segmentsが空(doc(colRef)自動ID)の場合は固定のauto-idを返す
      if (segments.length === 0) {
        return { id: 'auto-generated-id', path: basePath ? `${basePath}/auto-generated-id` : 'auto-generated-id' };
      }
      const path = basePath ? [basePath, ...segments].join('/') : segments.join('/');
      return { id: segments.at(-1), path };
    }),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    addDoc: vi.fn(),
    setDoc: vi.fn(),
    limit: vi.fn((value: number) => ({ type: 'limit', value })),
    onSnapshot: vi.fn(),
    orderBy: vi.fn((field: string, direction: string) => ({ type: 'orderBy', field, direction })),
    query: vi.fn((...args: unknown[]) => ({ args })),
    runTransaction: vi.fn(async (_db: unknown, callback: (transaction: FirestoreTransactionMock) => Promise<void>) =>
      callback(transaction)
    ),
    serverTimestamp: vi.fn(() => 'server-timestamp'),
    where: vi.fn((field: string, operator: string, value: string) => ({ type: 'where', field, operator, value })),
  };
});

vi.mock('../firebase', () => ({
  default: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: firestoreMocks.collection,
  doc: firestoreMocks.doc,
  getDocs: firestoreMocks.getDocs,
  getDoc: firestoreMocks.getDoc,
  addDoc: firestoreMocks.addDoc,
  setDoc: firestoreMocks.setDoc,
  getFirestore: firestoreMocks.getFirestore,
  limit: firestoreMocks.limit,
  onSnapshot: firestoreMocks.onSnapshot,
  orderBy: firestoreMocks.orderBy,
  query: firestoreMocks.query,
  runTransaction: firestoreMocks.runTransaction,
  serverTimestamp: firestoreMocks.serverTimestamp,
  where: firestoreMocks.where,
}));

/** 単一docスナップショットを生成する。 */
function docSnapshot(id: string, data: Record<string, unknown> | null) {
  return {
    exists: () => data !== null,
    id,
    data: () => data ?? undefined,
  };
}

/** コレクションスナップショット(docs配列)を生成する。 */
function collectionSnapshot(records: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    docs: records.map((record) => ({
      id: record.id,
      data: () => record.data,
    })),
  };
}

describe('getProductionRecordsCollectionRef', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses /users/{uid}/productionRecords as the collection path', async () => {
    const { getProductionRecordsCollectionRef } = await import('./productionRecords');

    expect(getProductionRecordsCollectionRef('user-1')).toEqual({
      path: 'users/user-1/productionRecords',
    });
  });
});

describe('getProductionRecordMonthDocRef', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses /users/{uid}/productionRecords/{YYYY-MM} as the document path', async () => {
    const { getProductionRecordMonthDocRef } = await import('./productionRecords');

    expect(getProductionRecordMonthDocRef('user-1', '2026-08')).toEqual({
      id: '2026-08',
      path: 'users/user-1/productionRecords/2026-08',
    });
  });

  it('rejects invalid months before building a Firestore document path', async () => {
    const { getProductionRecordMonthDocRef } = await import('./productionRecords');

    expect(() => getProductionRecordMonthDocRef('user-1', '2026-13')).toThrow('対象月が正しくありません');
  });
});

describe('subcollection refs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds handpickEntries / roastEntries / packageEntries subcollection paths under the month doc', async () => {
    const { getHandpickEntriesCollectionRef, getRoastEntriesCollectionRef, getPackageEntriesCollectionRef } =
      await import('./productionRecords');

    expect(getHandpickEntriesCollectionRef('user-1', '2026-08')).toEqual({
      path: 'users/user-1/productionRecords/2026-08/handpickEntries',
    });
    expect(getRoastEntriesCollectionRef('user-1', '2026-08')).toEqual({
      path: 'users/user-1/productionRecords/2026-08/roastEntries',
    });
    expect(getPackageEntriesCollectionRef('user-1', '2026-08')).toEqual({
      path: 'users/user-1/productionRecords/2026-08/packageEntries',
    });
  });

  it('rejects invalid months when building subcollection refs', async () => {
    const { getHandpickEntriesCollectionRef } = await import('./productionRecords');

    expect(() => getHandpickEntriesCollectionRef('user-1', '2026-13')).toThrow('対象月が正しくありません');
  });
});
```

- [ ] **Step 2: テスト実行して失敗を確認する。** `npx vitest run lib/firestore/productionRecords.test.ts` を実行。`Failed to resolve import "./productionRecords"` で全テストが FAIL することを確認する(実装ファイル未作成のため)。期待: `Test Files 1 failed`。

- [ ] **Step 3: 最小実装。** `lib/firestore/productionRecords.ts` を新規作成し、import 群と参照ヘルパーを書く。`getProductionRecordMonthDocRef` は `isValidProductionMonth` で検証し不正なら throw する。サブコレクション ref は月docref配下に `collection(monthDocRef, ...)` で作る。

```typescript
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb, removeUndefinedFields } from './common';
import {
  buildHandpickEntry,
  buildPackageEntry,
  buildProductionRecordMonth,
  buildRoastEntry,
  isValidProductionMonth,
} from '@/lib/productionRecords';
import type {
  HandpickEntry,
  HandpickEntryInput,
  HandpickSegment,
  PackageEntry,
  PackageEntryInput,
  ProductionRecordMonth,
  ProductionRecordMonthInput,
  RoastEntry,
  RoastEntryInput,
  TeamCounts,
} from '@/types';

export const RECENT_PRODUCTION_MONTHS_LIMIT = 24;

function assertValidMonth(month: string): void {
  if (!isValidProductionMonth(month)) {
    throw new Error('対象月が正しくありません');
  }
}

export function getProductionRecordsCollectionRef(userId: string) {
  return collection(getDb(), 'users', userId, 'productionRecords');
}

export function getProductionRecordMonthDocRef(userId: string, month: string) {
  assertValidMonth(month);
  return doc(getProductionRecordsCollectionRef(userId), month);
}

export function getHandpickEntriesCollectionRef(userId: string, month: string) {
  return collection(getProductionRecordMonthDocRef(userId, month), 'handpickEntries');
}

export function getRoastEntriesCollectionRef(userId: string, month: string) {
  return collection(getProductionRecordMonthDocRef(userId, month), 'roastEntries');
}

export function getPackageEntriesCollectionRef(userId: string, month: string) {
  return collection(getProductionRecordMonthDocRef(userId, month), 'packageEntries');
}
```

- [ ] **Step 4: テスト実行して PASS を確認する。** `npx vitest run lib/firestore/productionRecords.test.ts` を実行。参照ヘルパーの全テスト(`getProductionRecordsCollectionRef` / `getProductionRecordMonthDocRef` 2件 / `subcollection refs` 2件)が PASS することを確認する。期待: `Test Files 1 passed` / `Tests 5 passed`。

- [ ] **Step 5: コミット。**

```
git add lib/firestore/productionRecords.ts lib/firestore/productionRecords.test.ts
git commit -m "feat: 生産記録Firestore参照ヘルパーを追加"
```

コミットメッセージ:

```
feat: 生産記録Firestore参照ヘルパーを追加

users/{uid}/productionRecords の月docと
handpick/roast/packageEntriesサブコレクション参照を実装。
month不正時はthrowする。
```

---

### Task: 月docの normalize と subscribeProductionRecordMonth

**Files:**

- Modify: `D:\Dev\roastplus\lib\firestore\productionRecords.ts`
- Test: `D:\Dev\roastplus\lib\firestore\productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く。** `productionRecords.test.ts` の末尾に追記する。`subscribeProductionRecordMonth` は `onSnapshot` の単一doc コールバックで normalize し、`exists()` が false なら `null` を返すことを検証する。`onSnapshot` モックは「成功コールバックを即時呼ぶ」ように実装する。

```typescript
describe('subscribeProductionRecordMonth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes the month document and passes it to the callback', async () => {
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, onNext: (snap: unknown) => void) => {
      onNext(
        docSnapshot('2026-08', {
          month: '2026-08',
          greenBeanTotalGram: 30000,
          powderPerPackGram: 8.5,
          blendItems: [
            { beanName: 'ブラジル', ratioPercent: 80 },
            { beanName: 'グアテマラ', ratioPercent: 20 },
          ],
          createdAt: 'created-at',
          updatedAt: 'updated-at',
        })
      );
      return () => undefined;
    });

    const { subscribeProductionRecordMonth } = await import('./productionRecords');
    const callback = vi.fn();

    subscribeProductionRecordMonth('user-1', '2026-08', callback);

    expect(callback).toHaveBeenCalledWith({
      month: '2026-08',
      greenBeanTotalGram: 30000,
      powderPerPackGram: 8.5,
      blendItems: [
        { beanName: 'ブラジル', ratioPercent: 80 },
        { beanName: 'グアテマラ', ratioPercent: 20 },
      ],
      createdAt: 'created-at',
      updatedAt: 'updated-at',
    });
  });

  it('passes null to the callback when the month document does not exist', async () => {
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, onNext: (snap: unknown) => void) => {
      onNext(docSnapshot('2026-08', null));
      return () => undefined;
    });

    const { subscribeProductionRecordMonth } = await import('./productionRecords');
    const callback = vi.fn();

    subscribeProductionRecordMonth('user-1', '2026-08', callback);

    expect(callback).toHaveBeenCalledWith(null);
  });

  it('forwards errors to onError and passes null to the callback', async () => {
    const error = new Error('permission-denied');
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, _onNext: unknown, onErrorCb: (e: Error) => void) => {
      onErrorCb(error);
      return () => undefined;
    });

    const { subscribeProductionRecordMonth } = await import('./productionRecords');
    const callback = vi.fn();
    const onError = vi.fn();

    subscribeProductionRecordMonth('user-1', '2026-08', callback, onError);

    expect(onError).toHaveBeenCalledWith(error);
    expect(callback).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: テスト実行して失敗を確認する。** `npx vitest run lib/firestore/productionRecords.test.ts` を実行。`subscribeProductionRecordMonth is not a function`(または import undefined)で `subscribeProductionRecordMonth` の3テストが FAIL することを確認する。期待: `Tests 3 failed | 5 passed`。

- [ ] **Step 3: 最小実装。** `lib/firestore/productionRecords.ts` に `normalizeBlendItems` / `normalizeProductionRecordMonth` と `subscribeProductionRecordMonth` を追記する。normalize は `DocumentData` を `typeof` チェックで型安全化し、`createdAt` / `updatedAt` はそのまま保持する。`console.error` ログ文言は `productionPackRecords.ts` のスタイルに合わせる。

```typescript
function normalizeBlendItems(value: unknown): ProductionRecordMonth['blendItems'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }
    const record = item as Record<string, unknown>;
    return [
      {
        beanName: typeof record.beanName === 'string' ? record.beanName : '',
        ratioPercent: typeof record.ratioPercent === 'number' ? record.ratioPercent : 0,
      },
    ];
  });
}

function normalizeProductionRecordMonth(id: string, data: DocumentData): ProductionRecordMonth {
  return {
    month: typeof data.month === 'string' ? data.month : id,
    greenBeanTotalGram: typeof data.greenBeanTotalGram === 'number' ? data.greenBeanTotalGram : 0,
    powderPerPackGram: typeof data.powderPerPackGram === 'number' ? data.powderPerPackGram : 0,
    blendItems: normalizeBlendItems(data.blendItems),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribeProductionRecordMonth(
  userId: string,
  month: string,
  callback: (record: ProductionRecordMonth | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const docRef = getProductionRecordMonthDocRef(userId, month);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback(normalizeProductionRecordMonth(snapshot.id, snapshot.data()));
    },
    (error) => {
      console.error('Failed to subscribe production record month:', error);
      onError?.(error);
      callback(null);
    }
  );
}
```

- [ ] **Step 4: テスト実行して PASS を確認する。** `npx vitest run lib/firestore/productionRecords.test.ts` を実行。`subscribeProductionRecordMonth` の3テストを含む全テストが PASS することを確認する。期待: `Tests 8 passed`。

- [ ] **Step 5: コミット。**

```
git add lib/firestore/productionRecords.ts lib/firestore/productionRecords.test.ts
git commit -m "feat: 生産記録の月doc購読を追加"
```

コミットメッセージ:

```
feat: 生産記録の月doc購読を追加

subscribeProductionRecordMonthとnormalize関数を実装。
onSnapshotで単一docをnormalizeし、未存在はnull、
エラーはonErrorへ転送する。
```

---

### Task: saveProductionRecordMonth(createdAt維持upsert)

**Files:**

- Modify: `D:\Dev\roastplus\lib\firestore\productionRecords.ts`
- Test: `D:\Dev\roastplus\lib\firestore\productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く。** `runTransaction` で createdAt 維持 upsert すること、保存パスが `users/user-1/productionRecords/2026-08` であること、`buildProductionRecordMonth` で整形された値 + `serverTimestamp` が `transaction.set` に渡ることを検証する。

```typescript
describe('saveProductionRecordMonth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.transaction.get.mockResolvedValue({ exists: () => false, data: () => undefined });
  });

  it('saves the built month document to the month-based path', async () => {
    const { saveProductionRecordMonth } = await import('./productionRecords');

    await saveProductionRecordMonth('user-1', {
      month: '2026-08',
      greenBeanTotalGram: 30000,
      powderPerPackGram: 8.5,
      blendItems: [
        { beanName: 'ブラジル', ratioPercent: 80 },
        { beanName: 'グアテマラ', ratioPercent: 20 },
      ],
    });

    expect(firestoreMocks.transaction.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionRecords/2026-08' }),
      {
        month: '2026-08',
        greenBeanTotalGram: 30000,
        powderPerPackGram: 8.5,
        blendItems: [
          { beanName: 'ブラジル', ratioPercent: 80 },
          { beanName: 'グアテマラ', ratioPercent: 20 },
        ],
        createdAt: 'server-timestamp',
        updatedAt: 'server-timestamp',
      }
    );
  });

  it('preserves createdAt when updating an existing month document', async () => {
    firestoreMocks.transaction.get.mockResolvedValue({
      exists: () => true,
      data: () => ({ createdAt: 'existing-created-at' }),
    });
    const { saveProductionRecordMonth } = await import('./productionRecords');

    await saveProductionRecordMonth('user-1', {
      month: '2026-08',
      greenBeanTotalGram: 30000,
      powderPerPackGram: 8.5,
      blendItems: [{ beanName: 'ブラジル', ratioPercent: 100 }],
    });

    expect(firestoreMocks.transaction.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionRecords/2026-08' }),
      expect.objectContaining({
        createdAt: 'existing-created-at',
        updatedAt: 'server-timestamp',
      })
    );
  });
});
```

- [ ] **Step 2: テスト実行して失敗を確認する。** `npx vitest run lib/firestore/productionRecords.test.ts` を実行。`saveProductionRecordMonth is not a function` で2テストが FAIL することを確認する。期待: `Tests 2 failed | 8 passed`。

- [ ] **Step 3: 最小実装。** `lib/firestore/productionRecords.ts` に追記する。`buildProductionRecordMonth(input)` で検証・整形 → `runTransaction` 内で既存 doc の `createdAt` を維持 → `removeUndefinedFields` + `serverTimestamp` で set する。`productionPackRecords.ts` の `saveProductionPackRecord`(137〜154行)と同一構造。

```typescript
export async function saveProductionRecordMonth(userId: string, input: ProductionRecordMonthInput): Promise<void> {
  const record = buildProductionRecordMonth(input);
  const docRef = getProductionRecordMonthDocRef(userId, record.month);

  await runTransaction(getDb(), async (transaction) => {
    const snapshot = await transaction.get(docRef);
    const existingData = snapshot.exists() ? snapshot.data() : undefined;

    transaction.set(
      docRef,
      removeUndefinedFields({
        ...record,
        createdAt: existingData?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });
}
```

- [ ] **Step 4: テスト実行して PASS を確認する。** `npx vitest run lib/firestore/productionRecords.test.ts` を実行。`saveProductionRecordMonth` の2テストを含む全テストが PASS することを確認する。期待: `Tests 10 passed`。

- [ ] **Step 5: コミット。**

```
git add lib/firestore/productionRecords.ts lib/firestore/productionRecords.test.ts
git commit -m "feat: 生産記録の月doc保存を追加"
```

コミットメッセージ:

```
feat: 生産記録の月doc保存を追加

saveProductionRecordMonthをrunTransactionで実装。
buildProductionRecordMonthで整形し、既存createdAtを
維持したupsert保存を行う。
```

---

### Task: subscribeRecentProductionMonths

**Files:**

- Modify: `D:\Dev\roastplus\lib\firestore\productionRecords.ts`
- Test: `D:\Dev\roastplus\lib\firestore\productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く。** `query(col, orderBy('month','desc'), limit(24))` で月docを購読し、各 doc を normalize して配列で返すこと、エラー時に `onError` 転送 + 空配列を返すことを検証する。

```typescript
describe('subscribeRecentProductionMonths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries recent months ordered by month desc with a limit of 24', async () => {
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, onNext: (snap: unknown) => void) => {
      onNext(
        collectionSnapshot([
          {
            id: '2026-08',
            data: {
              month: '2026-08',
              greenBeanTotalGram: 30000,
              powderPerPackGram: 8.5,
              blendItems: [{ beanName: 'ブラジル', ratioPercent: 100 }],
            },
          },
        ])
      );
      return () => undefined;
    });

    const { subscribeRecentProductionMonths } = await import('./productionRecords');
    const callback = vi.fn();

    subscribeRecentProductionMonths('user-1', callback);

    expect(firestoreMocks.orderBy).toHaveBeenCalledWith('month', 'desc');
    expect(firestoreMocks.limit).toHaveBeenCalledWith(24);
    expect(callback).toHaveBeenCalledWith([
      {
        month: '2026-08',
        greenBeanTotalGram: 30000,
        powderPerPackGram: 8.5,
        blendItems: [{ beanName: 'ブラジル', ratioPercent: 100 }],
        createdAt: undefined,
        updatedAt: undefined,
      },
    ]);
  });

  it('forwards errors to onError and passes an empty array to the callback', async () => {
    const error = new Error('permission-denied');
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, _onNext: unknown, onErrorCb: (e: Error) => void) => {
      onErrorCb(error);
      return () => undefined;
    });

    const { subscribeRecentProductionMonths } = await import('./productionRecords');
    const callback = vi.fn();
    const onError = vi.fn();

    subscribeRecentProductionMonths('user-1', callback, onError);

    expect(onError).toHaveBeenCalledWith(error);
    expect(callback).toHaveBeenCalledWith([]);
  });
});
```

- [ ] **Step 2: テスト実行して失敗を確認する。** `npx vitest run lib/firestore/productionRecords.test.ts` を実行。`subscribeRecentProductionMonths is not a function` で2テストが FAIL することを確認する。期待: `Tests 2 failed | 10 passed`。

- [ ] **Step 3: 最小実装。** `lib/firestore/productionRecords.ts` に追記する。`productionPackRecords.ts` の `subscribeRecentProductionPackRecords`(92〜119行)と同一構造で、`orderBy('month','desc')` + `limit(RECENT_PRODUCTION_MONTHS_LIMIT)` を使う。

```typescript
export function subscribeRecentProductionMonths(
  userId: string,
  callback: (records: ProductionRecordMonth[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const monthsQuery = query(
    getProductionRecordsCollectionRef(userId),
    orderBy('month', 'desc'),
    limit(RECENT_PRODUCTION_MONTHS_LIMIT)
  );

  return onSnapshot(
    monthsQuery,
    (snapshot) => {
      callback(snapshot.docs.map((monthDoc) => normalizeProductionRecordMonth(monthDoc.id, monthDoc.data())));
    },
    (error) => {
      console.error('Failed to subscribe recent production months:', error);
      onError?.(error);
      callback([]);
    }
  );
}
```

- [ ] **Step 4: テスト実行して PASS を確認する。** `npx vitest run lib/firestore/productionRecords.test.ts` を実行。`subscribeRecentProductionMonths` の2テストを含む全テストが PASS することを確認する。期待: `Tests 12 passed`。

- [ ] **Step 5: コミット。**

```
git add lib/firestore/productionRecords.ts lib/firestore/productionRecords.test.ts
git commit -m "feat: 直近の生産記録月一覧購読を追加"
```

コミットメッセージ:

```
feat: 直近の生産記録月一覧購読を追加

subscribeRecentProductionMonthsを実装。
month降順・上限24件で月docを購読しnormalizeして返す。
```

---

### Task: ハンドピックentryの normalize / subscribe / add / update

**Files:**

- Modify: `D:\Dev\roastplus\lib\firestore\productionRecords.ts`
- Test: `D:\Dev\roastplus\lib\firestore\productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く。** subscribe は `orderBy('createdAt','desc')` で購読し各 doc を `id` 付きで normalize すること、add は `doc(col)` 自動ID + `setDoc(removeUndefinedFields({...entry, createdAt, updatedAt}))` で保存し `docRef.id` を返すこと、update は `setDoc(docRef, {...entry, updatedAt}, {merge:true})` で更新することを検証する。

```typescript
describe('subscribeHandpickEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries handpick entries ordered by createdAt desc and normalizes them with doc id', async () => {
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, onNext: (snap: unknown) => void) => {
      onNext(
        collectionSnapshot([
          {
            id: 'entry-1',
            data: {
              workDate: '2026-08-10',
              beanName: 'ブラジル',
              segment: 'first',
              greenBeanWeightGram: 10000,
              defectBeanWeightGram: 300,
              createdAt: 'created-at',
              updatedAt: 'updated-at',
            },
          },
        ])
      );
      return () => undefined;
    });

    const { subscribeHandpickEntries } = await import('./productionRecords');
    const callback = vi.fn();

    subscribeHandpickEntries('user-1', '2026-08', callback);

    expect(firestoreMocks.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(callback).toHaveBeenCalledWith([
      {
        id: 'entry-1',
        workDate: '2026-08-10',
        beanName: 'ブラジル',
        segment: 'first',
        greenBeanWeightGram: 10000,
        defectBeanWeightGram: 300,
        createdAt: 'created-at',
        updatedAt: 'updated-at',
      },
    ]);
  });

  it('forwards errors to onError and passes an empty array to the callback', async () => {
    const error = new Error('permission-denied');
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, _onNext: unknown, onErrorCb: (e: Error) => void) => {
      onErrorCb(error);
      return () => undefined;
    });

    const { subscribeHandpickEntries } = await import('./productionRecords');
    const callback = vi.fn();
    const onError = vi.fn();

    subscribeHandpickEntries('user-1', '2026-08', callback, onError);

    expect(onError).toHaveBeenCalledWith(error);
    expect(callback).toHaveBeenCalledWith([]);
  });
});

describe('addHandpickEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a handpick entry with an auto-generated id and returns it', async () => {
    const { addHandpickEntry } = await import('./productionRecords');

    const id = await addHandpickEntry('user-1', '2026-08', {
      workDate: '2026-08-10',
      beanName: 'ブラジル',
      segment: 'first',
      greenBeanWeightGram: 10000,
      defectBeanWeightGram: 300,
    });

    expect(id).toBe('auto-generated-id');
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionRecords/2026-08/handpickEntries/auto-generated-id' }),
      {
        workDate: '2026-08-10',
        beanName: 'ブラジル',
        segment: 'first',
        greenBeanWeightGram: 10000,
        defectBeanWeightGram: 300,
        createdAt: 'server-timestamp',
        updatedAt: 'server-timestamp',
      }
    );
  });
});

describe('updateHandpickEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges the rebuilt handpick entry with a refreshed updatedAt', async () => {
    const { updateHandpickEntry } = await import('./productionRecords');

    await updateHandpickEntry('user-1', '2026-08', 'entry-1', {
      workDate: '2026-08-10',
      beanName: 'グアテマラ',
      segment: 'second',
      greenBeanWeightGram: 12000,
      defectBeanWeightGram: 0,
    });

    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionRecords/2026-08/handpickEntries/entry-1' }),
      {
        workDate: '2026-08-10',
        beanName: 'グアテマラ',
        segment: 'second',
        greenBeanWeightGram: 12000,
        defectBeanWeightGram: 0,
        updatedAt: 'server-timestamp',
      },
      { merge: true }
    );
  });
});
```

- [ ] **Step 2: テスト実行して失敗を確認する。** `npx vitest run lib/firestore/productionRecords.test.ts` を実行。`subscribeHandpickEntries`/`addHandpickEntry`/`updateHandpickEntry is not a function` で4テストが FAIL することを確認する。期待: `Tests 4 failed | 12 passed`。

- [ ] **Step 3: 最小実装。** `lib/firestore/productionRecords.ts` に追記する。`normalizeHandpickEntry` は `buildHandpickEntry` で型安全に整形し `id` + timestamp を付与する(segment は `'first'`/`'second'` 以外なら `'first'` にフォールバック)。add は `doc(colRef)` 自動ID + `setDoc`、update は `setDoc(..., {merge:true})`。

```typescript
function normalizeHandpickSegment(value: unknown): HandpickSegment {
  return value === 'second' ? 'second' : 'first';
}

function normalizeHandpickEntry(id: string, data: DocumentData): HandpickEntry {
  const entry = buildHandpickEntry({
    workDate: typeof data.workDate === 'string' ? data.workDate : '',
    beanName: typeof data.beanName === 'string' ? data.beanName : '',
    segment: normalizeHandpickSegment(data.segment),
    greenBeanWeightGram: typeof data.greenBeanWeightGram === 'number' ? data.greenBeanWeightGram : 0,
    defectBeanWeightGram: typeof data.defectBeanWeightGram === 'number' ? data.defectBeanWeightGram : 0,
  });

  return {
    ...entry,
    id,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribeHandpickEntries(
  userId: string,
  month: string,
  callback: (entries: HandpickEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const entriesQuery = query(getHandpickEntriesCollectionRef(userId, month), orderBy('createdAt', 'desc'));

  return onSnapshot(
    entriesQuery,
    (snapshot) => {
      callback(snapshot.docs.map((entryDoc) => normalizeHandpickEntry(entryDoc.id, entryDoc.data())));
    },
    (error) => {
      console.error('Failed to subscribe handpick entries:', error);
      onError?.(error);
      callback([]);
    }
  );
}

export async function addHandpickEntry(userId: string, month: string, input: HandpickEntryInput): Promise<string> {
  const entry = buildHandpickEntry(input);
  const docRef = doc(getHandpickEntriesCollectionRef(userId, month));

  await setDoc(
    docRef,
    removeUndefinedFields({
      ...entry,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  return docRef.id;
}

export async function updateHandpickEntry(
  userId: string,
  month: string,
  entryId: string,
  input: HandpickEntryInput
): Promise<void> {
  const entry = buildHandpickEntry(input);
  const docRef = doc(getHandpickEntriesCollectionRef(userId, month), entryId);

  await setDoc(
    docRef,
    {
      ...entry,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
```

> 注意: `buildHandpickEntry` の戻り値は `defectBeanWeightGram: 0` のように 0 を含むため、`removeUndefinedFields` で削除されないことを Step 4 のテスト(`addHandpickEntry`)で担保する。`updateHandpickEntry` は契約どおり `removeUndefinedFields` を介さず直接 `setDoc(..., {merge:true})` する。

- [ ] **Step 4: テスト実行して PASS を確認する。** `npx vitest run lib/firestore/productionRecords.test.ts` を実行。ハンドピックentryの4テストを含む全テストが PASS することを確認する。期待: `Tests 16 passed`。

- [ ] **Step 5: コミット。**

```
git add lib/firestore/productionRecords.ts lib/firestore/productionRecords.test.ts
git commit -m "feat: ハンドピックentryのCRUDと購読を追加"
```

コミットメッセージ:

```
feat: ハンドピックentryのCRUDと購読を追加

subscribe/add/updateHandpickEntryとnormalizeを実装。
自動ID + setDocで追加し、createdAt降順で購読する。
```

---

### Task: 焙煎entryの normalize / subscribe / add / update

**Files:**

- Modify: `D:\Dev\roastplus\lib\firestore\productionRecords.ts`
- Test: `D:\Dev\roastplus\lib\firestore\productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く。** ハンドピックと同じパターンで `RoastEntry` 型(`beforeRoastWeightGram` / `afterRoastWeightGram`)を検証する。

```typescript
describe('subscribeRoastEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries roast entries ordered by createdAt desc and normalizes them with doc id', async () => {
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, onNext: (snap: unknown) => void) => {
      onNext(
        collectionSnapshot([
          {
            id: 'roast-1',
            data: {
              workDate: '2026-08-10',
              beforeRoastWeightGram: 10000,
              afterRoastWeightGram: 8200,
              createdAt: 'created-at',
              updatedAt: 'updated-at',
            },
          },
        ])
      );
      return () => undefined;
    });

    const { subscribeRoastEntries } = await import('./productionRecords');
    const callback = vi.fn();

    subscribeRoastEntries('user-1', '2026-08', callback);

    expect(firestoreMocks.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(callback).toHaveBeenCalledWith([
      {
        id: 'roast-1',
        workDate: '2026-08-10',
        beforeRoastWeightGram: 10000,
        afterRoastWeightGram: 8200,
        createdAt: 'created-at',
        updatedAt: 'updated-at',
      },
    ]);
  });
});

describe('addRoastEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a roast entry with an auto-generated id and returns it', async () => {
    const { addRoastEntry } = await import('./productionRecords');

    const id = await addRoastEntry('user-1', '2026-08', {
      workDate: '2026-08-10',
      beforeRoastWeightGram: 10000,
      afterRoastWeightGram: 8200,
    });

    expect(id).toBe('auto-generated-id');
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionRecords/2026-08/roastEntries/auto-generated-id' }),
      {
        workDate: '2026-08-10',
        beforeRoastWeightGram: 10000,
        afterRoastWeightGram: 8200,
        createdAt: 'server-timestamp',
        updatedAt: 'server-timestamp',
      }
    );
  });
});

describe('updateRoastEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges the rebuilt roast entry with a refreshed updatedAt', async () => {
    const { updateRoastEntry } = await import('./productionRecords');

    await updateRoastEntry('user-1', '2026-08', 'roast-1', {
      workDate: '2026-08-11',
      beforeRoastWeightGram: 12000,
      afterRoastWeightGram: 9800,
    });

    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionRecords/2026-08/roastEntries/roast-1' }),
      {
        workDate: '2026-08-11',
        beforeRoastWeightGram: 12000,
        afterRoastWeightGram: 9800,
        updatedAt: 'server-timestamp',
      },
      { merge: true }
    );
  });
});
```

- [ ] **Step 2: テスト実行して失敗を確認する。** `npx vitest run lib/firestore/productionRecords.test.ts` を実行。焙煎entryの3テストが `... is not a function` で FAIL することを確認する。期待: `Tests 3 failed | 16 passed`。

- [ ] **Step 3: 最小実装。** `lib/firestore/productionRecords.ts` に追記する。`normalizeRoastEntry` は `buildRoastEntry` で整形し `id` + timestamp 付与。subscribe/add/update はハンドピックと同一パターン。

```typescript
function normalizeRoastEntry(id: string, data: DocumentData): RoastEntry {
  const entry = buildRoastEntry({
    workDate: typeof data.workDate === 'string' ? data.workDate : '',
    beforeRoastWeightGram: typeof data.beforeRoastWeightGram === 'number' ? data.beforeRoastWeightGram : 0,
    afterRoastWeightGram: typeof data.afterRoastWeightGram === 'number' ? data.afterRoastWeightGram : 0,
  });

  return {
    ...entry,
    id,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribeRoastEntries(
  userId: string,
  month: string,
  callback: (entries: RoastEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const entriesQuery = query(getRoastEntriesCollectionRef(userId, month), orderBy('createdAt', 'desc'));

  return onSnapshot(
    entriesQuery,
    (snapshot) => {
      callback(snapshot.docs.map((entryDoc) => normalizeRoastEntry(entryDoc.id, entryDoc.data())));
    },
    (error) => {
      console.error('Failed to subscribe roast entries:', error);
      onError?.(error);
      callback([]);
    }
  );
}

export async function addRoastEntry(userId: string, month: string, input: RoastEntryInput): Promise<string> {
  const entry = buildRoastEntry(input);
  const docRef = doc(getRoastEntriesCollectionRef(userId, month));

  await setDoc(
    docRef,
    removeUndefinedFields({
      ...entry,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  return docRef.id;
}

export async function updateRoastEntry(
  userId: string,
  month: string,
  entryId: string,
  input: RoastEntryInput
): Promise<void> {
  const entry = buildRoastEntry(input);
  const docRef = doc(getRoastEntriesCollectionRef(userId, month), entryId);

  await setDoc(
    docRef,
    {
      ...entry,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
```

- [ ] **Step 4: テスト実行して PASS を確認する。** `npx vitest run lib/firestore/productionRecords.test.ts` を実行。焙煎entryの3テストを含む全テストが PASS することを確認する。期待: `Tests 19 passed`。

- [ ] **Step 5: コミット。**

```
git add lib/firestore/productionRecords.ts lib/firestore/productionRecords.test.ts
git commit -m "feat: 焙煎entryのCRUDと購読を追加"
```

コミットメッセージ:

```
feat: 焙煎entryのCRUDと購読を追加

subscribe/add/updateRoastEntryとnormalizeを実装。
ハンドピックentryと同じパターンで焙煎前後重量を扱う。
```

---

### Task: パッケージentryの normalize / subscribe / add / update

**Files:**

- Modify: `D:\Dev\roastplus\lib\firestore\productionRecords.ts`
- Test: `D:\Dev\roastplus\lib\firestore\productionRecords.test.ts`

- [ ] **Step 1: 失敗するテストを書く。** `PackageEntry` 型(`teamA` / `teamB` の `TeamCounts`)を検証する。ネストされた `goodCount`/`defectiveCount` が normalize で保持されることに注意する。

```typescript
describe('subscribePackageEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries package entries ordered by createdAt desc and normalizes nested team counts with doc id', async () => {
    firestoreMocks.onSnapshot.mockImplementation((_ref: unknown, onNext: (snap: unknown) => void) => {
      onNext(
        collectionSnapshot([
          {
            id: 'pack-1',
            data: {
              workDate: '2026-08-10',
              teamA: { goodCount: 120, defectiveCount: 4 },
              teamB: { goodCount: 90, defectiveCount: 2 },
              createdAt: 'created-at',
              updatedAt: 'updated-at',
            },
          },
        ])
      );
      return () => undefined;
    });

    const { subscribePackageEntries } = await import('./productionRecords');
    const callback = vi.fn();

    subscribePackageEntries('user-1', '2026-08', callback);

    expect(firestoreMocks.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(callback).toHaveBeenCalledWith([
      {
        id: 'pack-1',
        workDate: '2026-08-10',
        teamA: { goodCount: 120, defectiveCount: 4 },
        teamB: { goodCount: 90, defectiveCount: 2 },
        createdAt: 'created-at',
        updatedAt: 'updated-at',
      },
    ]);
  });
});

describe('addPackageEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a package entry with an auto-generated id and returns it', async () => {
    const { addPackageEntry } = await import('./productionRecords');

    const id = await addPackageEntry('user-1', '2026-08', {
      workDate: '2026-08-10',
      teamA: { goodCount: 120, defectiveCount: 4 },
      teamB: { goodCount: 90, defectiveCount: 2 },
    });

    expect(id).toBe('auto-generated-id');
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionRecords/2026-08/packageEntries/auto-generated-id' }),
      {
        workDate: '2026-08-10',
        teamA: { goodCount: 120, defectiveCount: 4 },
        teamB: { goodCount: 90, defectiveCount: 2 },
        createdAt: 'server-timestamp',
        updatedAt: 'server-timestamp',
      }
    );
  });
});

describe('updatePackageEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges the rebuilt package entry with a refreshed updatedAt', async () => {
    const { updatePackageEntry } = await import('./productionRecords');

    await updatePackageEntry('user-1', '2026-08', 'pack-1', {
      workDate: '2026-08-11',
      teamA: { goodCount: 100, defectiveCount: 0 },
      teamB: { goodCount: 80, defectiveCount: 1 },
    });

    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/productionRecords/2026-08/packageEntries/pack-1' }),
      {
        workDate: '2026-08-11',
        teamA: { goodCount: 100, defectiveCount: 0 },
        teamB: { goodCount: 80, defectiveCount: 1 },
        updatedAt: 'server-timestamp',
      },
      { merge: true }
    );
  });
});
```

> 注意: `teamA: { goodCount: 100, defectiveCount: 0 }` のように `0` を含むため、`addPackageEntry` の `removeUndefinedFields` がネストオブジェクト内の `0` を削除しないこと、また「空オブジェクト削除」ロジック(`common.ts` 36〜39行)が `goodCount`/`defectiveCount` を持つ非空オブジェクトを維持することを Step 4 で担保する。

- [ ] **Step 2: テスト実行して失敗を確認する。** `npx vitest run lib/firestore/productionRecords.test.ts` を実行。パッケージentryの3テストが `... is not a function` で FAIL することを確認する。期待: `Tests 3 failed | 19 passed`。

- [ ] **Step 3: 最小実装。** `lib/firestore/productionRecords.ts` に追記する。`normalizeTeamCounts` でネスト値を `typeof` チェックし `normalizeCountInput`(0以上の整数)で整える。`normalizePackageEntry` は `buildPackageEntry` で整形し `id` + timestamp 付与。

```typescript
function normalizeTeamCounts(value: unknown): TeamCounts {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

  return {
    goodCount: normalizeCountInput(typeof data.goodCount === 'number' ? data.goodCount : 0),
    defectiveCount: normalizeCountInput(typeof data.defectiveCount === 'number' ? data.defectiveCount : 0),
  };
}

function normalizePackageEntry(id: string, data: DocumentData): PackageEntry {
  const entry = buildPackageEntry({
    workDate: typeof data.workDate === 'string' ? data.workDate : '',
    teamA: normalizeTeamCounts(data.teamA),
    teamB: normalizeTeamCounts(data.teamB),
  });

  return {
    ...entry,
    id,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribePackageEntries(
  userId: string,
  month: string,
  callback: (entries: PackageEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const entriesQuery = query(getPackageEntriesCollectionRef(userId, month), orderBy('createdAt', 'desc'));

  return onSnapshot(
    entriesQuery,
    (snapshot) => {
      callback(snapshot.docs.map((entryDoc) => normalizePackageEntry(entryDoc.id, entryDoc.data())));
    },
    (error) => {
      console.error('Failed to subscribe package entries:', error);
      onError?.(error);
      callback([]);
    }
  );
}

export async function addPackageEntry(userId: string, month: string, input: PackageEntryInput): Promise<string> {
  const entry = buildPackageEntry(input);
  const docRef = doc(getPackageEntriesCollectionRef(userId, month));

  await setDoc(
    docRef,
    removeUndefinedFields({
      ...entry,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  return docRef.id;
}

export async function updatePackageEntry(
  userId: string,
  month: string,
  entryId: string,
  input: PackageEntryInput
): Promise<void> {
  const entry = buildPackageEntry(input);
  const docRef = doc(getPackageEntriesCollectionRef(userId, month), entryId);

  await setDoc(
    docRef,
    {
      ...entry,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
```

`normalizeCountInput` を import するため、ファイル冒頭の `@/lib/productionRecords` import に `normalizeCountInput` を追加する。

```typescript
import {
  buildHandpickEntry,
  buildPackageEntry,
  buildProductionRecordMonth,
  buildRoastEntry,
  isValidProductionMonth,
  normalizeCountInput,
} from '@/lib/productionRecords';
```

- [ ] **Step 4: テスト実行して PASS を確認する。** `npx vitest run lib/firestore/productionRecords.test.ts` を実行。パッケージentryの3テストを含む全テスト(計22件)が PASS することを確認する。期待: `Tests 22 passed`。

- [ ] **Step 5: コミット。**

```
git add lib/firestore/productionRecords.ts lib/firestore/productionRecords.test.ts
git commit -m "feat: パッケージentryのCRUDと購読を追加"
```

コミットメッセージ:

```
feat: パッケージentryのCRUDと購読を追加

subscribe/add/updatePackageEntryとnormalizeを実装。
teamA/teamBのgoodCount/defectiveCountをネストで扱う。
```

---

### Task: lib/firestore/index.ts への re-export 追加

**Files:**

- Modify: `D:\Dev\roastplus\lib\firestore\index.ts`

- [ ] **Step 1: re-export を追記する。** 既存の `productionPackRecords` のブロックの下に、生産記録の全公開関数を re-export する。`index.ts` はバレル export 用の非コードに近い設定ファイルだが、変更は `Edit` で行う。`@/lib/firestore` 経由で全関数を参照できるようにする。

```typescript
export {
  RECENT_PRODUCTION_MONTHS_LIMIT,
  getProductionRecordsCollectionRef,
  getProductionRecordMonthDocRef,
  getHandpickEntriesCollectionRef,
  getRoastEntriesCollectionRef,
  getPackageEntriesCollectionRef,
  subscribeProductionRecordMonth,
  saveProductionRecordMonth,
  subscribeRecentProductionMonths,
  subscribeHandpickEntries,
  addHandpickEntry,
  updateHandpickEntry,
  subscribeRoastEntries,
  addRoastEntry,
  updateRoastEntry,
  subscribePackageEntries,
  addPackageEntry,
  updatePackageEntry,
} from './productionRecords';
```

- [ ] **Step 2: 型チェック・ビルドで参照解決を確認する。** `npx tsc --noEmit` を実行し、re-export したシンボルがすべて `productionRecords.ts` に存在して型エラーが出ないことを確認する。期待: エラー0件で終了(exit code 0)。

- [ ] **Step 3: コミット。**

```
git add lib/firestore/index.ts
git commit -m "feat: 生産記録Firestore関数をバレルにre-export"
```

コミットメッセージ:

```
feat: 生産記録Firestore関数をバレルにre-export

@/lib/firestore 経由で生産記録の参照ヘルパー・月docCRUD・
各entry CRUD/購読を利用できるようにした。
```

---

### Task: フェーズB完了の検証

**Files:**

- (検証のみ。新規変更なし)

- [ ] **Step 1: Firestore層テスト全件を実行する。** `npx vitest run lib/firestore/productionRecords.test.ts` を実行。`Tests 22 passed` を確認する。

- [ ] **Step 2: ビルドを実行する。** `npm run build` を実行。`productionRecords.ts` / `index.ts` の型エラーがなくビルドが成功することを確認する(exit code 0)。

- [ ] **Step 3: テストスイート全体を実行する。** `npm run test:run` を実行。フェーズA(`lib/productionRecords.test.ts`)とフェーズB(`lib/firestore/productionRecords.test.ts`)を含む全テストが PASS することを確認する(既存テストへの回帰なし)。

- [ ] **Step 4: フォーマットチェックを実行する。** `npm run format:check` を実行。Prettier 整形漏れがないことを確認する(format 漏れは CI の Format ジョブで落ちる既知の落とし穴)。整形漏れがあれば `npm run format` で修正し再確認する。

- [ ] **Step 5: 最終状態を確認する。** `git status` を実行し、作業ツリーがクリーン(全コミット済み)であることを確認する。フェーズC(フック)以降が `@/lib/firestore` から全関数を import できる状態であることを確認する。

---

実装メモ(フェーズC以降への引き継ぎ):

- 公開関数の `Unsubscribe` 型は `firebase/firestore` の `()=>void` 互換。フック層(`useProductionRecord.ts`)は `subscribeProductionRecordMonth` / `subscribeHandpickEntries` / `subscribeRoastEntries` / `subscribePackageEntries` の4購読を張り、cleanup で全 unsubscribe する。
- `addXxxEntry` は `Promise<string>`(新規 entry の自動ID)を返すので、UI 側で追加直後の参照に使える。
- `firestore.rules` への `match /users/{userId}/productionRecords/{document=**}` 追加はフェーズB範囲外(rules フェーズ担当)。未追加だと実機で permission-denied になるため、フックフェーズの手動確認前に rules フェーズの完了が必要。

ファイルパス(担当成果物):

- 実装: `D:\Dev\roastplus\lib\firestore\productionRecords.ts`
- テスト: `D:\Dev\roastplus\lib\firestore\productionRecords.test.ts`
- re-export 追記: `D:\Dev\roastplus\lib\firestore\index.ts`

---

## フェーズC: Firestore Rules とフック

このフェーズは、生産記録(productionRecords)の owner isolation を firestore.rules に追加し、ルールテストで本人/他人/未認証の権限を検証し、月doc + 3サブコレクション(handpick/roast/package)をまとめて購読する `useProductionRecord` フックを TDD で実装する。

前提(他フェーズの成果物への依存):

- フェーズA(types-pure)で `types/production-record.ts`(各型)と `lib/productionRecords.ts`(`isValidProductionMonth` など純粋関数)が、`types/index.ts` 経由で `@/types` から import 可能になっていること。
- フェーズB(firestore-layer)で `lib/firestore/productionRecords.ts` の `subscribeProductionRecordMonth` / `subscribeHandpickEntries` / `subscribeRoastEntries` / `subscribePackageEntries` が、`lib/firestore/index.ts` 経由で `@/lib/firestore` から import 可能になっていること。
- フックテストはフェーズBの subscribe 関数を `@/lib/firestore` のモックとして差し替えるため、フェーズB完了後に実行する。ルール追加・ルールテストはフェーズA/Bに依存しないため先行可能。

---

### Task: firestore.rules に productionRecords の owner isolation を追加する

**Files:**

- Modify: `D:\Dev\roastplus\firestore.rules`
- Test: `D:\Dev\roastplus\tests\rules\firebase.rules.test.ts`

ルールはコードシンボルではなくテキスト宣言なので、TDD は「失敗するルールテスト → ルール追記 → PASS」の順で進める。月doc(`productionRecords/{month}`)とサブコレクション(`handpickEntries` など)の両方を `{document=**}` ワイルドカードで一括カバーする(契約の `match /users/{userId}/productionRecords/{document=**}`)。

- [ ] **Step 1: 失敗するルールテストを追加する**

  `D:\Dev\roastplus\tests\rules\firebase.rules.test.ts` の `describe('users/{uid}/productionPackRecords/{workDate}', ...)` ブロック(103〜129行目)の直後、`describe('Firestore rules', ...)` の閉じ括弧(130行目の `});`)の直前に、次の `describe` ブロックを追加する。

  ```typescript
  describe('users/{uid}/productionRecords/{month}', () => {
    it('allows only the signed-in owner to read and write the month document', async () => {
      const path = `users/${OWN_UID}/productionRecords/2026-08`;
      const ownerDoc = firestoreFor(OWN_UID).doc(path);
      const otherDoc = firestoreFor(OTHER_UID).doc(path);
      const anonymousDoc = firestoreFor().doc(path);
      const monthDoc = {
        month: '2026-08',
        greenBeanTotalGram: 30000,
        powderPerPackGram: 8.5,
        blendItems: [
          { beanName: 'ブラジル', ratioPercent: 80 },
          { beanName: 'グアテマラ', ratioPercent: 20 },
        ],
      };

      await assertFails(anonymousDoc.get());
      await assertFails(anonymousDoc.set(monthDoc));

      await assertSucceeds(ownerDoc.set(monthDoc));
      await assertSucceeds(ownerDoc.get());

      await assertFails(otherDoc.get());
      await assertFails(otherDoc.set(monthDoc));
    });

    it('allows only the signed-in owner to read and write handpick/roast/package subcollection entries', async () => {
      const handpickPath = `users/${OWN_UID}/productionRecords/2026-08/handpickEntries/entry_1`;
      const roastPath = `users/${OWN_UID}/productionRecords/2026-08/roastEntries/entry_1`;
      const packagePath = `users/${OWN_UID}/productionRecords/2026-08/packageEntries/entry_1`;

      const handpickEntry = {
        workDate: '2026-08-01',
        beanName: 'ブラジル',
        segment: 'first',
        greenBeanWeightGram: 10000,
        defectBeanWeightGram: 300,
      };
      const roastEntry = {
        workDate: '2026-08-01',
        beforeRoastWeightGram: 10000,
        afterRoastWeightGram: 8500,
      };
      const packageEntry = {
        workDate: '2026-08-01',
        teamA: { goodCount: 100, defectiveCount: 2 },
        teamB: { goodCount: 120, defectiveCount: 3 },
      };

      // ハンドピック: 本人は read/write 可、他人・未認証は拒否
      await assertFails(firestoreFor().doc(handpickPath).get());
      await assertFails(firestoreFor().doc(handpickPath).set(handpickEntry));
      await assertSucceeds(firestoreFor(OWN_UID).doc(handpickPath).set(handpickEntry));
      await assertSucceeds(firestoreFor(OWN_UID).doc(handpickPath).get());
      await assertFails(firestoreFor(OTHER_UID).doc(handpickPath).get());
      await assertFails(firestoreFor(OTHER_UID).doc(handpickPath).set(handpickEntry));

      // 焙煎: 本人は read/write 可、他人・未認証は拒否
      await assertFails(firestoreFor().doc(roastPath).set(roastEntry));
      await assertSucceeds(firestoreFor(OWN_UID).doc(roastPath).set(roastEntry));
      await assertSucceeds(firestoreFor(OWN_UID).doc(roastPath).get());
      await assertFails(firestoreFor(OTHER_UID).doc(roastPath).get());
      await assertFails(firestoreFor(OTHER_UID).doc(roastPath).set(roastEntry));

      // パッケージ: 本人は read/write 可、他人・未認証は拒否
      await assertFails(firestoreFor().doc(packagePath).set(packageEntry));
      await assertSucceeds(firestoreFor(OWN_UID).doc(packagePath).set(packageEntry));
      await assertSucceeds(firestoreFor(OWN_UID).doc(packagePath).get());
      await assertFails(firestoreFor(OTHER_UID).doc(packagePath).get());
      await assertFails(firestoreFor(OTHER_UID).doc(packagePath).set(packageEntry));
    });
  });
  ```

- [ ] **Step 2: テスト実行して失敗を確認する**

  ルールテストは Firebase エミュレータ経由で `npm run test:rules`(`tsx scripts/run-rules-tests.ts`)で実行する。

  ```
  npm run test:rules
  ```

  期待: 新規追加した `users/{uid}/productionRecords/{month}` の2テストが FAIL する。`productionRecords` パスにマッチするルールが存在しないため、本人の `assertSucceeds(ownerDoc.set(...))` で permission-denied となり失敗する。既存テストは PASS のまま。

- [ ] **Step 3: firestore.rules に owner isolation ルールを追記する**

  `D:\Dev\roastplus\firestore.rules` の既存 `match /users/{userId}/productionPackRecords/{workDate} { ... }` ブロック(72〜74行目)の直後、`match /users/{userId}/_meta/{document=**}`(75行目)の直前に、次のブロックを追加する。`{document=**}` 再帰ワイルドカードにより、月doc(`productionRecords/{month}`)と全サブコレクション(`handpickEntries` / `roastEntries` / `packageEntries`)の両方が一括でカバーされる。

  ```
      match /users/{userId}/productionRecords/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
  ```

  追記後の該当箇所(72〜78行目相当)は次のようになる。

  ```
      match /users/{userId}/productionPackRecords/{workDate} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /users/{userId}/productionRecords/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /users/{userId}/_meta/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
  ```

- [ ] **Step 4: テスト実行して PASS を確認する**

  ```
  npm run test:rules
  ```

  期待: `users/{uid}/productionRecords/{month}` の2テストを含む全ルールテストが PASS する。

- [ ] **Step 5: コミットする**

  ```
  git add firestore.rules tests/rules/firebase.rules.test.ts
  git commit
  ```

  コミットメッセージ:

  ```
  feat: productionRecordsのowner isolationルールとルールテストを追加

  月docとhandpick/roast/packageサブコレクションを{document=**}で一括カバーし、
  本人read/write可・他人/未認証はpermission-deniedになることを検証する。

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```

---

### Task: useProductionRecord フックを TDD で実装する

**Files:**

- Create: `D:\Dev\roastplus\hooks\useProductionRecord.ts`
- Test: `D:\Dev\roastplus\hooks\useProductionRecord.test.ts`

`useMembers.ts` 方式で、`userId` と `month` の両方が定義されている時のみ月doc + 3サブコレクションの4購読を張り、cleanup で全 unsubscribe を呼ぶ。返却は契約どおり `{ monthDoc, handpickEntries, roastEntries, packageEntries, isLoading }`。テストはフェーズBの subscribe 関数を `@/lib/firestore` のモックで差し替える(`useDefectBeans.test.ts` と同じ「Firestore層をモックする」方針。`firebase/firestore` を直接モックしない)。`mockImplementation` で callback を即時に呼びつつ unsubscribe 関数を返し、`vi.useFakeTimers` + `act(async () => vi.runAllTimersAsync())` で購読確定を待つ。アンマウントで全 unsubscribe が呼ばれることを検証する。

- [ ] **Step 1: 失敗するテストを書く**

  `D:\Dev\roastplus\hooks\useProductionRecord.test.ts` を新規作成し、次の完全なテストコードを書く。

  ```typescript
  import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
  import { renderHook, act } from '@testing-library/react';
  import { useProductionRecord } from './useProductionRecord';
  import type { ProductionRecordMonth, HandpickEntry, RoastEntry, PackageEntry } from '@/types';

  // Firestore層の購読関数をモックする（firebase/firestoreは直接モックしない）
  const mockSubscribeProductionRecordMonth = vi.fn();
  const mockSubscribeHandpickEntries = vi.fn();
  const mockSubscribeRoastEntries = vi.fn();
  const mockSubscribePackageEntries = vi.fn();

  vi.mock('@/lib/firestore', () => ({
    subscribeProductionRecordMonth: (...args: unknown[]) => mockSubscribeProductionRecordMonth(...args),
    subscribeHandpickEntries: (...args: unknown[]) => mockSubscribeHandpickEntries(...args),
    subscribeRoastEntries: (...args: unknown[]) => mockSubscribeRoastEntries(...args),
    subscribePackageEntries: (...args: unknown[]) => mockSubscribePackageEntries(...args),
  }));

  // テストフィクスチャ
  const MONTH = '2026-08';
  const USER_ID = 'test-user-id';

  const MONTH_DOC: ProductionRecordMonth = {
    month: '2026-08',
    greenBeanTotalGram: 30000,
    powderPerPackGram: 8.5,
    blendItems: [
      { beanName: 'ブラジル', ratioPercent: 80 },
      { beanName: 'グアテマラ', ratioPercent: 20 },
    ],
  };

  const HANDPICK_ENTRY: HandpickEntry = {
    id: 'handpick_1',
    workDate: '2026-08-01',
    beanName: 'ブラジル',
    segment: 'first',
    greenBeanWeightGram: 10000,
    defectBeanWeightGram: 300,
  };

  const ROAST_ENTRY: RoastEntry = {
    id: 'roast_1',
    workDate: '2026-08-01',
    beforeRoastWeightGram: 10000,
    afterRoastWeightGram: 8500,
  };

  const PACKAGE_ENTRY: PackageEntry = {
    id: 'package_1',
    workDate: '2026-08-01',
    teamA: { goodCount: 100, defectiveCount: 2 },
    teamB: { goodCount: 120, defectiveCount: 3 },
  };

  // ヘルパー: 各購読が「即時にcallbackを呼びunsubscribeを返す」ようにモックする
  function setupSubscriptions(options: {
    monthDoc?: ProductionRecordMonth | null;
    handpickEntries?: HandpickEntry[];
    roastEntries?: RoastEntry[];
    packageEntries?: PackageEntry[];
  }) {
    const unsubMonth = vi.fn();
    const unsubHandpick = vi.fn();
    const unsubRoast = vi.fn();
    const unsubPackage = vi.fn();

    mockSubscribeProductionRecordMonth.mockImplementation(
      (_userId: string, _month: string, cb: (m: ProductionRecordMonth | null) => void) => {
        cb(options.monthDoc ?? null);
        return unsubMonth;
      }
    );
    mockSubscribeHandpickEntries.mockImplementation(
      (_userId: string, _month: string, cb: (e: HandpickEntry[]) => void) => {
        cb(options.handpickEntries ?? []);
        return unsubHandpick;
      }
    );
    mockSubscribeRoastEntries.mockImplementation((_userId: string, _month: string, cb: (e: RoastEntry[]) => void) => {
      cb(options.roastEntries ?? []);
      return unsubRoast;
    });
    mockSubscribePackageEntries.mockImplementation(
      (_userId: string, _month: string, cb: (e: PackageEntry[]) => void) => {
        cb(options.packageEntries ?? []);
        return unsubPackage;
      }
    );

    return { unsubMonth, unsubHandpick, unsubRoast, unsubPackage };
  }

  describe('useProductionRecord', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.clearAllMocks();
    });

    it('userId が undefined のときは購読せず空の初期値を返す', async () => {
      setupSubscriptions({});

      const { result } = renderHook(() => useProductionRecord(undefined, MONTH));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSubscribeProductionRecordMonth).not.toHaveBeenCalled();
      expect(mockSubscribeHandpickEntries).not.toHaveBeenCalled();
      expect(mockSubscribeRoastEntries).not.toHaveBeenCalled();
      expect(mockSubscribePackageEntries).not.toHaveBeenCalled();
      expect(result.current.monthDoc).toBeNull();
      expect(result.current.handpickEntries).toEqual([]);
      expect(result.current.roastEntries).toEqual([]);
      expect(result.current.packageEntries).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('month が undefined のときは購読しない', async () => {
      setupSubscriptions({});

      const { result } = renderHook(() => useProductionRecord(USER_ID, undefined));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSubscribeProductionRecordMonth).not.toHaveBeenCalled();
      expect(mockSubscribeHandpickEntries).not.toHaveBeenCalled();
      expect(mockSubscribeRoastEntries).not.toHaveBeenCalled();
      expect(mockSubscribePackageEntries).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('userId と month が揃うと4購読を張り、正しい引数で呼び出す', async () => {
      setupSubscriptions({
        monthDoc: MONTH_DOC,
        handpickEntries: [HANDPICK_ENTRY],
        roastEntries: [ROAST_ENTRY],
        packageEntries: [PACKAGE_ENTRY],
      });

      renderHook(() => useProductionRecord(USER_ID, MONTH));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSubscribeProductionRecordMonth).toHaveBeenCalledTimes(1);
      expect(mockSubscribeProductionRecordMonth).toHaveBeenCalledWith(
        USER_ID,
        MONTH,
        expect.any(Function),
        expect.any(Function)
      );
      expect(mockSubscribeHandpickEntries).toHaveBeenCalledWith(
        USER_ID,
        MONTH,
        expect.any(Function),
        expect.any(Function)
      );
      expect(mockSubscribeRoastEntries).toHaveBeenCalledWith(
        USER_ID,
        MONTH,
        expect.any(Function),
        expect.any(Function)
      );
      expect(mockSubscribePackageEntries).toHaveBeenCalledWith(
        USER_ID,
        MONTH,
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('購読の callback で受け取ったデータを返す', async () => {
      setupSubscriptions({
        monthDoc: MONTH_DOC,
        handpickEntries: [HANDPICK_ENTRY],
        roastEntries: [ROAST_ENTRY],
        packageEntries: [PACKAGE_ENTRY],
      });

      const { result } = renderHook(() => useProductionRecord(USER_ID, MONTH));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.monthDoc).toEqual(MONTH_DOC);
      expect(result.current.handpickEntries).toEqual([HANDPICK_ENTRY]);
      expect(result.current.roastEntries).toEqual([ROAST_ENTRY]);
      expect(result.current.packageEntries).toEqual([PACKAGE_ENTRY]);
    });

    it('4購読すべての初回callbackが返ると isLoading = false になる', async () => {
      setupSubscriptions({
        monthDoc: MONTH_DOC,
        handpickEntries: [HANDPICK_ENTRY],
        roastEntries: [ROAST_ENTRY],
        packageEntries: [PACKAGE_ENTRY],
      });

      const { result } = renderHook(() => useProductionRecord(USER_ID, MONTH));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('月docが存在しない(null)場合でも購読は成立し isLoading = false になる', async () => {
      setupSubscriptions({ monthDoc: null });

      const { result } = renderHook(() => useProductionRecord(USER_ID, MONTH));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.monthDoc).toBeNull();
      expect(result.current.handpickEntries).toEqual([]);
      expect(result.current.roastEntries).toEqual([]);
      expect(result.current.packageEntries).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('アンマウント時にすべての unsubscribe を呼ぶ', async () => {
      const { unsubMonth, unsubHandpick, unsubRoast, unsubPackage } = setupSubscriptions({
        monthDoc: MONTH_DOC,
      });

      const { unmount } = renderHook(() => useProductionRecord(USER_ID, MONTH));

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      unmount();

      expect(unsubMonth).toHaveBeenCalledTimes(1);
      expect(unsubHandpick).toHaveBeenCalledTimes(1);
      expect(unsubRoast).toHaveBeenCalledTimes(1);
      expect(unsubPackage).toHaveBeenCalledTimes(1);
    });

    it('month が変わると旧購読を解除して新しい month で再購読する', async () => {
      const first = setupSubscriptions({ monthDoc: MONTH_DOC });

      const { rerender } = renderHook(({ month }) => useProductionRecord(USER_ID, month), {
        initialProps: { month: MONTH },
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSubscribeProductionRecordMonth).toHaveBeenCalledTimes(1);

      // monthを変更
      const second = setupSubscriptions({ monthDoc: { ...MONTH_DOC, month: '2026-09' } });
      rerender({ month: '2026-09' });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // 旧購読が解除される
      expect(first.unsubMonth).toHaveBeenCalledTimes(1);
      expect(first.unsubHandpick).toHaveBeenCalledTimes(1);
      expect(first.unsubRoast).toHaveBeenCalledTimes(1);
      expect(first.unsubPackage).toHaveBeenCalledTimes(1);

      // 新しいmonthで再購読
      expect(mockSubscribeProductionRecordMonth).toHaveBeenLastCalledWith(
        USER_ID,
        '2026-09',
        expect.any(Function),
        expect.any(Function)
      );
      expect(second.unsubMonth).not.toHaveBeenCalled();
    });
  });
  ```

- [ ] **Step 2: テスト実行して失敗を確認する**

  ```
  npx vitest run hooks/useProductionRecord.test.ts
  ```

  期待: `Failed to resolve import "./useProductionRecord"`(モジュール未作成)で全テストが FAIL する。テストファイルがロードできず 0 passed のエラーになる。

- [ ] **Step 3: useProductionRecord フックを最小実装する**

  `D:\Dev\roastplus\hooks\useProductionRecord.ts` を新規作成し、次の完全な実装を書く。`userId` と `month` の両方が定義されている時のみ `useEffect` で4購読を張り、それぞれの初回 callback 受信フラグ(`ready*`)が4つ揃ったら `isLoading=false` にする。cleanup で全 unsubscribe を呼ぶ。`isLoading` の初期値は「両方定義済みなら true、片方でも未定義なら false」。

  ```typescript
  'use client';

  import { useEffect, useState } from 'react';
  import {
    subscribeProductionRecordMonth,
    subscribeHandpickEntries,
    subscribeRoastEntries,
    subscribePackageEntries,
  } from '@/lib/firestore';
  import type { ProductionRecordMonth, HandpickEntry, RoastEntry, PackageEntry } from '@/types';

  /**
   * 月doc(productionRecords/{month})と handpick/roast/package の3サブコレクションを
   * まとめてリアルタイム購読するフック。
   * userId と month の両方が定義されている時のみ購読し、cleanupで全unsubscribeを呼ぶ。
   * @param userId ユーザーID
   * @param month 対象月(yyyy-MM)
   * @returns { monthDoc, handpickEntries, roastEntries, packageEntries, isLoading }
   */
  export function useProductionRecord(
    userId: string | undefined,
    month: string | undefined
  ): {
    monthDoc: ProductionRecordMonth | null;
    handpickEntries: HandpickEntry[];
    roastEntries: RoastEntry[];
    packageEntries: PackageEntry[];
    isLoading: boolean;
  } {
    const [monthDoc, setMonthDoc] = useState<ProductionRecordMonth | null>(null);
    const [handpickEntries, setHandpickEntries] = useState<HandpickEntry[]>([]);
    const [roastEntries, setRoastEntries] = useState<RoastEntry[]>([]);
    const [packageEntries, setPackageEntries] = useState<PackageEntry[]>([]);
    const [isLoading, setIsLoading] = useState(() => Boolean(userId && month));

    useEffect(() => {
      if (!userId || !month) {
        // 購読条件を満たさない場合は初期値に戻す
        setMonthDoc(null);
        setHandpickEntries([]);
        setRoastEntries([]);
        setPackageEntries([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      // 4購読それぞれの初回callback受信を追跡し、4つ揃ったらisLoadingを解除する
      let readyMonth = false;
      let readyHandpick = false;
      let readyRoast = false;
      let readyPackage = false;

      const updateLoading = () => {
        if (readyMonth && readyHandpick && readyRoast && readyPackage) {
          setIsLoading(false);
        }
      };

      const unsubscribeMonth = subscribeProductionRecordMonth(
        userId,
        month,
        (m) => {
          setMonthDoc(m);
          readyMonth = true;
          updateLoading();
        },
        (error) => {
          console.error('Failed to subscribe production record month:', error);
          readyMonth = true;
          updateLoading();
        }
      );

      const unsubscribeHandpick = subscribeHandpickEntries(
        userId,
        month,
        (entries) => {
          setHandpickEntries(entries);
          readyHandpick = true;
          updateLoading();
        },
        (error) => {
          console.error('Failed to subscribe handpick entries:', error);
          readyHandpick = true;
          updateLoading();
        }
      );

      const unsubscribeRoast = subscribeRoastEntries(
        userId,
        month,
        (entries) => {
          setRoastEntries(entries);
          readyRoast = true;
          updateLoading();
        },
        (error) => {
          console.error('Failed to subscribe roast entries:', error);
          readyRoast = true;
          updateLoading();
        }
      );

      const unsubscribePackage = subscribePackageEntries(
        userId,
        month,
        (entries) => {
          setPackageEntries(entries);
          readyPackage = true;
          updateLoading();
        },
        (error) => {
          console.error('Failed to subscribe package entries:', error);
          readyPackage = true;
          updateLoading();
        }
      );

      return () => {
        unsubscribeMonth();
        unsubscribeHandpick();
        unsubscribeRoast();
        unsubscribePackage();
      };
    }, [userId, month]);

    return { monthDoc, handpickEntries, roastEntries, packageEntries, isLoading };
  }
  ```

  実装メモ(レビュー用): `subscribe*` 関数のシグネチャは契約の `subscribeProductionRecordMonth(userId, month, cb, onError?)` ほかに完全一致させている。`onError?` は任意だが、テストが第4引数を `expect.any(Function)` で検証するため、本実装でも常に onError コールバックを渡す(エラー時も `ready*` を true にして isLoading を解除し、無限ローディングを防ぐ)。

- [ ] **Step 4: テスト実行して PASS を確認する**

  ```
  npx vitest run hooks/useProductionRecord.test.ts
  ```

  期待: 8テストすべて PASS(`Test Files 1 passed`, `Tests 8 passed`)。

- [ ] **Step 5: コミットする**

  ```
  git add hooks/useProductionRecord.ts hooks/useProductionRecord.test.ts
  git commit
  ```

  コミットメッセージ:

  ```
  feat: 月doc+3サブコレクションを購読するuseProductionRecordフックを追加

  userId/month両方が揃う時のみ月doc・handpick・roast・packageを購読し、
  cleanupで全unsubscribe。4購読の初回callback完了でisLoadingを解除する。

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```

---

### Task: フェーズC全体のローカル検証を行う

**Files:**

- (検証のみ。新規・修正ファイルなし)

フェーズC完了時点で、契約の「コミット前検証」に従い build / unit test / format:check を通す。ルールテストはエミュレータ依存のため別途実行する。

- [ ] **Step 1: ビルドと単体テストを実行する**

  ```
  npm run build
  npm run test:run
  ```

  期待: `npm run build` は成功(型エラー・Lint warning ゼロ)。`npm run test:run` は全テスト PASS で、新規追加した `hooks/useProductionRecord.test.ts` の8テストが含まれる。

- [ ] **Step 2: ルールテストを実行する**

  ```
  npm run test:rules
  ```

  期待: `users/{uid}/productionRecords/{month}` の2テストを含む全ルールテストが PASS する。

- [ ] **Step 3: フォーマットチェックを実行する**

  CI の Format ジョブで落ちないよう、コミット前に必ず `format:check` を通す(契約の既知の落とし穴)。

  ```
  npm run format:check
  ```

  期待: `All matched files use Prettier code style!`。差分があれば `npm run format` を実行してから対象ファイルを `git add` して追補コミットする。

---

検証コマンド一覧(このフェーズ用):

- ルールテスト: `npm run test:rules`
- フック単体テスト: `npx vitest run hooks/useProductionRecord.test.ts`
- 全体: `npm run build` / `npm run test:run` / `npm run format:check`

このフェーズで作成・修正したファイル(絶対パス):

- 修正: `D:\Dev\roastplus\firestore.rules`
- 修正: `D:\Dev\roastplus\tests\rules\firebase.rules.test.ts`
- 新規: `D:\Dev\roastplus\hooks\useProductionRecord.ts`
- 新規: `D:\Dev\roastplus\hooks\useProductionRecord.test.ts`

依存メモ: フックテスト(Task 2)はフェーズB(`lib/firestore/productionRecords.ts` の `subscribe*` を `lib/firestore/index.ts` で re-export)完了後に実行すること。ルール追加・ルールテスト(Task 1)はフェーズA/Bに依存せず先行可能。

---

## フェーズD: 入力モーダル4種

このフェーズでは `components/production-record/` 配下に4つの入力モーダル(`MonthSettingsModal` / `HandpickEntryModal` / `RoastEntryModal` / `PackageEntryModal`)を実装する。すべて `components/defect-bean-form/DefectBeanForm.tsx` の「`Modal` を直接ラップする」パターンを踏襲し、契約の純粋ロジック関数(フェーズBで実装済みの `lib/productionRecords.ts`)でリアルタイム計算を表示する。

前提(他フェーズの成果物):

- `types/production-record.ts` … 全型定義(フェーズA)
- `lib/productionRecords.ts` … 純粋ロジック関数・定数(フェーズB)
- `components/ui` バレル … `Modal` / `IconButton` / `Button` / `NumberInput` / `Input` / `Select` / `SelectOption`(既存)

共通の構造(全モーダル共通の決まり):

- `'use client'` を先頭に置く。
- `Modal` を `show={true}`(親が条件レンダリングで開閉)・`onClose={onClose}`・`closeOnBackdropClick={false}`・`contentClassName="rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-overlay border border-edge"` で使う。
- sticky ヘッダ(`sticky top-0 p-4 flex items-center justify-between z-20 border-b bg-surface border-edge`)+ `IconButton`(`aria-label="閉じる"`)で閉じる。
- フッタは「キャンセル(`Button variant="secondary"`)」「保存(`Button variant="primary"` で `loading={isSaving}` 連動、`type="button"`)」。
- 入力は `@/components/ui` の `NumberInput`(`suffix` で単位 kg/g)・`Input`(作業日は `type="date"`)・`Select` を使う。生 Tailwind カラーは禁止(`text-info` / `text-danger` / `text-ink` / `text-ink-sub` / `bg-ground` 等のテーマ変数クラスのみ)。
- 数値入力は `string` で state 保持し、保存時に `normalizeWeightInput` / `normalizeCountInput`(契約)へ渡す。`throw` を `catch` して該当入力の `error` prop に表示する。
- 各モーダルは props で初期値(編集時)・`onSave(input)`・`onClose` を受ける。`onSave` は `Promise<void>` を返し、その間 `isSaving` を立てる。

---

### Task: MonthSettingsModal.tsx — 月設定モーダル

月の生豆総量・1袋粉量・配合(豆名最大4・比率%合計100)を入力する。対象月は表示のみ。豆ごとの必要 kg と配合合計をリアルタイム表示し、`validateBlendItems` でバリデーションする。

**Files:**

- Create: `D:\Dev\roastplus\components\production-record\MonthSettingsModal.tsx`
- Test: `D:\Dev\roastplus\components\production-record\MonthSettingsModal.test.tsx`

- [ ] **Step 1: 実装コードを作成する**

`D:\Dev\roastplus\components\production-record\MonthSettingsModal.tsx` を新規作成する。

```tsx
'use client';

import { useEffect, useState } from 'react';
import { HiX } from 'react-icons/hi';

import { Modal, IconButton, Button, NumberInput } from '@/components/ui';
import { DEFAULT_POWDER_PER_PACK_GRAM, MAX_BLEND_ITEMS, validateBlendItems } from '@/lib/productionRecords';
import type { BlendItem, ProductionRecordMonth, ProductionRecordMonthInput } from '@/types';

interface MonthSettingsModalProps {
  /** 対象月 (yyyy-MM)。表示のみ。 */
  month: string;
  /** 編集時の初期値 */
  initial?: ProductionRecordMonth | null;
  /** 保存ハンドラ */
  onSave: (input: ProductionRecordMonthInput) => Promise<void>;
  /** 閉じるハンドラ */
  onClose: () => void;
}

interface BlendItemDraft {
  beanName: string;
  ratioPercent: string;
}

/** yyyy-MM を「2026年8月分」表記に変換する */
function formatMonthLabel(month: string): string {
  const [year, mon] = month.split('-');
  return `${year}年${Number(mon)}月分`;
}

export function MonthSettingsModal({ month, initial, onSave, onClose }: MonthSettingsModalProps) {
  const [greenBeanTotal, setGreenBeanTotal] = useState('');
  const [powderPerPack, setPowderPerPack] = useState(String(DEFAULT_POWDER_PER_PACK_GRAM));
  const [blendDrafts, setBlendDrafts] = useState<BlendItemDraft[]>([{ beanName: '', ratioPercent: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setGreenBeanTotal(String(initial.greenBeanTotalGram / 1000));
    setPowderPerPack(String(initial.powderPerPackGram));
    setBlendDrafts(
      initial.blendItems.map((item) => ({
        beanName: item.beanName,
        ratioPercent: String(item.ratioPercent),
      }))
    );
  }, [initial]);

  const greenBeanTotalGram = (parseFloat(greenBeanTotal) || 0) * 1000;
  const powderPerPackGram = parseFloat(powderPerPack) || 0;

  const ratioSum = blendDrafts.reduce((sum, item) => sum + (parseFloat(item.ratioPercent) || 0), 0);

  const handleAddBlend = () => {
    if (blendDrafts.length >= MAX_BLEND_ITEMS) return;
    setBlendDrafts((prev) => [...prev, { beanName: '', ratioPercent: '' }]);
  };

  const handleRemoveBlend = (index: number) => {
    setBlendDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBlendChange = (index: number, key: keyof BlendItemDraft, value: string) => {
    setBlendDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const handleSave = async () => {
    setError(null);
    const blendItems: BlendItem[] = blendDrafts.map((item) => ({
      beanName: item.beanName.trim(),
      ratioPercent: parseFloat(item.ratioPercent) || 0,
    }));

    if (greenBeanTotalGram <= 0) {
      setError('生豆総量は0より大きい値を入力してください');
      return;
    }
    if (powderPerPackGram <= 0) {
      setError('1袋粉量は0より大きい値を入力してください');
      return;
    }
    if (blendItems.some((item) => item.beanName === '')) {
      setError('豆名をすべて入力してください');
      return;
    }
    try {
      validateBlendItems(blendItems);
    } catch (e) {
      setError(e instanceof Error ? e.message : '配合比率が不正です');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        month,
        greenBeanTotalGram,
        powderPerPackGram,
        blendItems,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      show={true}
      onClose={onClose}
      closeOnBackdropClick={false}
      contentClassName="rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-overlay border border-edge"
    >
      <div className="sticky top-0 p-4 flex items-center justify-between z-20 border-b bg-surface border-edge">
        <h2 className="text-xl font-semibold text-ink">月設定（{formatMonthLabel(month)}）</h2>
        <IconButton onClick={onClose} rounded aria-label="閉じる">
          <HiX className="h-6 w-6" />
        </IconButton>
      </div>

      <div className="p-4 space-y-4">
        <NumberInput
          label="生豆総量"
          suffix="kg"
          min={0}
          step="0.01"
          value={greenBeanTotal}
          onChange={(e) => setGreenBeanTotal(e.target.value)}
        />
        <NumberInput
          label="1袋粉量"
          suffix="g"
          min={0}
          step="0.1"
          value={powderPerPack}
          onChange={(e) => setPowderPerPack(e.target.value)}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">配合（最大{MAX_BLEND_ITEMS}件・合計100%）</p>
          {blendDrafts.map((item, index) => {
            const ratio = parseFloat(item.ratioPercent) || 0;
            const requiredKg = (greenBeanTotalGram * (ratio / 100)) / 1000;
            return (
              <div key={index} className="flex items-end gap-2 rounded-lg p-3 bg-ground">
                <div className="flex-1">
                  <Input
                    label="豆名"
                    value={item.beanName}
                    onChange={(e) => handleBlendChange(index, 'beanName', e.target.value)}
                  />
                </div>
                <div className="w-28">
                  <NumberInput
                    label="比率"
                    suffix="%"
                    min={0}
                    value={item.ratioPercent}
                    onChange={(e) => handleBlendChange(index, 'ratioPercent', e.target.value)}
                  />
                </div>
                <div className="w-24 pb-2 text-right text-sm text-ink-sub">{requiredKg.toFixed(2)} kg</div>
                {blendDrafts.length > 1 && (
                  <Button variant="ghost" size="sm" type="button" onClick={() => handleRemoveBlend(index)}>
                    削除
                  </Button>
                )}
              </div>
            );
          })}
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={handleAddBlend}
              disabled={blendDrafts.length >= MAX_BLEND_ITEMS}
            >
              豆を追加
            </Button>
            <span className={`text-sm ${ratioSum === 100 ? 'text-info' : 'text-danger'}`}>配合合計: {ratioSum}%</span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 p-4 flex justify-end gap-2 border-t bg-surface border-edge">
        <Button variant="secondary" type="button" onClick={onClose}>
          キャンセル
        </Button>
        <Button variant="primary" type="button" loading={isSaving} onClick={handleSave}>
          保存
        </Button>
      </div>
    </Modal>
  );
}
```

注意: `Input` の import が必要。冒頭の import を `import { Modal, IconButton, Button, NumberInput, Input } from '@/components/ui';` とすること(上記コードの import 行を `Input` 込みに修正する)。

- [ ] **Step 2: レンダリング/入力テストを作成する**

`D:\Dev\roastplus\components\production-record\MonthSettingsModal.test.tsx` を新規作成する。`framer-motion` を `ClockSettingsModal.test.tsx` と同じ方式でモックする(`Modal` がアニメーションライブラリに依存するため)。

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MonthSettingsModal } from './MonthSettingsModal';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('MonthSettingsModal', () => {
  const baseProps = {
    month: '2026-08',
    initial: null,
    onSave: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };

  it('対象月を表示のみで表示する', () => {
    render(<MonthSettingsModal {...baseProps} />);
    expect(screen.getByText('月設定（2026年8月分）')).toBeInTheDocument();
  });

  it('配合合計が100でないとき保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<MonthSettingsModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('生豆総量'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('豆名'), { target: { value: 'ブラジル' } });
    fireEvent.change(screen.getByLabelText('比率'), { target: { value: '80' } });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('合計100の有効な入力で onSave に gram 換算した値を渡す', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<MonthSettingsModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('生豆総量'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('豆名'), { target: { value: 'ブラジル' } });
    fireEvent.change(screen.getByLabelText('比率'), { target: { value: '100' } });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        month: '2026-08',
        greenBeanTotalGram: 20000,
        powderPerPackGram: 8.5,
        blendItems: [{ beanName: 'ブラジル', ratioPercent: 100 }],
      });
    });
  });
});
```

- [ ] **Step 3: テストを実行して PASS を確認する**

```
npx vitest run components/production-record/MonthSettingsModal.test.tsx
```

期待: 3 passed。失敗する場合は `getByLabelText` のラベル文言(`生豆総量` / `豆名` / `比率`)と実装の `label` prop が一致しているか確認する。

- [ ] **Step 4: コミットする**

```
git add components/production-record/MonthSettingsModal.tsx components/production-record/MonthSettingsModal.test.tsx
git commit -m "feat(production-record): 月設定モーダルを追加"
```

---

### Task: HandpickEntryModal.tsx — ハンドピック入力モーダル

作業日・豆の種類(月設定の豆から `Select`)・区分(前半/後半)・今回生豆重量 kg・欠点豆重量 g を入力する。`calculateDefectRate` で今回分の欠点率をリアルタイム表示する。

**Files:**

- Create: `D:\Dev\roastplus\components\production-record\HandpickEntryModal.tsx`
- Test: `D:\Dev\roastplus\components\production-record\HandpickEntryModal.test.tsx`

- [ ] **Step 1: 実装コードを作成する**

`D:\Dev\roastplus\components\production-record\HandpickEntryModal.tsx` を新規作成する。`segment` は契約の `HandpickSegment`(`'first' | 'second'`)。今回生豆重量は kg 入力 → 内部で g 換算、欠点豆重量は g 入力。

```tsx
'use client';

import { useEffect, useState } from 'react';
import { HiX } from 'react-icons/hi';

import { Modal, IconButton, Button, Input, NumberInput, Select } from '@/components/ui';
import { calculateDefectRate, formatPercent } from '@/lib/productionRecords';
import type { HandpickEntry, HandpickEntryInput, HandpickSegment } from '@/types';

interface HandpickEntryModalProps {
  /** 月設定で登録された豆名の一覧（Select の選択肢になる） */
  beanNames: string[];
  /** 編集時の初期値 */
  initial?: HandpickEntry | null;
  /** デフォルトの作業日 (yyyy-MM-dd) */
  defaultWorkDate: string;
  onSave: (input: HandpickEntryInput) => Promise<void>;
  onClose: () => void;
}

const SEGMENT_LABELS: Record<HandpickSegment, string> = {
  first: '前半',
  second: '後半',
};

export function HandpickEntryModal({ beanNames, initial, defaultWorkDate, onSave, onClose }: HandpickEntryModalProps) {
  const [workDate, setWorkDate] = useState(defaultWorkDate);
  const [beanName, setBeanName] = useState(beanNames[0] ?? '');
  const [segment, setSegment] = useState<HandpickSegment>('first');
  const [greenBeanWeight, setGreenBeanWeight] = useState('');
  const [defectBeanWeight, setDefectBeanWeight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setWorkDate(initial.workDate);
    setBeanName(initial.beanName);
    setSegment(initial.segment);
    setGreenBeanWeight(String(initial.greenBeanWeightGram / 1000));
    setDefectBeanWeight(String(initial.defectBeanWeightGram));
  }, [initial]);

  const greenBeanWeightGram = (parseFloat(greenBeanWeight) || 0) * 1000;
  const defectBeanWeightGram = parseFloat(defectBeanWeight) || 0;
  const defectRate = calculateDefectRate(defectBeanWeightGram, greenBeanWeightGram);

  const handleSave = async () => {
    setError(null);
    if (workDate === '') {
      setError('作業日を入力してください');
      return;
    }
    if (beanName === '') {
      setError('豆の種類を選択してください');
      return;
    }
    if (greenBeanWeightGram <= 0) {
      setError('今回生豆重量は0より大きい値を入力してください');
      return;
    }
    if (defectBeanWeightGram < 0) {
      setError('欠点豆重量は0以上の値を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        workDate,
        beanName,
        segment,
        greenBeanWeightGram,
        defectBeanWeightGram,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      show={true}
      onClose={onClose}
      closeOnBackdropClick={false}
      contentClassName="rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-overlay border border-edge"
    >
      <div className="sticky top-0 p-4 flex items-center justify-between z-20 border-b bg-surface border-edge">
        <h2 className="text-xl font-semibold text-ink">ハンドピック記録</h2>
        <IconButton onClick={onClose} rounded aria-label="閉じる">
          <HiX className="h-6 w-6" />
        </IconButton>
      </div>

      <div className="p-4 space-y-4">
        <Input label="作業日" type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
        <Select
          label="豆の種類"
          placeholder="選択してください"
          options={beanNames.map((name) => ({ value: name, label: name }))}
          value={beanName}
          onChange={(e) => setBeanName(e.target.value)}
        />
        <Select
          label="区分"
          options={[
            { value: 'first', label: SEGMENT_LABELS.first },
            { value: 'second', label: SEGMENT_LABELS.second },
          ]}
          value={segment}
          onChange={(e) => setSegment(e.target.value as HandpickSegment)}
        />
        <NumberInput
          label="今回生豆重量"
          suffix="kg"
          min={0}
          step="0.01"
          value={greenBeanWeight}
          onChange={(e) => setGreenBeanWeight(e.target.value)}
        />
        <NumberInput
          label="欠点豆重量"
          suffix="g"
          min={0}
          value={defectBeanWeight}
          onChange={(e) => setDefectBeanWeight(e.target.value)}
        />

        <div className="rounded-lg p-3 bg-ground">
          <p className="text-sm text-ink-sub">
            今回の欠点率: <span className="font-bold text-ink">{formatPercent(defectRate)}</span>
          </p>
        </div>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 p-4 flex justify-end gap-2 border-t bg-surface border-edge">
        <Button variant="secondary" type="button" onClick={onClose}>
          キャンセル
        </Button>
        <Button variant="primary" type="button" loading={isSaving} onClick={handleSave}>
          保存
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: レンダリング/入力テストを作成する**

`D:\Dev\roastplus\components\production-record\HandpickEntryModal.test.tsx` を新規作成する。

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HandpickEntryModal } from './HandpickEntryModal';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('HandpickEntryModal', () => {
  const baseProps = {
    beanNames: ['ブラジル', 'グアテマラ'],
    initial: null,
    defaultWorkDate: '2026-08-01',
    onSave: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };

  it('月設定の豆名を選択肢として表示する', () => {
    render(<HandpickEntryModal {...baseProps} />);
    const select = screen.getByLabelText('豆の種類');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'ブラジル' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'グアテマラ' })).toBeInTheDocument();
  });

  it('欠点率をリアルタイム表示する（500g中50g→10.0%）', () => {
    render(<HandpickEntryModal {...baseProps} />);
    fireEvent.change(screen.getByLabelText('今回生豆重量'), { target: { value: '0.5' } });
    fireEvent.change(screen.getByLabelText('欠点豆重量'), { target: { value: '50' } });
    expect(screen.getByText('10.0%')).toBeInTheDocument();
  });

  it('有効入力で onSave に gram 換算した値を渡す', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<HandpickEntryModal {...baseProps} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('豆の種類'), { target: { value: 'ブラジル' } });
    fireEvent.change(screen.getByLabelText('今回生豆重量'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('欠点豆重量'), { target: { value: '120' } });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        workDate: '2026-08-01',
        beanName: 'ブラジル',
        segment: 'first',
        greenBeanWeightGram: 10000,
        defectBeanWeightGram: 120,
      });
    });
  });
});
```

- [ ] **Step 3: テストを実行して PASS を確認する**

```
npx vitest run components/production-record/HandpickEntryModal.test.tsx
```

期待: 3 passed。

- [ ] **Step 4: コミットする**

```
git add components/production-record/HandpickEntryModal.tsx components/production-record/HandpickEntryModal.test.tsx
git commit -m "feat(production-record): ハンドピック入力モーダルを追加"
```

---

### Task: RoastEntryModal.tsx — 焙煎入力モーダル

作業日・焙煎前重量 kg・焙煎後重量 kg を入力する。粉量は月設定参照(props)で入力欄なし。`calculateRoastYield` で焙煎歩留まり、`calculateDailyTheoryPacks` で当日理論袋数をリアルタイム表示する。

**Files:**

- Create: `D:\Dev\roastplus\components\production-record\RoastEntryModal.tsx`
- Test: `D:\Dev\roastplus\components\production-record\RoastEntryModal.test.tsx`

- [ ] **Step 1: 実装コードを作成する**

`D:\Dev\roastplus\components\production-record\RoastEntryModal.tsx` を新規作成する。理論袋数は `calculateDailyTheoryPacks(afterRoastGram, powderPerPackGram)` を使い、`powderPerPackGram` は props(月設定)から受け取る。

```tsx
'use client';

import { useEffect, useState } from 'react';
import { HiX } from 'react-icons/hi';

import { Modal, IconButton, Button, Input, NumberInput } from '@/components/ui';
import { calculateDailyTheoryPacks, calculateRoastYield, formatPercent } from '@/lib/productionRecords';
import type { RoastEntry, RoastEntryInput } from '@/types';

interface RoastEntryModalProps {
  /** 月設定の1袋粉量(g)。当日理論袋数の計算に使う。 */
  powderPerPackGram: number;
  /** 編集時の初期値 */
  initial?: RoastEntry | null;
  /** デフォルトの作業日 (yyyy-MM-dd) */
  defaultWorkDate: string;
  onSave: (input: RoastEntryInput) => Promise<void>;
  onClose: () => void;
}

export function RoastEntryModal({
  powderPerPackGram,
  initial,
  defaultWorkDate,
  onSave,
  onClose,
}: RoastEntryModalProps) {
  const [workDate, setWorkDate] = useState(defaultWorkDate);
  const [beforeWeight, setBeforeWeight] = useState('');
  const [afterWeight, setAfterWeight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setWorkDate(initial.workDate);
    setBeforeWeight(String(initial.beforeRoastWeightGram / 1000));
    setAfterWeight(String(initial.afterRoastWeightGram / 1000));
  }, [initial]);

  const beforeRoastWeightGram = (parseFloat(beforeWeight) || 0) * 1000;
  const afterRoastWeightGram = (parseFloat(afterWeight) || 0) * 1000;
  const roastYield = calculateRoastYield(beforeRoastWeightGram, afterRoastWeightGram);
  const dailyTheoryPacks = calculateDailyTheoryPacks(afterRoastWeightGram, powderPerPackGram);

  const handleSave = async () => {
    setError(null);
    if (workDate === '') {
      setError('作業日を入力してください');
      return;
    }
    if (beforeRoastWeightGram <= 0) {
      setError('焙煎前重量は0より大きい値を入力してください');
      return;
    }
    if (afterRoastWeightGram <= 0) {
      setError('焙煎後重量は0より大きい値を入力してください');
      return;
    }
    if (afterRoastWeightGram > beforeRoastWeightGram) {
      setError('焙煎後重量は焙煎前重量以下にしてください');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        workDate,
        beforeRoastWeightGram,
        afterRoastWeightGram,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      show={true}
      onClose={onClose}
      closeOnBackdropClick={false}
      contentClassName="rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-overlay border border-edge"
    >
      <div className="sticky top-0 p-4 flex items-center justify-between z-20 border-b bg-surface border-edge">
        <h2 className="text-xl font-semibold text-ink">焙煎記録</h2>
        <IconButton onClick={onClose} rounded aria-label="閉じる">
          <HiX className="h-6 w-6" />
        </IconButton>
      </div>

      <div className="p-4 space-y-4">
        <Input label="作業日" type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
        <NumberInput
          label="焙煎前重量"
          suffix="kg"
          min={0}
          step="0.01"
          value={beforeWeight}
          onChange={(e) => setBeforeWeight(e.target.value)}
        />
        <NumberInput
          label="焙煎後重量"
          suffix="kg"
          min={0}
          step="0.01"
          value={afterWeight}
          onChange={(e) => setAfterWeight(e.target.value)}
        />

        <div className="rounded-lg p-3 space-y-1 bg-ground">
          <p className="text-sm text-ink-sub">
            焙煎歩留まり: <span className="font-bold text-ink">{formatPercent(roastYield)}</span>
          </p>
          <p className="text-sm text-ink-sub">
            当日理論袋数: <span className="font-bold text-ink">{dailyTheoryPacks} 袋</span>
          </p>
        </div>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 p-4 flex justify-end gap-2 border-t bg-surface border-edge">
        <Button variant="secondary" type="button" onClick={onClose}>
          キャンセル
        </Button>
        <Button variant="primary" type="button" loading={isSaving} onClick={handleSave}>
          保存
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: レンダリング/入力テストを作成する**

`D:\Dev\roastplus\components\production-record\RoastEntryModal.test.tsx` を新規作成する。

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RoastEntryModal } from './RoastEntryModal';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('RoastEntryModal', () => {
  const baseProps = {
    powderPerPackGram: 8.5,
    initial: null,
    defaultWorkDate: '2026-08-01',
    onSave: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };

  it('焙煎歩留まりと当日理論袋数をリアルタイム表示する', () => {
    render(<RoastEntryModal {...baseProps} />);
    // 前10kg→後8.5kg: 歩留まり85.0% / 理論袋数 floor(8500/8.5)=1000袋
    fireEvent.change(screen.getByLabelText('焙煎前重量'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('焙煎後重量'), { target: { value: '8.5' } });
    expect(screen.getByText('85.0%')).toBeInTheDocument();
    expect(screen.getByText('1000 袋')).toBeInTheDocument();
  });

  it('焙煎後重量が焙煎前重量を超えると保存できずエラーを表示する', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RoastEntryModal {...baseProps} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('焙煎前重量'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('焙煎後重量'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('有効入力で onSave に gram 換算した値を渡す', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RoastEntryModal {...baseProps} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('焙煎前重量'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('焙煎後重量'), { target: { value: '8.5' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        workDate: '2026-08-01',
        beforeRoastWeightGram: 10000,
        afterRoastWeightGram: 8500,
      });
    });
  });
});
```

- [ ] **Step 3: テストを実行して PASS を確認する**

```
npx vitest run components/production-record/RoastEntryModal.test.tsx
```

期待: 3 passed。

- [ ] **Step 4: コミットする**

```
git add components/production-record/RoastEntryModal.tsx components/production-record/RoastEntryModal.test.tsx
git commit -m "feat(production-record): 焙煎入力モーダルを追加"
```

---

### Task: PackageEntryModal.tsx — パッケージ入力モーダル

作業日・A班良品数/不良品数・B班良品数/不良品数を入力する。`calculatePackageTotals` で合計・生産個数・不良率をリアルタイム表示する。良品は青(`text-info` 系)、不良は赤(`text-danger` 系)で表示する。

**Files:**

- Create: `D:\Dev\roastplus\components\production-record\PackageEntryModal.tsx`
- Test: `D:\Dev\roastplus\components\production-record\PackageEntryModal.test.tsx`

- [ ] **Step 1: 実装コードを作成する**

`D:\Dev\roastplus\components\production-record\PackageEntryModal.tsx` を新規作成する。個数は整数入力(`NumberInput` の `step="1"`)。`calculatePackageTotals(teamA, teamB)` は契約どおり `{ goodTotal, defectiveTotal, producedTotal, defectRate }` を返す。

```tsx
'use client';

import { useEffect, useState } from 'react';
import { HiX } from 'react-icons/hi';

import { Modal, IconButton, Button, Input, NumberInput } from '@/components/ui';
import { calculatePackageTotals, formatPercent } from '@/lib/productionRecords';
import type { PackageEntry, PackageEntryInput, TeamCounts } from '@/types';

interface PackageEntryModalProps {
  /** 編集時の初期値 */
  initial?: PackageEntry | null;
  /** デフォルトの作業日 (yyyy-MM-dd) */
  defaultWorkDate: string;
  onSave: (input: PackageEntryInput) => Promise<void>;
  onClose: () => void;
}

export function PackageEntryModal({ initial, defaultWorkDate, onSave, onClose }: PackageEntryModalProps) {
  const [workDate, setWorkDate] = useState(defaultWorkDate);
  const [teamAGood, setTeamAGood] = useState('');
  const [teamADefective, setTeamADefective] = useState('');
  const [teamBGood, setTeamBGood] = useState('');
  const [teamBDefective, setTeamBDefective] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setWorkDate(initial.workDate);
    setTeamAGood(String(initial.teamA.goodCount));
    setTeamADefective(String(initial.teamA.defectiveCount));
    setTeamBGood(String(initial.teamB.goodCount));
    setTeamBDefective(String(initial.teamB.defectiveCount));
  }, [initial]);

  const teamA: TeamCounts = {
    goodCount: parseInt(teamAGood, 10) || 0,
    defectiveCount: parseInt(teamADefective, 10) || 0,
  };
  const teamB: TeamCounts = {
    goodCount: parseInt(teamBGood, 10) || 0,
    defectiveCount: parseInt(teamBDefective, 10) || 0,
  };
  const totals = calculatePackageTotals(teamA, teamB);

  const handleSave = async () => {
    setError(null);
    if (workDate === '') {
      setError('作業日を入力してください');
      return;
    }
    if (teamA.goodCount < 0 || teamA.defectiveCount < 0 || teamB.goodCount < 0 || teamB.defectiveCount < 0) {
      setError('個数は0以上の整数で入力してください');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ workDate, teamA, teamB });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      show={true}
      onClose={onClose}
      closeOnBackdropClick={false}
      contentClassName="rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-overlay border border-edge"
    >
      <div className="sticky top-0 p-4 flex items-center justify-between z-20 border-b bg-surface border-edge">
        <h2 className="text-xl font-semibold text-ink">パッケージ記録</h2>
        <IconButton onClick={onClose} rounded aria-label="閉じる">
          <HiX className="h-6 w-6" />
        </IconButton>
      </div>

      <div className="p-4 space-y-4">
        <Input label="作業日" type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />

        <div className="rounded-lg p-3 space-y-3 bg-ground">
          <p className="text-sm font-medium text-ink">A班</p>
          <NumberInput
            label="良品数"
            suffix="個"
            min={0}
            step="1"
            value={teamAGood}
            onChange={(e) => setTeamAGood(e.target.value)}
          />
          <NumberInput
            label="不良品数"
            suffix="個"
            min={0}
            step="1"
            value={teamADefective}
            onChange={(e) => setTeamADefective(e.target.value)}
          />
        </div>

        <div className="rounded-lg p-3 space-y-3 bg-ground">
          <p className="text-sm font-medium text-ink">B班</p>
          <NumberInput
            label="良品数"
            suffix="個"
            min={0}
            step="1"
            value={teamBGood}
            onChange={(e) => setTeamBGood(e.target.value)}
          />
          <NumberInput
            label="不良品数"
            suffix="個"
            min={0}
            step="1"
            value={teamBDefective}
            onChange={(e) => setTeamBDefective(e.target.value)}
          />
        </div>

        <div className="rounded-lg p-3 space-y-1 bg-ground">
          <p className="text-sm text-ink-sub">
            良品合計: <span className="font-bold text-info">{totals.goodTotal} 個</span>
          </p>
          <p className="text-sm text-ink-sub">
            不良品合計: <span className="font-bold text-danger">{totals.defectiveTotal} 個</span>
          </p>
          <p className="text-sm text-ink-sub">
            生産個数: <span className="font-bold text-ink">{totals.producedTotal} 個</span>
          </p>
          <p className="text-sm text-ink-sub">
            不良率: <span className="font-bold text-danger">{formatPercent(totals.defectRate)}</span>
          </p>
        </div>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 p-4 flex justify-end gap-2 border-t bg-surface border-edge">
        <Button variant="secondary" type="button" onClick={onClose}>
          キャンセル
        </Button>
        <Button variant="primary" type="button" loading={isSaving} onClick={handleSave}>
          保存
        </Button>
      </div>
    </Modal>
  );
}
```

注意: `良品数` / `不良品数` のラベルが A班・B班で重複する。テストで `getByLabelText` を使うと曖昧マッチで失敗するため、Step 2 のテストでは `getAllByLabelText('良品数')[0]`(A班)・`[1]`(B班)のように index で取得する。

- [ ] **Step 2: レンダリング/入力テストを作成する**

`D:\Dev\roastplus\components\production-record\PackageEntryModal.test.tsx` を新規作成する。

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PackageEntryModal } from './PackageEntryModal';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('PackageEntryModal', () => {
  const baseProps = {
    initial: null,
    defaultWorkDate: '2026-08-01',
    onSave: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };

  it('合計・生産個数・不良率をリアルタイム表示する', () => {
    render(<PackageEntryModal {...baseProps} />);
    const goods = screen.getAllByLabelText('良品数');
    const defectives = screen.getAllByLabelText('不良品数');
    // A班 良90/不5, B班 良95/不10 → 良185 / 不15 / 生産200 / 不良率7.5%
    fireEvent.change(goods[0], { target: { value: '90' } });
    fireEvent.change(defectives[0], { target: { value: '5' } });
    fireEvent.change(goods[1], { target: { value: '95' } });
    fireEvent.change(defectives[1], { target: { value: '10' } });

    expect(screen.getByText('185 個')).toBeInTheDocument();
    expect(screen.getByText('15 個')).toBeInTheDocument();
    expect(screen.getByText('200 個')).toBeInTheDocument();
    expect(screen.getByText('7.5%')).toBeInTheDocument();
  });

  it('有効入力で onSave に TeamCounts 構造で渡す', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<PackageEntryModal {...baseProps} onSave={onSave} />);
    const goods = screen.getAllByLabelText('良品数');
    const defectives = screen.getAllByLabelText('不良品数');
    fireEvent.change(goods[0], { target: { value: '90' } });
    fireEvent.change(defectives[0], { target: { value: '5' } });
    fireEvent.change(goods[1], { target: { value: '95' } });
    fireEvent.change(defectives[1], { target: { value: '10' } });

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await vi.waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        workDate: '2026-08-01',
        teamA: { goodCount: 90, defectiveCount: 5 },
        teamB: { goodCount: 95, defectiveCount: 10 },
      });
    });
  });
});
```

- [ ] **Step 3: テストを実行して PASS を確認する**

```
npx vitest run components/production-record/PackageEntryModal.test.tsx
```

期待: 2 passed。

- [ ] **Step 4: コミットする**

```
git add components/production-record/PackageEntryModal.tsx components/production-record/PackageEntryModal.test.tsx
git commit -m "feat(production-record): パッケージ入力モーダルを追加"
```

---

### Task: 4モーダルの手動確認とフェーズ全体検証

4モーダルはフェーズE(`app/production-record/page.tsx`)で配線するまで画面に出ないため、UIテストページ(既存 `components/ui/registry.tsx` 経由)には登録しない。代わりに、フェーズEで配線後に `npm run dev` で目視確認する前提とし、このフェーズではビルド・テスト・フォーマットで品質を担保する。

**Files:**

- Modify: なし(検証のみ)

- [ ] **Step 1: 4モーダルのテストをまとめて実行する**

```
npx vitest run components/production-record/
```

期待: 11 passed(MonthSettings 3 / Handpick 3 / Roast 3 / Package 2)。

- [ ] **Step 2: ビルドとフォーマットチェックを実行する**

```
npm run build
npm run format:check
```

期待: build 成功(型エラー・lint warning ゼロ)、format:check で `All matched files use Prettier code style!`。format:check が落ちた場合は `npm run format` で整形してから再確認する(契約の既知の落とし穴)。

- [ ] **Step 3: 手動確認手順(フェーズE 配線後に実施)**

フェーズEでページに配線したのち、`npm run dev` を起動して以下を確認する。

- iPad 横(幅 1024px 程度)で各モーダルが `max-w-2xl` の中央モーダルとして開き、背景クリックでは閉じない(`closeOnBackdropClick=false`)こと。
- MonthSettings: 豆を追加して比率を入力すると右側に「必要 kg」が更新され、合計が 100% のとき配合合計が青(`text-info`)、それ以外で赤(`text-danger`)になること。
- Handpick: 月設定で登録した豆名が `Select` に出ること、欠点率がリアルタイム更新されること。
- Roast: 入力欄に粉量がなく、焙煎歩留まりと当日理論袋数が更新されること。
- Package: 良品合計が青、不良品合計・不良率が赤で表示されること。

- [ ] **Step 4: コミットは不要**

このタスクは検証のみのためコミットは行わない(前4タスクで各モーダルをコミット済み)。

---

成果物(このフェーズで作成したファイル):

- `D:\Dev\roastplus\components\production-record\MonthSettingsModal.tsx`(+ `.test.tsx`)
- `D:\Dev\roastplus\components\production-record\HandpickEntryModal.tsx`(+ `.test.tsx`)
- `D:\Dev\roastplus\components\production-record\RoastEntryModal.tsx`(+ `.test.tsx`)
- `D:\Dev\roastplus\components\production-record\PackageEntryModal.tsx`(+ `.test.tsx`)

依存(前フェーズ): `types/production-record.ts`(フェーズA)、`lib/productionRecords.ts` の `DEFAULT_POWDER_PER_PACK_GRAM` / `MAX_BLEND_ITEMS` / `validateBlendItems` / `calculateDefectRate` / `calculateRoastYield` / `calculateDailyTheoryPacks` / `calculatePackageTotals` / `formatPercent`(フェーズB)。後続(フェーズE)の `app/production-record/page.tsx` が4モーダルを `onSave`(Firestore 層 `addXxx`/`saveProductionRecordMonth` 呼び出し)・`onClose` 込みで配線する。

---

## フェーズE: 3列ページとCSV出力

このフェーズは生産記録機能の統合ページ `app/production-record/page.tsx` を実装します。純粋ロジック層 `lib/productionRecords.ts`(フェーズB)、Firestore層 `lib/firestore/productionRecords.ts`(フェーズC)、購読フック `hooks/useProductionRecord.ts`(フェーズD)、各入力モーダル `components/production-record/MonthSettingsModal.tsx` / `HandpickEntryModal.tsx` / `RoastEntryModal.tsx` / `PackageEntryModal.tsx`(別フェーズ)がすべて存在している前提で、それらを画面に組み立てます。

このフェーズで使う他フェーズの公開シンボル(契約に完全一致):

- 型(`@/types`): `ProductionRecordMonth` / `HandpickEntry` / `RoastEntry` / `PackageEntry` / `ProductionRecordMonthInput` / `HandpickEntryInput` / `RoastEntryInput` / `PackageEntryInput` / `ProductionRecordMonthlySummary`
- 純粋ロジック(`@/lib/productionRecords`): `buildBlendLabel` / `sumHandpick` / `calculateDefectRate` / `calculatePremixBags` / `sumRoast` / `calculateRoastYield` / `calculatePackageTotals` / `buildMonthlySummary` / `buildProductionRecordCsv` / `getProductionRecordCsvFileName` / `formatPercent` / `formatKg` / `DEFAULT_POWDER_PER_PACK_GRAM`
- Firestore(`@/lib/firestore/productionRecords`): `subscribeRecentProductionMonths` / `saveProductionRecordMonth` / `addHandpickEntry` / `updateHandpickEntry` / `addRoastEntry` / `updateRoastEntry` / `addPackageEntry` / `updatePackageEntry`
- フック(`@/hooks/useProductionRecord`): `useProductionRecord`
- モーダル(`@/components/production-record/*`): `MonthSettingsModal` / `HandpickEntryModal` / `RoastEntryModal` / `PackageEntryModal`

注意: ページはTDDが不自然なため、完全な実装コード + 軽いレンダリングテスト + 手動確認手順で構成します。色は必ずテーマ変数クラス(`bg-page` / `bg-surface` / `text-ink` / `text-ink-sub` / `text-ink-muted` / `border-edge` / `text-info` / `text-danger` / `bg-danger` など)を使い、生Tailwindカラー(`text-blue-500` 等)は禁止です。

---

### Task: モーダルが他フェーズで実装する props 契約の前提確認

**Files:**

- Read: `D:\Dev\roastplus\components\production-record\MonthSettingsModal.tsx`
- Read: `D:\Dev\roastplus\components\production-record\HandpickEntryModal.tsx`
- Read: `D:\Dev\roastplus\components\production-record\RoastEntryModal.tsx`
- Read: `D:\Dev\roastplus\components\production-record\PackageEntryModal.tsx`

このページ実装は、モーダルが以下の props 契約を満たすことに依存します。モーダル実装フェーズが完了済みの場合、各ファイルの props 定義がこの契約と一致することを確認してから着手してください。一致しない場合は、モーダル側の props 名をこのページ実装に合わせるか、ページ側を実際の props 名に修正します(ページ側でモーダルの型を発明しないこと)。

- [ ] **Step 1: MonthSettingsModal の props を確認する**
      期待する props(このページが渡すもの):
  ```ts
  interface MonthSettingsModalProps {
    show: boolean;
    month: string; // 設定対象の月 yyyy-MM
    initialMonth: ProductionRecordMonth | null; // 既存設定（編集時）。新規なら null
    onClose: () => void;
    onSave: (input: ProductionRecordMonthInput) => Promise<void>;
  }
  ```
- [ ] **Step 2: HandpickEntryModal の props を確認する**
  ```ts
  interface HandpickEntryModalProps {
    show: boolean;
    initialEntry: HandpickEntry | null; // 編集時は既存entry、新規追加は null
    onClose: () => void;
    onSave: (input: HandpickEntryInput) => Promise<void>;
  }
  ```
- [ ] **Step 3: RoastEntryModal の props を確認する**
  ```ts
  interface RoastEntryModalProps {
    show: boolean;
    initialEntry: RoastEntry | null;
    onClose: () => void;
    onSave: (input: RoastEntryInput) => Promise<void>;
  }
  ```
- [ ] **Step 4: PackageEntryModal の props を確認する**
  ```ts
  interface PackageEntryModalProps {
    show: boolean;
    initialEntry: PackageEntry | null;
    onClose: () => void;
    onSave: (input: PackageEntryInput) => Promise<void>;
  }
  ```
- [ ] **Step 5: 不一致があれば報告する**
      props 名・型に差分があれば、本ページ実装(下記 Task)の該当箇所の prop 名を実際のモーダル実装に合わせて修正する。このフェーズではモーダルの実装内容(入力フィールド等)は変更しない。

---

### Task: 生産記録ページの軽いレンダリングテストを書く

**Files:**

- Test: `D:\Dev\roastplus\app\production-record\page.test.tsx`

このページは認証ガードと購読を含むため、未ログイン時に `LoginPage` が、認証ロード中に `Loading` が表示されることだけを確認する最小テストを書きます。Firestore/フック/モーダルはすべてモックします。

- [ ] **Step 1: 失敗するテストを書く**

  ```tsx
  import { render, screen } from '@testing-library/react';
  import { describe, expect, it, vi } from 'vitest';

  // 認証フックをモック（テストごとに戻り値を差し替える）
  const mockUseAuth = vi.fn();
  vi.mock('@/lib/auth', () => ({
    useAuth: () => mockUseAuth(),
  }));

  // Toast コンテキストをモック
  vi.mock('@/components/Toast', () => ({
    useToastContext: () => ({ showToast: vi.fn() }),
  }));

  // 購読フックをモック（空データを返す）
  vi.mock('@/hooks/useProductionRecord', () => ({
    useProductionRecord: () => ({
      monthDoc: null,
      handpickEntries: [],
      roastEntries: [],
      packageEntries: [],
      isLoading: false,
    }),
  }));

  // Firestore 関数をモック
  vi.mock('@/lib/firestore/productionRecords', () => ({
    subscribeRecentProductionMonths: vi.fn(() => () => {}),
    saveProductionRecordMonth: vi.fn(async () => {}),
    addHandpickEntry: vi.fn(async () => 'id'),
    updateHandpickEntry: vi.fn(async () => {}),
    addRoastEntry: vi.fn(async () => 'id'),
    updateRoastEntry: vi.fn(async () => {}),
    addPackageEntry: vi.fn(async () => 'id'),
    updatePackageEntry: vi.fn(async () => {}),
  }));

  // ログインページをモック（識別用テキストのみ）
  vi.mock('@/app/login/page', () => ({
    default: () => <div>ログイン画面</div>,
  }));

  // Loading をモック
  vi.mock('@/components/Loading', () => ({
    Loading: () => <div>読み込み中</div>,
  }));

  // モーダルはレンダリングされない（show=false）が import 解決のためモック
  vi.mock('@/components/production-record/MonthSettingsModal', () => ({
    MonthSettingsModal: () => null,
  }));
  vi.mock('@/components/production-record/HandpickEntryModal', () => ({
    HandpickEntryModal: () => null,
  }));
  vi.mock('@/components/production-record/RoastEntryModal', () => ({
    RoastEntryModal: () => null,
  }));
  vi.mock('@/components/production-record/PackageEntryModal', () => ({
    PackageEntryModal: () => null,
  }));

  import ProductionRecordPage from './page';

  describe('ProductionRecordPage', () => {
    it('認証ロード中はLoadingを表示する', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });
      render(<ProductionRecordPage />);
      expect(screen.getByText('読み込み中')).toBeInTheDocument();
    });

    it('未ログイン時はLoginPageを表示する', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: false });
      render(<ProductionRecordPage />);
      expect(screen.getByText('ログイン画面')).toBeInTheDocument();
    });

    it('ログイン済みなら見出し「生産記録」を表示する', () => {
      mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' }, loading: false });
      render(<ProductionRecordPage />);
      expect(screen.getByRole('heading', { name: '生産記録' })).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: テストを実行して失敗を確認する**
  ```
  npx vitest run app/production-record/page.test.tsx
  ```
  期待: `app/production-record/page.tsx` がまだ存在しないため import 解決に失敗し、FAIL(3テスト)。

---

### Task: 生産記録ページ本体を実装する

**Files:**

- Create: `D:\Dev\roastplus\app\production-record\page.tsx`

`app/production-packs/page.tsx`(3列 `md:grid` の骨格・`use client`・`useAuth` 認証ガード・`FloatingNav backHref`)と `app/production-packs/monthly/page.tsx`(CSV ダウンロード手順)を雛形に、生産記録固有の状態・計算・モーダル・CSV を組み立てます。下記は完全な実装コードです。

- [ ] **Step 1: ページ全文を作成する**

  ```tsx
  'use client';

  import { useEffect, useMemo, useState } from 'react';
  import { HiDownload } from 'react-icons/hi';
  import { MdFactory } from 'react-icons/md';
  import LoginPage from '@/app/login/page';
  import { Loading } from '@/components/Loading';
  import { useToastContext } from '@/components/Toast';
  import { HandpickEntryModal } from '@/components/production-record/HandpickEntryModal';
  import { MonthSettingsModal } from '@/components/production-record/MonthSettingsModal';
  import { PackageEntryModal } from '@/components/production-record/PackageEntryModal';
  import { RoastEntryModal } from '@/components/production-record/RoastEntryModal';
  import { Badge, Button, Card, EmptyState, FloatingNav, Input, Select } from '@/components/ui';
  import { useProductionRecord } from '@/hooks/useProductionRecord';
  import { useAuth } from '@/lib/auth';
  import {
    addHandpickEntry,
    addPackageEntry,
    addRoastEntry,
    saveProductionRecordMonth,
    subscribeRecentProductionMonths,
    updateHandpickEntry,
    updatePackageEntry,
    updateRoastEntry,
  } from '@/lib/firestore/productionRecords';
  import {
    buildBlendLabel,
    buildMonthlySummary,
    buildProductionRecordCsv,
    calculatePackageTotals,
    calculatePremixBags,
    calculateRoastYield,
    formatKg,
    formatPercent,
    getProductionRecordCsvFileName,
    sumHandpick,
    sumRoast,
  } from '@/lib/productionRecords';
  import type {
    HandpickEntry,
    HandpickEntryInput,
    PackageEntry,
    PackageEntryInput,
    ProductionRecordMonth,
    ProductionRecordMonthInput,
    RoastEntry,
    RoastEntryInput,
  } from '@/types';

  // 当月を yyyy-MM で返す（ローカル時刻基準）
  function getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  // 月ラベル「2026年8月分」へ変換（表示専用。CSVは month そのものを使う）
  function formatMonthLabel(month: string): string {
    const [year, monthPart] = month.split('-');
    if (!year || !monthPart) {
      return month;
    }
    return `${year}年${Number(monthPart)}月分`;
  }

  export default function ProductionRecordPage() {
    const { user, loading: authLoading } = useAuth();
    const { showToast } = useToastContext();

    const [recentMonths, setRecentMonths] = useState<ProductionRecordMonth[]>([]);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [hasInitializedMonth, setHasInitializedMonth] = useState(false);
    const [newMonthInput, setNewMonthInput] = useState(getCurrentMonth);

    // モーダル開閉
    const [isMonthSettingsOpen, setIsMonthSettingsOpen] = useState(false);
    const [editingHandpick, setEditingHandpick] = useState<HandpickEntry | null>(null);
    const [isHandpickOpen, setIsHandpickOpen] = useState(false);
    const [editingRoast, setEditingRoast] = useState<RoastEntry | null>(null);
    const [isRoastOpen, setIsRoastOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<PackageEntry | null>(null);
    const [isPackageOpen, setIsPackageOpen] = useState(false);

    // 月docと3種entriesを購読
    const { monthDoc, handpickEntries, roastEntries, packageEntries, isLoading } = useProductionRecord(
      user?.uid,
      selectedMonth || undefined
    );

    // 月生産単位の一覧を購読（最新24件）。最初の取得で選択中月を初期化
    useEffect(() => {
      if (!user) {
        return;
      }

      return subscribeRecentProductionMonths(
        user.uid,
        (months) => {
          setRecentMonths(months);
          setHasInitializedMonth((alreadyInitialized) => {
            if (alreadyInitialized) {
              return true;
            }
            // 初回のみ：最新月があればそれを、なければ未選択のままにする
            if (months.length > 0) {
              setSelectedMonth(months[0].month);
            }
            return true;
          });
        },
        () => {
          showToast('生産記録の読み込みに失敗しました', 'error');
          setHasInitializedMonth(true);
        }
      );
    }, [showToast, user]);

    // 月セレクトの選択肢
    const monthOptions = useMemo(
      () => recentMonths.map((month) => ({ value: month.month, label: formatMonthLabel(month.month) })),
      [recentMonths]
    );

    // 配合ラベル（上部概要）
    const blendLabel = monthDoc ? buildBlendLabel(monthDoc.blendItems) : '';

    // 1列目：ハンドピック集計
    const handpickTotals = useMemo(() => sumHandpick(handpickEntries), [handpickEntries]);
    const handpickDefectRate = useMemo(() => {
      // 欠点率 = 欠点豆合計 / ハンドピック済み合計（0除算は calculate 側でガード）
      const { handpickedTotalGram, defectTotalGram } = handpickTotals;
      return handpickedTotalGram <= 0 ? 0 : defectTotalGram / handpickedTotalGram;
    }, [handpickTotals]);

    // 2列目：焙煎集計（プレミックス袋数は使用可能生豆から算出）
    const roastTotals = useMemo(() => sumRoast(roastEntries), [roastEntries]);
    const usableGreenGram = Math.max(0, handpickTotals.handpickedTotalGram - handpickTotals.defectTotalGram);
    const premix = useMemo(() => calculatePremixBags(usableGreenGram), [usableGreenGram]);
    const roastYield = useMemo(
      () => calculateRoastYield(roastTotals.beforeTotalGram, roastTotals.afterTotalGram),
      [roastTotals]
    );

    // 3列目：パッケージ当日合計（当月の全entryを合算した teamA/teamB を作る）
    const packageTotals = useMemo(() => {
      const teamA = packageEntries.reduce(
        (acc, entry) => ({
          goodCount: acc.goodCount + entry.teamA.goodCount,
          defectiveCount: acc.defectiveCount + entry.teamA.defectiveCount,
        }),
        { goodCount: 0, defectiveCount: 0 }
      );
      const teamB = packageEntries.reduce(
        (acc, entry) => ({
          goodCount: acc.goodCount + entry.teamB.goodCount,
          defectiveCount: acc.defectiveCount + entry.teamB.defectiveCount,
        }),
        { goodCount: 0, defectiveCount: 0 }
      );
      return calculatePackageTotals(teamA, teamB);
    }, [packageEntries]);

    // 月合計サマリー（CSV/下部表示の元データ）
    const summary = useMemo(() => {
      if (!monthDoc) {
        return null;
      }
      return buildMonthlySummary(monthDoc, handpickEntries, roastEntries, packageEntries);
    }, [monthDoc, handpickEntries, roastEntries, packageEntries]);

    // CSVプレビュー文字列（BOM/CRLFを含む）
    const csvPreview = useMemo(() => (summary ? buildProductionRecordCsv(summary) : ''), [summary]);

    // 各列の最新2件（createdAt降順は購読側で保証済み）
    const recentHandpick = handpickEntries.slice(0, 2);
    const recentRoast = roastEntries.slice(0, 2);
    const recentPackage = packageEntries.slice(0, 2);

    // 月設定の保存
    const handleSaveMonth = async (input: ProductionRecordMonthInput) => {
      if (!user) {
        return;
      }
      await saveProductionRecordMonth(user.uid, input);
      setSelectedMonth(input.month);
      setIsMonthSettingsOpen(false);
      showToast('保存しました', 'success');
    };

    // ハンドピックentryの保存（新規/編集を id 有無で切替）
    const handleSaveHandpick = async (input: HandpickEntryInput) => {
      if (!user || !selectedMonth) {
        return;
      }
      if (editingHandpick) {
        await updateHandpickEntry(user.uid, selectedMonth, editingHandpick.id, input);
      } else {
        await addHandpickEntry(user.uid, selectedMonth, input);
      }
      setIsHandpickOpen(false);
      setEditingHandpick(null);
      showToast('保存しました', 'success');
    };

    const handleSaveRoast = async (input: RoastEntryInput) => {
      if (!user || !selectedMonth) {
        return;
      }
      if (editingRoast) {
        await updateRoastEntry(user.uid, selectedMonth, editingRoast.id, input);
      } else {
        await addRoastEntry(user.uid, selectedMonth, input);
      }
      setIsRoastOpen(false);
      setEditingRoast(null);
      showToast('保存しました', 'success');
    };

    const handleSavePackage = async (input: PackageEntryInput) => {
      if (!user || !selectedMonth) {
        return;
      }
      if (editingPackage) {
        await updatePackageEntry(user.uid, selectedMonth, editingPackage.id, input);
      } else {
        await addPackageEntry(user.uid, selectedMonth, input);
      }
      setIsPackageOpen(false);
      setEditingPackage(null);
      showToast('保存しました', 'success');
    };

    // CSV出力（productionPacks/monthly と同じパターン）
    const handleExportCsv = () => {
      if (!summary) {
        return;
      }
      const csv = buildProductionRecordCsv(summary);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getProductionRecordCsvFileName(summary.month);
      link.click();
      window.URL.revokeObjectURL(url);
      showToast('CSVを出力しました', 'success');
    };

    if (authLoading) {
      return <Loading />;
    }

    if (!user) {
      return <LoginPage />;
    }

    return (
      <div className="min-h-screen bg-page pt-24 pb-4 px-4 sm:px-6 lg:px-8 transition-colors duration-1000">
        <FloatingNav backHref="/" />

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted">
                <MdFactory className="h-5 w-5" />
                <span>月次生産</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-ink">生産記録</h1>
              {selectedMonth ? (
                <p className="mt-1 text-sm text-ink-sub">
                  {formatMonthLabel(selectedMonth)}
                  {blendLabel ? `　配合: ${blendLabel}` : ''}
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink-sub">対象月を作成して記録を始めます。</p>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              {monthOptions.length > 0 && (
                <Select
                  label="対象月"
                  options={monthOptions}
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="sm:w-[200px]"
                />
              )}
              <div className="flex items-end gap-2">
                <Input
                  type="month"
                  label="新規作成"
                  value={newMonthInput}
                  onChange={(event) => setNewMonthInput(event.target.value || getCurrentMonth())}
                  className="sm:w-[170px] !py-2 !text-base"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => setIsMonthSettingsOpen(true)}
                  className="whitespace-nowrap"
                >
                  対象月を作成
                </Button>
              </div>
            </div>
          </header>

          {/* 月生産単位が0件のときの初期表示 */}
          {monthOptions.length === 0 && !selectedMonth ? (
            <Card className="p-6">
              <EmptyState
                title="生産記録がまだありません"
                description="右上の「対象月を作成」から対象月と配合・1袋粉量を設定すると、記録を始められます。"
                icon={<MdFactory className="h-8 w-8" />}
                action={
                  <Button type="button" size="sm" onClick={() => setIsMonthSettingsOpen(true)}>
                    対象月を作成
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              {/* 本体3列：iPad横向き相当（md以上）で3列表示。スマホでは隠す */}
              <main className="hidden gap-4 md:grid lg:grid-cols-3">
                {/* 1列目：生豆ハンドピック */}
                <Card className="flex flex-col gap-4 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-ink">生豆ハンドピック</h2>
                    <Badge variant="secondary" size="md">
                      {handpickEntries.length}件
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-edge bg-field p-3">
                      <div className="text-xs font-semibold text-ink-muted">ハンドピック済み</div>
                      <p className="mt-1 text-xl font-bold tabular-nums text-ink">
                        {formatKg(handpickTotals.handpickedTotalGram)} kg
                      </p>
                    </div>
                    <div className="rounded-lg border border-edge bg-field p-3">
                      <div className="text-xs font-semibold text-ink-muted">欠点率</div>
                      <p className="mt-1 text-xl font-bold tabular-nums text-ink">
                        {formatPercent(handpickDefectRate)}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={!selectedMonth}
                    onClick={() => {
                      setEditingHandpick(null);
                      setIsHandpickOpen(true);
                    }}
                  >
                    欠点豆を入力
                  </Button>

                  <div className="space-y-2">
                    {recentHandpick.length === 0 ? (
                      <p className="text-sm text-ink-muted">まだ記録がありません。</p>
                    ) : (
                      recentHandpick.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => {
                            setEditingHandpick(entry);
                            setIsHandpickOpen(true);
                          }}
                          className="w-full rounded-lg border border-edge bg-surface p-3 text-left transition-colors hover:bg-ground"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-ink">{entry.beanName}</span>
                            <span className="text-xs text-ink-muted">
                              {entry.segment === 'first' ? '1回目' : '2回目'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-ink-sub">
                            {entry.workDate}　生豆 {formatKg(entry.greenBeanWeightGram)} kg / 欠点{' '}
                            {entry.defectBeanWeightGram} g
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </Card>

                {/* 2列目：焙煎 */}
                <Card className="flex flex-col gap-4 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-ink">焙煎</h2>
                    <Badge variant="secondary" size="md">
                      {roastEntries.length}件
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-edge bg-field p-3">
                      <div className="text-xs font-semibold text-ink-muted">プレミックス袋数</div>
                      <p className="mt-1 text-xl font-bold tabular-nums text-ink">
                        {premix.bags} 袋
                        <span className="ml-1 text-xs font-medium text-ink-muted">余り {premix.remainderGram} g</span>
                      </p>
                    </div>
                    <div className="rounded-lg border border-edge bg-field p-3">
                      <div className="text-xs font-semibold text-ink-muted">焙煎歩留まり</div>
                      <p className="mt-1 text-xl font-bold tabular-nums text-ink">{formatPercent(roastYield)}</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={!selectedMonth}
                    onClick={() => {
                      setEditingRoast(null);
                      setIsRoastOpen(true);
                    }}
                  >
                    焙煎を入力
                  </Button>

                  <div className="space-y-2">
                    {recentRoast.length === 0 ? (
                      <p className="text-sm text-ink-muted">まだ記録がありません。</p>
                    ) : (
                      recentRoast.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => {
                            setEditingRoast(entry);
                            setIsRoastOpen(true);
                          }}
                          className="w-full rounded-lg border border-edge bg-surface p-3 text-left transition-colors hover:bg-ground"
                        >
                          <div className="text-sm font-bold text-ink">{entry.workDate}</div>
                          <p className="mt-1 text-xs text-ink-sub">
                            焙煎前 {formatKg(entry.beforeRoastWeightGram)} kg → 焙煎後{' '}
                            {formatKg(entry.afterRoastWeightGram)} kg
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </Card>

                {/* 3列目：パッケージ */}
                <Card className="flex flex-col gap-4 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-ink">パッケージ</h2>
                    <Badge variant="secondary" size="md">
                      {packageEntries.length}件
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-edge bg-field p-2.5">
                      <div className="text-[11px] font-semibold text-ink-muted">良品</div>
                      <p className="mt-1 text-lg font-bold tabular-nums text-info">{packageTotals.goodTotal}</p>
                    </div>
                    <div className="rounded-lg border border-edge bg-field p-2.5">
                      <div className="text-[11px] font-semibold text-ink-muted">不良品</div>
                      <p className="mt-1 text-lg font-bold tabular-nums text-danger">{packageTotals.defectiveTotal}</p>
                    </div>
                    <div className="rounded-lg border border-edge bg-field p-2.5">
                      <div className="text-[11px] font-semibold text-ink-muted">生産個数</div>
                      <p className="mt-1 text-lg font-bold tabular-nums text-ink">{packageTotals.producedTotal}</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={!selectedMonth}
                    onClick={() => {
                      setEditingPackage(null);
                      setIsPackageOpen(true);
                    }}
                  >
                    パッケージを入力
                  </Button>

                  <div className="space-y-2">
                    {recentPackage.length === 0 ? (
                      <p className="text-sm text-ink-muted">まだ記録がありません。</p>
                    ) : (
                      recentPackage.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => {
                            setEditingPackage(entry);
                            setIsPackageOpen(true);
                          }}
                          className="w-full rounded-lg border border-edge bg-surface p-3 text-left transition-colors hover:bg-ground"
                        >
                          <div className="text-sm font-bold text-ink">{entry.workDate}</div>
                          <p className="mt-1 text-xs text-ink-sub">
                            A班 良 {entry.teamA.goodCount} / 不 {entry.teamA.defectiveCount}　B班 良{' '}
                            {entry.teamB.goodCount} / 不 {entry.teamB.defectiveCount}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </Card>
              </main>

              {/* スマホ向け案内（3列はmd以上） */}
              <Card className="p-4 md:hidden">
                <EmptyState
                  title="入力はiPad横向きで行います"
                  description="記録の入力・編集は、画面を横向き（md以上の幅）にすると3列で表示されます。"
                  icon={<MdFactory className="h-8 w-8" />}
                  size="sm"
                />
              </Card>

              {/* 下部：月合計サマリー + CSV */}
              <Card className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">月合計サマリー</h2>
                    <p className="mt-1 text-sm text-ink-muted">本社報告用の月合計（12項目）です。</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleExportCsv}
                    disabled={!summary || isLoading}
                    className="w-full sm:w-auto"
                  >
                    <HiDownload className="h-5 w-5" />
                    CSV出力
                  </Button>
                </div>

                {!summary ? (
                  <div className="flex min-h-[120px] items-center justify-center text-sm text-ink-muted">
                    {isLoading ? '読み込み中...' : '対象月の設定がありません。'}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <SummaryTile label="配合" value={summary.blendLabel} />
                      <SummaryTile label="生豆重量" value={`${formatKg(summary.greenBeanTotalGram)} kg`} />
                      <SummaryTile label="欠点豆重量" value={`${summary.defectBeanTotalGram} g`} />
                      <SummaryTile label="欠点率" value={formatPercent(summary.defectRate)} />
                      <SummaryTile label="焙煎後重量" value={`${formatKg(summary.roastAfterTotalGram)} kg`} />
                      <SummaryTile label="水分蒸発率" value={formatPercent(summary.moistureLossRate)} />
                      <SummaryTile label="30kg理論袋数" value={`${summary.thirtyKgTheoryPacks} 袋`} />
                      <SummaryTile label="月良品数" value={summary.monthlyGoodCount} valueClassName="text-info" />
                      <SummaryTile
                        label="月不良品数"
                        value={summary.monthlyDefectiveCount}
                        valueClassName="text-danger"
                      />
                      <SummaryTile label="月生産個数" value={summary.monthlyProducedCount} />
                      <SummaryTile label="パッケージロス率" value={formatPercent(summary.packageLossRate)} />
                    </div>

                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-ink-muted">CSVプレビュー</h3>
                      <pre className="overflow-x-auto rounded-lg border border-edge bg-field p-3 text-xs text-ink-sub">
                        {csvPreview}
                      </pre>
                    </div>
                  </>
                )}
              </Card>
            </>
          )}
        </div>

        {/* モーダル群 */}
        <MonthSettingsModal
          show={isMonthSettingsOpen}
          month={selectedMonth || newMonthInput}
          initialMonth={selectedMonth ? monthDoc : null}
          onClose={() => setIsMonthSettingsOpen(false)}
          onSave={handleSaveMonth}
        />
        <HandpickEntryModal
          show={isHandpickOpen}
          initialEntry={editingHandpick}
          onClose={() => {
            setIsHandpickOpen(false);
            setEditingHandpick(null);
          }}
          onSave={handleSaveHandpick}
        />
        <RoastEntryModal
          show={isRoastOpen}
          initialEntry={editingRoast}
          onClose={() => {
            setIsRoastOpen(false);
            setEditingRoast(null);
          }}
          onSave={handleSaveRoast}
        />
        <PackageEntryModal
          show={isPackageOpen}
          initialEntry={editingPackage}
          onClose={() => {
            setIsPackageOpen(false);
            setEditingPackage(null);
          }}
          onSave={handleSavePackage}
        />
      </div>
    );
  }

  interface SummaryTileProps {
    label: string;
    value: React.ReactNode;
    valueClassName?: string;
  }

  function SummaryTile({ label, value, valueClassName }: SummaryTileProps) {
    return (
      <div className="min-h-[86px] rounded-xl border border-edge bg-surface p-3">
        <div className="text-xs font-semibold text-ink-muted">{label}</div>
        <p className={`mt-2 text-2xl font-bold tabular-nums text-ink ${valueClassName ?? ''}`}>{value}</p>
      </div>
    );
  }
  ```

  実装の要点(理解すべきポイント):
  1. 認証ガードは `authLoading` 中は `<Loading />`、未ログインは `<LoginPage />` を返す(`production-packs` と同型)。
  2. `selectedMonth` は `subscribeRecentProductionMonths` の初回コールバックで最新月に初期化し、以降はユーザー選択を尊重する(`hasInitializedMonth` フラグで一度だけ初期化)。
  3. 月合計サマリーは `buildMonthlySummary(monthDoc, handpickEntries, roastEntries, packageEntries)` がすべての計算(0除算ガード含む)を担い、ページは `formatKg` / `formatPercent` で整形するだけにする(計算をページに書かない)。
  4. CSV出力は契約のパターンそのまま: `buildProductionRecordCsv` → `Blob({type:'text/csv;charset=utf-8;'})` → `URL.createObjectURL` → `a.click()` → `revokeObjectURL` → `showToast`。BOM/CRLF/12列順は `buildProductionRecordCsv` 側(フェーズB)が保証する。
  5. 良品は `text-info`(青系)、不良品は `text-danger`(赤系)のテーマ変数で色分けする。生Tailwindカラーは使わない。

- [ ] **Step 2: テストを実行してPASSを確認する**

  ```
  npx vitest run app/production-record/page.test.tsx
  ```

  期待: PASS(3テスト)。

- [ ] **Step 3: 型チェックとビルドを通す**
  ```
  npm run build
  ```
  期待: 型エラーなしでビルド成功。`MdFactory` が `react-icons/md` に存在することを前提とする(存在しない場合は `react-icons/md` の別の工場系アイコン、例 `MdOutlineFactory` に差し替える)。

---

### Task: 手動確認

**Files:**

- (確認のみ。変更なし)

- [ ] **Step 1: 開発サーバーを起動する**
  ```
  npm run dev
  ```
- [ ] **Step 2: ブラウザで `http://localhost:3000/production-record` を開く**
      確認する内容:
  - 未ログイン時: ログイン画面が表示される。ログイン後にページが表示される。
  - 左上に戻る(`FloatingNav backHref="/"`)、見出し「生産記録」が表示される。
  - 月生産単位が0件のとき: 「生産記録がまだありません」の初期表示と「対象月を作成」ボタンが出る。
- [ ] **Step 3: iPad横向き相当（md以上の幅）で3列表示を確認する**
      ブラウザ幅を768px以上(DevToolsのレスポンシブで iPad 横向き ≒ 1024×768)にすると、本体が「生豆ハンドピック / 焙煎 / パッケージ」の3列(`lg:grid-cols-3`)で並ぶ。768px未満では3列が隠れ、代わりに「入力はiPad横向きで行います」の案内カードが出る。
- [ ] **Step 4: 入力フローを確認する**
  - 「対象月を作成」→ MonthSettingsModal で配合(合計100%)と1袋粉量(既定8.5)を保存 → トースト「保存しました」、対象月が選択される。
  - 各列の「欠点豆を入力 / 焙煎を入力 / パッケージを入力」でモーダルが開き、保存すると最新2件に反映される。
  - 既存の最新2件の行をタップすると編集モーダル(初期値入り)が開く。
- [ ] **Step 5: サマリーとCSVを確認する**
  - 下部サマリーに12項目が表示され、欠点率/水分蒸発率/パッケージロス率は `formatPercent`(小数1桁+%)、重量kgは `formatKg`(小数2桁)で整形される。良品は青系(`text-info`)、不良品は赤系(`text-danger`)。
  - 「CSV出力」でファイル `production-record-YYYY-MM.csv` がダウンロードされる。Excelで開いて文字化けしないこと(BOM付き)、列順が契約の12項目と一致することを確認する。
  - CSVプレビュー欄に同じ内容(ヘッダ+1行)が表示される。

---

### Task: コミット

**Files:**

- (コミットのみ)

- [ ] **Step 1: 変更をステージしてコミットする**
  ```
  git add app/production-record/page.tsx app/production-record/page.test.tsx
  git commit -m "feat: 生産記録の3列ページとCSV出力を追加"
  ```
  注: このフェーズのコミット前検証(`npm run build` と `npm run test:run` と `npm run format:check`)は、全フェーズ統合後にまとめて実行する想定。単体で先行検証する場合は `npm run format:check` も必ず通すこと(format漏れでCIのFormatジョブが落ちる既知の落とし穴)。Lint/warningはゼロを維持する。

---

実装ファイル(絶対パス): `D:\Dev\roastplus\app\production-record\page.tsx`、テスト: `D:\Dev\roastplus\app\production-record\page.test.tsx`。

このフェーズで他フェーズに依存する点(統合担当向けの注記):

- モーダル4種は本ページが `show` / `onClose` / `onSave` (Handpick/Roast/Package は `initialEntry`、MonthSettings は `month` / `initialMonth`)を渡す前提。モーダル実装フェーズの props 名が異なる場合は最初の Task で吸収する。
- `MdFactory`(react-icons/md)の存在は要確認。なければ同等の工場/生産系アイコンに差し替える。
- `text-info` / `text-danger` / `bg-field` などテーマ変数クラスを使用(契約準拠)。`bg-field` は `production-packs` でも使用実績あり。

---

## フェーズF: ホーム導線と既存パッケージ記録の削除

このフェーズは2部構成です。**Part 1（導線追加）はフェーズA〜Eで生産記録機能(`/production-record`)が実装・動作確認できた後**に実施します。**Part 2（既存パッケージ記録の削除）は最終フェーズ**で、生産記録が本番で問題なく動くことを確認してから実行してください。

前提（仕様書より）:

- 旧パッケージ記録(`productionPackRecords`)には**過去の業務データが存在しない**ため、**データ移行は不要**です。
- Firestore上に残る旧データ(`users/{uid}/productionPackRecords/*`)の物理削除は**本番影響があるため、この計画には含めません**。コードからの参照削除のみを行い、Firestore上の旧データ削除は手動対応とします（Part 2末尾の注記参照）。

---

### Task: ホーム機能リストに生産記録を追加 (homeFeatures)

`HomeFeatureKey` 型は `HOME_FEATURES` 配列から導出されるため、配列にエントリを足すだけで型が自動連動します。

**Files:**

- Modify: `D:\Dev\roastplus\lib\homeFeatures.ts`

- [ ] **Step 1: `HOME_FEATURES` に `production-record` エントリを追加する**

  `production-packs`（パッケージ記録）エントリの直後に、新しい生産記録エントリを追加します。`lib/homeFeatures.ts` の該当箇所を以下に置き換えます（`production-packs` ブロックは Part 2 で削除するため、ここでは**残したまま**直後に追記します）。

  変更前:

  ```ts
    {
      key: 'production-packs',
      title: 'パッケージ記録',
      description: '成功数と失敗数を記録',
    },
    {
      key: 'drip-guide',
      title: 'ドリップガイド',
      description: '淹れ方の手順',
    },
  ```

  変更後:

  ```ts
    {
      key: 'production-packs',
      title: 'パッケージ記録',
      description: '成功数と失敗数を記録',
    },
    {
      key: 'production-record',
      title: '生産記録',
      description: 'ハンドピック・焙煎・パッケージを記録',
    },
    {
      key: 'drip-guide',
      title: 'ドリップガイド',
      description: '淹れ方の手順',
    },
  ```

- [ ] **Step 2: 型エラーがないことを確認する**

  実行:

  ```
  npx tsc --noEmit
  ```

  期待: エラーなしで終了（exit code 0）。`HomeFeatureKey` に `'production-record'` が自動で含まれます。

- [ ] **Step 3: コミット**

  ```
  git add lib/homeFeatures.ts
  git commit -m "feat: ホーム機能リストに生産記録を追加"
  ```

---

### Task: ホーム画面のアクションカードに生産記録を追加 (page-action)

`app/page.tsx` の `ACTIONS` 配列に href とアイコンを持つカードを追加します。クリスマスモード用アイコンマッピング `CHRISTMAS_ICONS` にも対応するキーを追加します（漏れるとクリスマスモード時にデフォルトアイコンへフォールバックするだけで実害はありませんが、整合のため追加します）。

生産記録のアイコンは react-icons の `MdFactory`（工場アイコン＝製造記録の意）を使います。`MdInventory2` は既存のパッケージ記録が使用中のため重複を避けます。

**Files:**

- Modify: `D:\Dev\roastplus\app\page.tsx`

- [ ] **Step 1: `MdFactory` を react-icons からインポートする**

  `app/page.tsx` の既存 import 行を変更します。

  変更前:

  ```ts
  import { MdCoffeeMaker, MdInventory2 } from 'react-icons/md';
  ```

  変更後:

  ```ts
  import { MdCoffeeMaker, MdFactory, MdInventory2 } from 'react-icons/md';
  ```

- [ ] **Step 2: `ACTIONS` 配列に生産記録カードを追加する**

  `production-packs` カードの直後に追加します（`production-packs` カードは Part 2 で削除しますが、ここでは残したまま追記）。

  変更前:

  ```ts
    {
      key: 'production-packs',
      title: 'パッケージ記録',
      description: '成功数と失敗数を記録',
      href: '/production-packs',
      icon: MdInventory2,
    },
    {
      key: 'drip-guide',
      title: 'ドリップガイド',
      description: '淹れ方の手順',
      href: '/drip-guide',
      icon: MdCoffeeMaker,
    },
  ```

  変更後:

  ```ts
    {
      key: 'production-packs',
      title: 'パッケージ記録',
      description: '成功数と失敗数を記録',
      href: '/production-packs',
      icon: MdInventory2,
    },
    {
      key: 'production-record',
      title: '生産記録',
      description: 'ハンドピック・焙煎・パッケージを記録',
      href: '/production-record',
      icon: MdFactory,
    },
    {
      key: 'drip-guide',
      title: 'ドリップガイド',
      description: '淹れ方の手順',
      href: '/drip-guide',
      icon: MdCoffeeMaker,
    },
  ```

- [ ] **Step 3: クリスマスモードアイコンマッピングに `production-record` を追加する**

  変更前:

  ```ts
  const CHRISTMAS_ICONS: Record<string, IconType> = {
    assignment: FaGift,
    schedule: BsStars,
    tasting: FaTree,
    'defect-beans': GiGingerbreadMan,
    'production-packs': MdInventory2,
    'drip-guide': GiCandyCanes,
    settings: IoSettings,
  };
  ```

  変更後:

  ```ts
  const CHRISTMAS_ICONS: Record<string, IconType> = {
    assignment: FaGift,
    schedule: BsStars,
    tasting: FaTree,
    'defect-beans': GiGingerbreadMan,
    'production-packs': MdInventory2,
    'production-record': MdFactory,
    'drip-guide': GiCandyCanes,
    settings: IoSettings,
  };
  ```

- [ ] **Step 4: ホーム画面テストの可視キーリストに `production-record` を追加する**

  `app/page.test.tsx` の `beforeEach` 内で全機能を可視扱いにしている配列に `'production-record'` を追加します。これがないと「表示中の機能カード」のテスト前提が実際の `ACTIONS` とずれます。

  **Files:** Modify `D:\Dev\roastplus\app\page.test.tsx`

  変更前:

  ```ts
  ['assignment', 'schedule', 'tasting', 'defect-beans', 'production-packs', 'drip-guide', 'settings'].forEach((key) =>
    mocks.visibleKeys.add(key)
  );
  ```

  変更後:

  ```ts
  [
    'assignment',
    'schedule',
    'tasting',
    'defect-beans',
    'production-packs',
    'production-record',
    'drip-guide',
    'settings',
  ].forEach((key) => mocks.visibleKeys.add(key));
  ```

- [ ] **Step 5: ホーム画面テストを実行してPASSを確認する**

  実行:

  ```
  npx vitest run app/page.test.tsx
  ```

  期待: PASS（3 tests passed）。

- [ ] **Step 6: 手動確認**

  実行:

  ```
  npm run dev
  ```

  ブラウザで `http://localhost:3000/` を開き、ログイン後のホーム画面に「生産記録」カード（工場アイコン、説明「ハンドピック・焙煎・パッケージを記録」）が「パッケージ記録」と「ドリップガイド」の間に表示されることを確認します。カードをタップして `/production-record` に遷移し、生産記録ページが開くことを確認します。確認後、`Ctrl+C` で dev サーバーを停止します。

- [ ] **Step 7: コミット**

  ```
  git add app/page.tsx app/page.test.tsx
  git commit -m "feat: ホーム画面に生産記録への導線を追加"
  ```

---

> **ここから Part 2（既存パッケージ記録の削除）。生産記録機能が動作確認できてから実施する最終フェーズです。** 各削除タスクの最後で必ず `npm run build` と `npm run test:run` を流し、参照漏れ（削除したシンボルをまだ import している箇所）を検出します。

### Task: パッケージ記録ページとE2Eを削除 (delete-pages)

**Files:**

- Delete: `D:\Dev\roastplus\app\production-packs\page.tsx`
- Delete: `D:\Dev\roastplus\app\production-packs\monthly\page.tsx`
- Delete: `D:\Dev\roastplus\app\production-packs\page.test.tsx`
- Delete: `D:\Dev\roastplus\e2e\production-packs.spec.ts`
- Modify: `D:\Dev\roastplus\playwright.config.ts`

- [ ] **Step 1: パッケージ記録ページ群とE2Eスペックを削除する**

  実行（PowerShell）:

  ```powershell
  Remove-Item -Recurse -Force "D:\Dev\roastplus\app\production-packs"
  Remove-Item -Force "D:\Dev\roastplus\e2e\production-packs.spec.ts"
  ```

  `app\production-packs` ディレクトリ配下（`page.tsx` / `monthly\page.tsx` / `page.test.tsx`）がまとめて削除されます。

- [ ] **Step 2: `playwright.config.ts` の testMatch から production-packs を除去する**

  chromium プロジェクトの `testMatch` から `production-packs.spec.ts` を削除します。

  変更前:

  ```ts
      {
        name: 'chromium',
        testMatch: [/essential\.spec\.ts/, /production-packs\.spec\.ts/],
        use: {
  ```

  変更後:

  ```ts
      {
        name: 'chromium',
        testMatch: [/essential\.spec\.ts/],
        use: {
  ```

- [ ] **Step 3: 残り参照がないことを確認する**

  実行:

  ```
  npx tsc --noEmit
  ```

  期待: この時点では `lib/firestore/index.ts` などがまだ `productionPackRecords` を export しており、ページ削除自体では型エラーは出ません（ページは他から import されていないため）。エラーなしで終了（exit code 0）すれば次へ進みます。

- [ ] **Step 4: コミット**

  ```
  git add -A
  git commit -m "chore: パッケージ記録ページとE2Eを削除"
  ```

  （`git add -A` で削除されたファイルと `playwright.config.ts` の変更をまとめてステージします。）

---

### Task: パッケージ記録の純粋ロジック層を削除 (delete-lib-pure)

**Files:**

- Delete: `D:\Dev\roastplus\lib\productionPackRecords.ts`
- Delete: `D:\Dev\roastplus\lib\productionPackRecords.test.ts`

- [ ] **Step 1: 純粋ロジックファイルとそのテストを削除する**

  実行（PowerShell）:

  ```powershell
  Remove-Item -Force "D:\Dev\roastplus\lib\productionPackRecords.ts","D:\Dev\roastplus\lib\productionPackRecords.test.ts"
  ```

- [ ] **Step 2: この時点ではまだ削除しない（Firestore層が依存しているため）**

  `lib/firestore/productionPackRecords.ts` がこの純粋ロジックを import しているため、ここで `npx tsc --noEmit` を流すと参照エラーになります。次のタスク（Firestore層削除）まで一続きで進め、両方削除後にまとめてビルド・テストで検証します。コミットも次タスクと合わせて行います。

---

### Task: パッケージ記録のFirestore層と型を削除し re-export を除去 (delete-firestore-types)

**Files:**

- Delete: `D:\Dev\roastplus\lib\firestore\productionPackRecords.ts`
- Delete: `D:\Dev\roastplus\lib\firestore\productionPackRecords.test.ts`
- Delete: `D:\Dev\roastplus\types\production-pack-record.ts`
- Modify: `D:\Dev\roastplus\lib\firestore\index.ts`
- Modify: `D:\Dev\roastplus\types\index.ts`

- [ ] **Step 1: Firestore層ファイル・テスト・型定義を削除する**

  実行（PowerShell）:

  ```powershell
  Remove-Item -Force "D:\Dev\roastplus\lib\firestore\productionPackRecords.ts","D:\Dev\roastplus\lib\firestore\productionPackRecords.test.ts","D:\Dev\roastplus\types\production-pack-record.ts"
  ```

- [ ] **Step 2: `lib/firestore/index.ts` の re-export を除去する**

  `productionPackRecords` からの re-export ブロックをまるごと削除します。

  変更前:

  ```ts
  // lib/firestore barrel export
  // 既存の import { xxx } from '@/lib/firestore' を維持する
  export { getUserData, saveUserData, subscribeUserData, SAVE_USER_DATA_DEBOUNCE_MS } from './userData';
  export { getDefectBeanMasterData } from './defectBeans';
  export {
    RECENT_PRODUCTION_PACK_RECORDS_LIMIT,
    getProductionPackRecordsCollectionRef,
    getProductionPackRecordDocRef,
    getProductionPackRecordsByMonth,
    subscribeProductionPackRecord,
    subscribeRecentProductionPackRecords,
    saveProductionPackRecord,
    deleteProductionPackRecord,
  } from './productionPackRecords';
  ```

  変更後:

  ```ts
  // lib/firestore barrel export
  // 既存の import { xxx } from '@/lib/firestore' を維持する
  export { getUserData, saveUserData, subscribeUserData, SAVE_USER_DATA_DEBOUNCE_MS } from './userData';
  export { getDefectBeanMasterData } from './defectBeans';
  ```

  > 注: フェーズB（Firestore層実装）で `lib/firestore/index.ts` に `productionRecords`（新・生産記録）の re-export が追加されているはずです。その行は**削除しないでください**。ここで消すのは旧 `productionPackRecords`（複数形の Pack）の行だけです。

- [ ] **Step 3: `types/index.ts` の re-export を除去する**

  変更前:

  ```ts
  export * from './defect-beans';
  export * from './production-pack-record';
  ```

  変更後:

  ```ts
  export * from './defect-beans';
  ```

  > 注: フェーズで追加した `export * from './production-record';`（新・生産記録の型）は**残してください**。ここで消すのは `./production-pack-record`（ハイフン区切り・単数 record の旧型）だけです。

- [ ] **Step 4: ビルドで参照漏れを検出する**

  実行:

  ```
  npm run build
  ```

  期待: ビルド成功（`✓ Compiled successfully` 相当）。`productionPackRecords` / `ProductionPackRecord` 型を import している箇所が残っていれば、ここでビルドエラーになります。エラーが出た場合は、エラーメッセージのファイルパスを確認し、その参照を除去してから再実行します。

- [ ] **Step 5: 全テストで参照漏れを検出する**

  実行:

  ```
  npm run test:run
  ```

  期待: 全テスト PASS。削除したテストファイル（`lib/productionPackRecords.test.ts`、`lib/firestore/productionPackRecords.test.ts`、`app/production-packs/page.test.tsx`）が消えた分テスト数が減りますが、残るテストはすべて緑になります。`Cannot find module` 系のエラーが出たら参照漏れなので該当箇所を修正します。

- [ ] **Step 6: コミット**

  ```
  git add -A
  git commit -m "chore: パッケージ記録の純粋ロジック・Firestore層・型を削除"
  ```

---

### Task: ホーム導線からパッケージ記録を除去 (delete-nav)

生産記録(`production-record`)が代替として既に追加済みなので、旧パッケージ記録(`production-packs`)のホーム導線を除去します。

**Files:**

- Modify: `D:\Dev\roastplus\lib\homeFeatures.ts`
- Modify: `D:\Dev\roastplus\app\page.tsx`
- Modify: `D:\Dev\roastplus\app\page.test.tsx`

- [ ] **Step 1: `lib/homeFeatures.ts` から `production-packs` エントリを削除する**

  変更前:

  ```ts
    {
      key: 'production-packs',
      title: 'パッケージ記録',
      description: '成功数と失敗数を記録',
    },
    {
      key: 'production-record',
      title: '生産記録',
      description: 'ハンドピック・焙煎・パッケージを記録',
    },
  ```

  変更後:

  ```ts
    {
      key: 'production-record',
      title: '生産記録',
      description: 'ハンドピック・焙煎・パッケージを記録',
    },
  ```

- [ ] **Step 2: `app/page.tsx` の `ACTIONS` から `production-packs` カードを削除する**

  変更前:

  ```ts
    {
      key: 'production-packs',
      title: 'パッケージ記録',
      description: '成功数と失敗数を記録',
      href: '/production-packs',
      icon: MdInventory2,
    },
    {
      key: 'production-record',
      title: '生産記録',
      description: 'ハンドピック・焙煎・パッケージを記録',
      href: '/production-record',
      icon: MdFactory,
    },
  ```

  変更後:

  ```ts
    {
      key: 'production-record',
      title: '生産記録',
      description: 'ハンドピック・焙煎・パッケージを記録',
      href: '/production-record',
      icon: MdFactory,
    },
  ```

- [ ] **Step 3: `app/page.tsx` のクリスマスアイコンマッピングと未使用 import を整理する**

  `production-packs` キーが消えたので `CHRISTMAS_ICONS` の該当行を削除します。

  変更前:

  ```ts
    'defect-beans': GiGingerbreadMan,
    'production-packs': MdInventory2,
    'production-record': MdFactory,
    'drip-guide': GiCandyCanes,
  ```

  変更後:

  ```ts
    'defect-beans': GiGingerbreadMan,
    'production-record': MdFactory,
    'drip-guide': GiCandyCanes,
  ```

  この変更で `MdInventory2` がどこからも使われなくなるため、import 行から除去します（未使用 import は Lint エラーになる）。

  変更前:

  ```ts
  import { MdCoffeeMaker, MdFactory, MdInventory2 } from 'react-icons/md';
  ```

  変更後:

  ```ts
  import { MdCoffeeMaker, MdFactory } from 'react-icons/md';
  ```

- [ ] **Step 4: `app/page.test.tsx` の可視キーリストから `production-packs` を除去する**

  変更前:

  ```ts
  [
    'assignment',
    'schedule',
    'tasting',
    'defect-beans',
    'production-packs',
    'production-record',
    'drip-guide',
    'settings',
  ].forEach((key) => mocks.visibleKeys.add(key));
  ```

  変更後:

  ```ts
  ['assignment', 'schedule', 'tasting', 'defect-beans', 'production-record', 'drip-guide', 'settings'].forEach((key) =>
    mocks.visibleKeys.add(key)
  );
  ```

- [ ] **Step 5: ビルドとテストで確認する**

  実行:

  ```
  npm run build
  npm run test:run
  ```

  期待: ビルド成功、全テスト PASS。`production-packs` が `ACTIONS` から消え、`MdInventory2` の未使用 import も解消されているため Lint エラーも出ません。

- [ ] **Step 6: 手動確認**

  実行:

  ```
  npm run dev
  ```

  `http://localhost:3000/` のホーム画面に「パッケージ記録」カードが表示されず、「生産記録」カードのみが表示されることを確認します。`/production-packs` を直接 URL で開くと 404 になることも確認します。確認後 `Ctrl+C` で停止します。

- [ ] **Step 7: コミット**

  ```
  git add lib/homeFeatures.ts app/page.tsx app/page.test.tsx
  git commit -m "chore: ホーム導線からパッケージ記録を除去"
  ```

---

### Task: firestore.rules とルールテストからパッケージ記録を除去 (delete-rules)

ルール変更は TDD で進めます（ルールテストを先に直し、FAIL → ルール修正 → PASS）。ルールテストは emulator が必要なため、実行コマンドはプロジェクトの既存手順に従います（下記 Step 内に記載）。

**Files:**

- Modify: `D:\Dev\roastplus\tests\rules\firebase.rules.test.ts`
- Modify: `D:\Dev\roastplus\firestore.rules`

- [ ] **Step 1: ルールテストから productionPackRecords の describe ブロックを削除する**

  `tests/rules/firebase.rules.test.ts` の以下のブロック（103〜129行目）をまるごと削除します。

  削除対象:

  ```ts
  describe('users/{uid}/productionPackRecords/{workDate}', () => {
    it('allows only the signed-in owner to read and write production pack records', async () => {
      const path = `users/${OWN_UID}/productionPackRecords/2026-05-24`;
      const ownerDoc = firestoreFor(OWN_UID).doc(path);
      const otherDoc = firestoreFor(OTHER_UID).doc(path);
      const anonymousDoc = firestoreFor().doc(path);
      const record = {
        workDate: '2026-05-24',
        teamA: { successCount: 10, failureCount: 1 },
        teamB: { successCount: 20, failureCount: 2 },
        successTotal: 30,
        failureTotal: 3,
        total: 33,
      };

      await assertFails(anonymousDoc.get());
      await assertFails(anonymousDoc.set(record));

      await assertSucceeds(ownerDoc.set(record));
      await assertSucceeds(ownerDoc.get());

      await assertFails(otherDoc.get());
      await assertFails(otherDoc.set(record));
      await assertFails(otherDoc.delete());
      await assertSucceeds(ownerDoc.delete());
    });
  });
  ```

  > 注: フェーズで `productionRecords`（新・生産記録）のルールテストが追加されているはずです。それは**残してください**。ここで消すのは `productionPackRecords`（複数形 Pack）の describe だけです。

- [ ] **Step 2: ルールテストを実行して、削除したテストが消えたことを確認する**

  実行（プロジェクトのルールテスト手順に従う。Firebase emulator 経由）:

  ```
  npx vitest run tests/rules/firebase.rules.test.ts
  ```

  期待: PASS。`productionPackRecords` の describe が消えた分テスト件数が1つ減ります。この時点では `firestore.rules` にまだ旧ルール行が残っていますが、テストは存在するルール（owner isolation）を壊さない限り PASS します。

  > emulator 未起動でテストが接続エラーになる場合は、`firebase emulators:exec --only firestore "npx vitest run tests/rules/firebase.rules.test.ts"` のようにプロジェクトの既存ルールテスト実行手順を使ってください。

- [ ] **Step 3: `firestore.rules` から productionPackRecords ルールを削除する**

  変更前:

  ```
      match /users/{userId}/pairExclusions/{exclusionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /users/{userId}/productionPackRecords/{workDate} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /users/{userId}/_meta/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
  ```

  変更後:

  ```
      match /users/{userId}/pairExclusions/{exclusionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /users/{userId}/_meta/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
  ```

  > 注: フェーズで追加された `match /users/{userId}/productionRecords/{document=**} { ... }`（新・生産記録）のルールは**残してください**。ここで消すのは `productionPackRecords/{workDate}` の行だけです。

- [ ] **Step 4: ルールテストを再実行してPASSを確認する**

  実行:

  ```
  npx vitest run tests/rules/firebase.rules.test.ts
  ```

  期待: 全テスト PASS。旧ルールを削除しても、残るテスト（owner isolation、新・生産記録のルール）はすべて緑です。

- [ ] **Step 5: コミット**

  ```
  git add tests/rules/firebase.rules.test.ts firestore.rules
  git commit -m "chore: firestore.rulesとルールテストからパッケージ記録を除去"
  ```

---

### Task: 削除完了の最終検証とコミット前チェック (final-verify)

すべての削除が反映され、参照漏れ・format 漏れがないことを最終確認します。

**Files:**

- （検証のみ。新規変更がなければコミット不要）

- [ ] **Step 1: 旧シンボルの残存参照がゼロであることを確認する**

  Grep で `productionPackRecords` / `production-pack-record` / `production-packs` / `ProductionPackRecord` を全文検索し、ヒットが**ソースコード（`*.ts` / `*.tsx`）には存在しない**ことを確認します（`.next/` などビルド成果物のヒットは無視。気になる場合は `npm run build` で再生成されるため問題なし）。

  実行:

  ```
  npx vitest run
  npm run build
  ```

  期待: ビルド成功・全テスト PASS（`Cannot find module` や型エラーが出ない＝参照漏れなし）。

- [ ] **Step 2: コミット前チェック（build / test / format）を通す**

  実行:

  ```
  npm run build
  npm run test:run
  npm run format:check
  ```

  期待: 3つともエラーなしで完了。`format:check` で差分が出た場合は `npm run format` を実行してから、整形差分を `git add -A` して追加コミット（`style: 削除後のフォーマット整形`）します（format 漏れは CI の Format ジョブで落ちる既知の落とし穴のため必須）。

- [ ] **Step 3: Firestore 旧データの手動削除に関する注記（実装作業なし）**

  Firestore 上に残る `users/{uid}/productionPackRecords/*` のドキュメントは、本タスクでは**削除しません**（本番影響があるため計画外）。仕様書の前提どおり旧パッケージ記録には過去の業務データがない見込みですが、念のため Firestore コンソールまたは管理スクリプトで残存ドキュメントの有無を確認し、不要であればユーザー（IK）が手動で削除してください。コードからの参照は本フェーズですべて除去済みのため、データが残っていてもアプリの動作には影響しません。

---

実装計画の Part F は以上です。ファイルパスはすべて契約の「ファイル構造」に一致させ、新・生産記録(`productionRecords` / `production-record`)のシンボルを誤って削除しないよう各削除ステップに注記を入れてあります。

関連ファイル（参照・編集対象）の絶対パス:

- `D:\Dev\roastplus\lib\homeFeatures.ts`
- `D:\Dev\roastplus\app\page.tsx`
- `D:\Dev\roastplus\app\page.test.tsx`
- `D:\Dev\roastplus\lib\firestore\index.ts`
- `D:\Dev\roastplus\types\index.ts`
- `D:\Dev\roastplus\firestore.rules`
- `D:\Dev\roastplus\tests\rules\firebase.rules.test.ts`
- `D:\Dev\roastplus\playwright.config.ts`
- 削除対象: `D:\Dev\roastplus\app\production-packs\`（配下3ファイル）, `D:\Dev\roastplus\e2e\production-packs.spec.ts`, `D:\Dev\roastplus\lib\productionPackRecords.ts`(+`.test.ts`), `D:\Dev\roastplus\lib\firestore\productionPackRecords.ts`(+`.test.ts`), `D:\Dev\roastplus\types\production-pack-record.ts`

注記（統合担当向け）: 契約のファイル構造には明記されていませんでしたが、`app/page.test.tsx` が機能キー配列をハードコードで持っているため、導線追加・削除の両方でこのテストの更新ステップを含めました（更新しないとホーム画面テストが実際の `ACTIONS` とずれて失敗します）。アイコンは `MdInventory2` が既存パッケージ記録で使用中のため、生産記録には `MdFactory`(react-icons/md) を採用しました。
