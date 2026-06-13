'use client';

import React from 'react';
import { DripRecipe } from '@/lib/drip-guide/types';
import { RecipeStepTable } from '../shared/RecipeStepTable';

interface Dialog46PreviewProps {
  recipe: DripRecipe;
}

const formatDuration = (totalSec: number): string => {
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec === 0 ? `約${min}分` : `約${min}分${sec}秒`;
};

export const Dialog46Preview: React.FC<Dialog46PreviewProps> = ({ recipe }) => {
  return (
    <div>
      <p className="font-num text-5xl font-bold leading-none tracking-tight text-ink tabular-nums">
        {recipe.totalWaterGram}
        <span className="text-2xl font-semibold text-spot">g</span>
      </p>
      <p className="mt-2 text-xs tracking-[0.06em] text-ink-muted">
        総湯量 ・ 豆 {recipe.beanAmountGram}g ・ {formatDuration(recipe.totalDurationSec)}
      </p>
      <div className="mt-4">
        <RecipeStepTable steps={recipe.steps} showPourAmount={true} />
      </div>
    </div>
  );
};
