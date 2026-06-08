# BYSN Standard Drip 作り替え Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BYSN Standard Drip を公式レシピ（`docs/guides/coffee-brewing-guide.md`）に準拠させる——人数スケーリングを公式早見表どおりにし、抽出前の準備手順を追加する。

**Architecture:** `DripRecipe` に任意フィールド `beanAmountByServings?: number[]` を追加。`calculateRecipeForServings` はこのフィールドがあるレシピだけ非線形スケーリングを使い、無いレシピ（4:6・井崎流・アイス）は従来の線形のまま。BYSN のレシピデータ（`mockData.ts`）に公式早見表の粉量と準備手順4ステップを追加する。

**Tech Stack:** TypeScript / Next.js（App Router）/ Vitest / Tailwind v4。テストランナーは `npx vitest run`。

**設計書:** `docs/superpowers/specs/2026-06-09-bysn-standard-drip-rework-design.md`

---

## File Structure

| ファイル | 責務 | 変更種別 |
|---|---|---|
| `lib/drip-guide/types.ts` | `DripRecipe` に `beanAmountByServings?` 追加 | Modify |
| `lib/drip-guide/recipeCalculator.ts` | 非線形スケーリング分岐 | Modify |
| `lib/drip-guide/recipeCalculator.test.ts` | 非線形スケーリングのテスト | Modify |
| `lib/drip-guide/mockData.ts` | BYSN に早見表＋準備手順を追加 | Modify |
| `lib/drip-guide/mockData.test.ts` | BYSN の構造テスト | Modify |
| `docs/steering/FEATURES.md` | BYSN スケーリング仕様の追記 | Modify |

**他レシピ（4:6・井崎流・アイス）と Runner / 表示コンポーネント / StartHintDialog は変更しない**（`beanAmountByServings` 未指定で挙動不変。準備手順は既存の手動モード表示でそのまま描画される）。

---

## Task 1: 型に `beanAmountByServings` を追加し、calculator を非線形対応にする

**Files:**
- Modify: `lib/drip-guide/types.ts`
- Modify: `lib/drip-guide/recipeCalculator.ts`
- Test: `lib/drip-guide/recipeCalculator.test.ts`

- [ ] **Step 1: 型に任意フィールドを追加する**

`lib/drip-guide/types.ts` の `DripRecipe` インターフェース末尾（`isManualMode` の次）に追加：

```ts
  isManualMode?: boolean; // 手動モード（時間が不確定なレシピ用）
  /**
   * 1人前基準の線形倍率では表せない非線形の粉量を、人数別(1〜8人前)で持つ。
   * index 0 = 1人前 ... index 7 = 8人前。
   * 指定があるレシピだけ非線形スケーリングを使う。未指定なら従来の線形倍率。
   */
  beanAmountByServings?: number[];
```

- [ ] **Step 2: 失敗するテストを書く**

`lib/drip-guide/recipeCalculator.test.ts` の `describe('calculateRecipeForServings', ...)` ブロック内、最後の `it('元のレシピは変更されない', ...)` の後（`});` で describe が閉じる直前）に追記：

