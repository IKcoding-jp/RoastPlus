export interface DripStep {
  id: string;
  startTimeSec: number;
  title: string;
  description: string;
  targetTotalWater?: number;
  note?: string;
}

export interface DripRecipe {
  id: string;
  name: string;
  beanName: string;
  beanAmountGram: number;
  totalWaterGram: number;
  totalDurationSec: number;
  purpose?: string;
  description?: string;
  steps: DripStep[];
  createdAt?: string;
  updatedAt?: string;
  isDefault?: boolean; // デフォルトレシピは削除不可
  isManualMode?: boolean; // 手動モード（時間が不確定なレシピ用）
  /**
   * 1人前基準の線形倍率では表せない非線形の粉量を、人数別(1〜8人前)で持つ。
   * index 0 = 1人前 ... index 7 = 8人前。
   * 指定があるレシピだけ非線形スケーリングを使う。未指定なら従来の線形倍率。
   */
  beanAmountByServings?: number[];
}
