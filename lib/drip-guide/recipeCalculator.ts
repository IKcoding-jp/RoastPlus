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

  // 1人前基準のレシピに対して、人前倍率を適用
  const multiplier = servings;

  // 非線形の粉量テーブルがある場合（BYSN等）: 粉量はテーブル参照、蒸らし湯=粉量、注湯は線形
  const tableBeans = recipe.beanAmountByServings?.[servings - 1];
  if (tableBeans !== undefined) {
    // 基準湯量は元レシピの粉量（=1人前の蒸らし湯）。steps[0]に依存させない＝準備手順を足しても安全
    const steepBase = recipe.beanAmountGram;

    const nonLinearSteps: DripStep[] = recipe.steps.map((step) => ({
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
      steps: nonLinearSteps,
    };
  }

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