```ts
  describe('beanAmountByServings がある非線形スケーリング', () => {
    // BYSN を模した1人前基準レシピ（蒸らし湯=粉量10g、注湯 90/40/20 を累計で表現）
    const bysnLike: DripRecipe = {
      id: 'recipe-bysn-like',
      name: 'BYSN風',
      beanName: 'テスト豆',
      beanAmountGram: 10,
      totalWaterGram: 160,
      totalDurationSec: 180,
      isManualMode: true,
      beanAmountByServings: [10, 20, 25, 35, 40, 45, 50, 55],
      steps: [
        { id: 'prep-1', startTimeSec: -40, title: 'お湯を92度に準備', description: 'ケトル設定' },
        { id: 'step-1', startTimeSec: 0, title: '蒸らし', description: '蒸らし', targetTotalWater: 10 },
        { id: 'step-2', startTimeSec: 20, title: '1投目', description: '1投目', targetTotalWater: 100 },
        { id: 'step-3', startTimeSec: 95, title: '2投目', description: '2投目', targetTotalWater: 140 },
        { id: 'step-4', startTimeSec: 110, title: '3投目', description: '3投目', targetTotalWater: 160 },
      ],
    };

    it('3人前 → 粉25g（線形の30gではない）', () => {
      const result = calculateRecipeForServings(bysnLike, 3);
      expect(result.beanAmountGram).toBe(25);
    });

    it('3人前 → 蒸らし=粉量・注湯は累計 25/295/415/475、準備手順は未指定のまま', () => {
      const result = calculateRecipeForServings(bysnLike, 3);
      expect(result.steps.map((s) => s.targetTotalWater)).toEqual([undefined, 25, 295, 415, 475]);
    });

    it('3人前 → 総湯量は最終注湯ステップの累計と一致する(475)', () => {
      const result = calculateRecipeForServings(bysnLike, 3);
      const lastWater = result.steps[result.steps.length - 1].targetTotalWater;
      expect(result.totalWaterGram).toBe(475);
      expect(result.totalWaterGram).toBe(lastWater);
    });

    it('8人前 → 粉55g・注湯累計 55/775/1095/1255・総湯量1255', () => {
      const result = calculateRecipeForServings(bysnLike, 8);
      expect(result.beanAmountGram).toBe(55);
      expect(result.steps.map((s) => s.targetTotalWater)).toEqual([undefined, 55, 775, 1095, 1255]);
      expect(result.totalWaterGram).toBe(1255);
    });

    it('beanAmountByServings が無いレシピは従来の線形のまま', () => {
      const result = calculateRecipeForServings(baseRecipe, 3);
      expect(result.beanAmountGram).toBe(45); // 15 * 3（線形）
      expect(result.totalWaterGram).toBe(750);
    });
  });
```

- [ ] **Step 3: テストを実行して失敗を確認する**

Run: `npx vitest run lib/drip-guide/recipeCalculator.test.ts`
Expected: FAIL（3人前で `beanAmountGram` が 30、ステップ累計が線形値になり、新規 describe の各 it が落ちる）

- [ ] **Step 4: calculator に非線形分岐を実装する**

`lib/drip-guide/recipeCalculator.ts` の import 行を確認（`DripRecipe, DripStep` が import 済み）。`calculateRecipeForServings` の `if (servings === 1) { return recipe; }` の直後に、線形計算の前へ非線形分岐を挿入する。最終形は以下：

```ts
import { DripRecipe, DripStep } from './types';

/**
 * 人前に応じてレシピを計算する
 * 重要: この関数は1人前基準のレシピを受け取り、指定された人前数に応じて計算します。
 * 例: 1人前基準のレシピ（蒸らし10g）を2人前にすると、蒸らし20gになります。
 *
 * beanAmountByServings がある場合は、公式早見表どおりの非線形な粉量を使い、
 * 蒸らし湯=粉量・注湯は線形として各ステップの累計を再計算する。
 *
 * @param recipe 元のレシピ（1人前基準）
 * @param servings 人前数（1-8）
 * @returns 計算済みのレシピ
 */
export function calculateRecipeForServings(recipe: DripRecipe, servings: number): DripRecipe {
  // 人前が1の場合は元のレシピ（1人前基準）をそのまま返す
  if (servings === 1) {
    return recipe;
  }

  const multiplier = servings;

  // 非線形の粉量テーブルがある場合（BYSN等）
  const beanTable = recipe.beanAmountByServings;
  const tableBeans = beanTable?.[servings - 1];
  if (tableBeans !== undefined) {
    // 蒸らし湯 = 粉量。基準湯量は元レシピの粉量（steps[0]に依存させない＝準備手順を足しても安全）
    const steepBase = recipe.beanAmountGram;

    const calculatedSteps: DripStep[] = recipe.steps.map((step) => ({
      ...step,
      targetTotalWater:
        step.targetTotalWater !== undefined
          ? Math.round(tableBeans + (step.targetTotalWater - steepBase) * multiplier)
          : undefined,
    }));

    return {
      ...recipe,
      beanAmountGram: tableBeans,
      totalWaterGram: Math.round(tableBeans + (recipe.totalWaterGram - steepBase) * multiplier),
      steps: calculatedSteps,
    };
  }

  // 1人前基準のレシピに対して、人前倍率を適用（従来の線形スケーリング）
  // 豆の量を計算（整数に丸める）
  const calculatedBeanAmountGram = Math.round(recipe.beanAmountGram * multiplier);

  // 総湯量を計算（整数に丸める）
  const calculatedTotalWaterGram = Math.round(recipe.totalWaterGram * multiplier);

  // 各ステップの目標湯量を計算
  const calculatedSteps: DripStep[] = recipe.steps.map((step) => ({
    ...step,
    targetTotalWater: step.targetTotalWater ? Math.round(step.targetTotalWater * multiplier) : undefined,
  }));

  return {
    ...recipe,
    beanAmountGram: calculatedBeanAmountGram,
    totalWaterGram: calculatedTotalWaterGram,
    steps: calculatedSteps,
  };
}
```

- [ ] **Step 5: テストを実行して成功を確認する**

Run: `npx vitest run lib/drip-guide/recipeCalculator.test.ts`
Expected: PASS（既存テスト＋新規 describe の全 it が通る）

- [ ] **Step 6: コミット**

```bash
git add lib/drip-guide/types.ts lib/drip-guide/recipeCalculator.ts lib/drip-guide/recipeCalculator.test.ts
git commit -m "feat(drip-guide): 公式早見表に沿った非線形の人数スケーリングを追加"
```

---

## Task 2: BYSN のレシピデータを公式準拠にする（早見表＋準備手順）

**Files:**
- Modify: `lib/drip-guide/mockData.ts:6-61`（`recipe-001` BYSN）
- Test: `lib/drip-guide/mockData.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`lib/drip-guide/mockData.test.ts` の末尾（最後の `});` の後）に新しい describe ブロックを追記：

```ts
describe('MOCK_RECIPES BYSN Standard Drip', () => {
  const bysn = MOCK_RECIPES.find((r) => r.id === 'recipe-001');

  it('レシピが存在し、手動モードのデフォルトレシピ', () => {
    expect(bysn).toBeDefined();
    expect(bysn?.isManualMode).toBe(true);
    expect(bysn?.isDefault).toBe(true);
  });

  it('公式早見表の粉量(1〜8人前)を持つ', () => {
    expect(bysn?.beanAmountByServings).toEqual([10, 20, 25, 35, 40, 45, 50, 55]);
  });

  it('準備4手順＋抽出5手順の計9ステップ', () => {
    expect(bysn?.steps).toHaveLength(9);
  });

  it('先頭4つは準備手順で、湯量を持たない', () => {
    const prep = bysn?.steps.slice(0, 4) ?? [];
    expect(prep.map((s) => s.title)).toEqual([
      'お湯を92度に準備',
      'ペーパーをセット',
      'ドリッパーを温める',
      '粉をセット',
    ]);
    expect(prep.every((s) => s.targetTotalWater === undefined)).toBe(true);
  });

  it('準備手順は蒸らし(0秒)より前にソートされる開始時刻を持つ', () => {
    const prep = bysn?.steps.slice(0, 4) ?? [];
    expect(prep.map((s) => s.startTimeSec)).toEqual([-40, -30, -20, -10]);
  });

  it('抽出ステップの累計湯量は 10/100/140/160（公式どおり）', () => {
    const brewing = bysn?.steps.slice(4) ?? [];
    expect(brewing.map((s) => s.targetTotalWater)).toEqual([10, 100, 140, 160, undefined]);
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npx vitest run lib/drip-guide/mockData.test.ts`
Expected: FAIL（`beanAmountByServings` が undefined、ステップ数が5、準備手順が無い）

- [ ] **Step 3: BYSN のレシピデータを書き換える**

`lib/drip-guide/mockData.ts` の `recipe-001`（先頭オブジェクト、6〜61行目）を以下で置き換える。`beanAmountByServings` を追加し、`steps` 配列の先頭に準備4手順を足す（既存の抽出5ステップは内容変更なし・配列順はそのまま後ろに残す）：

```ts
  // BYSN Standard Drip (細く中心に注ぐスタイル) - 1人前基準
  {
    id: 'recipe-001',
    name: 'BYSN Standard Drip',
    beanName: 'BYSNドリップパック',
    beanAmountGram: 10,
    totalWaterGram: 160,
    totalDurationSec: 180,
    purpose: '試飲会用スタンダード',
    description:
      'できるだけお湯を細く、中心に１円玉くらいの円を描きながら注ぐ淹れ方。丁寧な抽出で酸味と甘みのバランスを引き出します。',
    createdAt: '2023-10-27T10:00:00Z',
    updatedAt: '2023-10-27T10:00:00Z',
    isDefault: true,
    isManualMode: true,
    beanAmountByServings: [10, 20, 25, 35, 40, 45, 50, 55],
    steps: [
      {
        id: 'prep-1',
        startTimeSec: -40,
        title: 'お湯を92度に準備',
        description: '温度調節ケトルでお湯を92度に設定します。',
      },
      {
        id: 'prep-2',
        startTimeSec: -30,
        title: 'ペーパーをセット',
        description: '円錐ペーパーの側面の圧着部（縫い目）を折り、ドリッパーにぴったり沿わせます。',
      },
      {
        id: 'prep-3',
        startTimeSec: -20,
        title: 'ドリッパーを温める',
        description:
          'お湯を回しかけてドリッパーとサーバーを温め、ペーパーのにおいを流します。温めると抽出温度が安定します。お湯は捨てます。',
        note: '温めたお湯は必ず捨てる',
      },
      {
        id: 'prep-4',
        startTimeSec: -10,
        title: '粉をセット',
        description: '人数分の粉を入れ、ドリッパーの下部を持って軽く左右に揺らし、表面を平らにならします。',
        note: '表面が平らだとお湯が均一に通る',
      },
      {
        id: 'step-1',
        startTimeSec: 0,
        title: '蒸らし',
        description: '粉全体にまんべんなくお湯を注いで均一に湿らせます。20秒蒸らします。',
        targetTotalWater: 10,
        note: '粉全体が均一に膨らむのを確認',
      },
      {
        id: 'step-2',
        startTimeSec: 20,
        title: '1投目',
        description: 'できるだけ細く、中心に１円玉くらいの円を描きながらゆっくり注ぎます。',
        targetTotalWater: 100,
        note: '注湯スピードは一定に保つ',
      },
      {
        id: 'step-3',
        startTimeSec: 95,
        title: '2投目',
        description: '同様に細く、中心に１円玉くらいの円を描きながら注ぎ足します。',
        targetTotalWater: 140,
        note: '水位が下がりすぎないタイミングで',
      },
      {
        id: 'step-4',
        startTimeSec: 110,
        title: '3投目',
        description: '最後まで細く丁寧に、中心に１円玉くらいの円を描きながら注ぎきります。',
        targetTotalWater: 160,
        note: '最後まで一定のスピードで',
      },
      {
        id: 'step-5',
        startTimeSec: 145,
        title: '落ち切り待ち',
        description: 'ドリッパーからお湯が完全に落ち切るのを待ちます。',
        note: '目標抽出時間: 3分秒前後',
      },
    ],
  },
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `npx vitest run lib/drip-guide/mockData.test.ts`
Expected: PASS（新規 BYSN describe ＋ 既存アイスコーヒーの describe が全て通る）

- [ ] **Step 5: ドリップガイド関連テストをまとめて実行する**

Run: `npx vitest run lib/drip-guide`
Expected: PASS（calculator・mockData・recipe46 など全て）

- [ ] **Step 6: コミット**

```bash
git add lib/drip-guide/mockData.ts lib/drip-guide/mockData.test.ts
git commit -m "feat(drip-guide): BYSNに公式早見表の粉量と準備手順4ステップを追加"
```

---

## Task 3: ドキュメント（FEATURES.md）を更新し docs:check を通す

**Files:**
- Modify: `docs/steering/FEATURES.md:299-301`

- [ ] **Step 1: FEATURES.md のレシピ計算セクションを更新する**

`docs/steering/FEATURES.md` の「#### レシピ計算」ブロック（299〜301行目あたり）を以下に更新。BYSN が公式早見表で非線形にスケールする旨を1行足す：

```markdown
#### レシピ計算
- **4:6メソッド**: `lib/drip-guide/recipe46.ts` で計算ロジック実装
- **スケーリング**: 人前（servings）に応じて豆量・湯量を調整（`lib/drip-guide/recipeCalculator.ts`）
- **BYSN Standard Drip の非線形スケーリング**: 公式早見表どおりの粉量を `beanAmountByServings`（1〜8人前）で持ち、線形倍率ではなくテーブル参照でスケールする。注湯量は線形（公式と一致）、蒸らし湯は粉量に連動。
```

- [ ] **Step 2: docs:check を実行する**

Run: `npm run docs:check`
Expected: PASS（不整合候補が出たら、出力を見て現行仕様に合わせて FEATURES.md を追記修正し、再実行して PASS させる）

- [ ] **Step 3: コミット**

```bash
git add docs/steering/FEATURES.md
git commit -m "docs(steering): BYSNの公式早見表スケーリングをFEATURESに追記"
```

---

## Task 4: 全体検証（完了ゲート）

**Files:** なし（検証のみ）

- [ ] **Step 1: テスト一式を実行する**

Run: `npx vitest run`
Expected: PASS（全テスト）

- [ ] **Step 2: ローカル検証一式（型・lint・format）を実行する**

Run: `npm run format:check` と、プロジェクトの検証スクリプト（`package.json` の `scripts` を確認し、`lint` / `typecheck` 等があれば実行）
Expected: いずれも PASS。`format:check` で差分が出たら `npm run format` で整形して再確認。

- [ ] **Step 3: 開発サーバーで iPad 幅の目視確認をする**

Run: `npm run dev`（別ターミナル）。chrome-devtools MCP で iPad 幅にエミュレートし、ドリップガイド → BYSN を開く。確認項目：
  - 人前を 1 / 2 / 3 / 8 に切り替え、開始ダイアログの総湯量と各画面の粉量・累計湯量が公式どおりか（3人前=粉25g・総475g、8人前=粉55g・総1255g）。
  - ガイド開始後、準備1〜準備4 →蒸らし→1〜3投目→落ち切り の順に「次へ」で進めること。準備手順では湯量ブロックが出ず、説明文が読めること。
  - スクリーンショットを撮って目視確認する。

- [ ] **Step 4: 他レシピの非回帰を確認する**

ドリップガイドで 4:6メソッド・井崎流・アイスコーヒーを 3人前で開き、粉量が従来どおり（線形）であることを確認（例：井崎流 1人前10g → 3人前30g のまま）。

- [ ] **Step 5: 完了報告**

すべてのチェックがパスし、目視確認のスクリーンショットを添えて完了を報告する。マージ・PR はユーザーの明示依頼があるときのみ。

---

## Self-Review（計画作成者によるチェック結果）

- **Spec coverage:** 設計①（スケーリング修正）= Task 1+2、設計②（準備手順）= Task 2、テスト方針 = Task 1/2/4、完了条件（テスト・docs:check・format:check・iPad目視・他レシピ非回帰）= Task 3/4。すべて対応するタスクあり。
- **Placeholder scan:** TODO/TBD・「適切に処理」等の曖昧表現なし。各コードステップは実コードを記載。
- **Type consistency:** `beanAmountByServings: number[]`、`steepBase = recipe.beanAmountGram`、関数名 `calculateRecipeForServings`、ステップ id（`prep-1`〜`prep-4` / `step-1`〜`step-5`）は全タスクで一致。検算値（3人前 25/295/415/475・総475、8人前 55/775/1095/1255・総1255）は spec の検算表と一致。
