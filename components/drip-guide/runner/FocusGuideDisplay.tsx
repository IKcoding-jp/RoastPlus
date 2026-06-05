'use client';

import React from 'react';
import { formatTime } from '@/lib/drip-guide/formatTime';
import type { DripStep } from '@/lib/drip-guide/types';

interface FocusGuideDisplayProps {
  currentTime: number;
  recipeName: string;
  currentStep: DripStep | null;
  currentStepIndex: number;
  totalSteps: number;
}

function splitStepTitle(title: string): { mainTitle: string; detail?: string } {
  const match = title.match(/^(.+?)[（(](.+)[）)]$/);

  if (!match) {
    return { mainTitle: title };
  }

  return {
    mainTitle: match[1],
    detail: match[2],
  };
}

function WaterTarget({ targetTotalWater }: { targetTotalWater?: number }) {
  if (!targetTotalWater) {
    return null;
  }

  return (
    <div className="text-center" data-testid="drip-current-water">
      <div className="flex items-baseline justify-center gap-2">
        <span className="text-[7rem] lg:text-[7.25rem] font-extrabold leading-none text-spot tabular-nums font-nunito">
          {targetTotalWater}
        </span>
        <span className="text-[2rem] font-extrabold text-spot/65">g</span>
      </div>
      <p className="-mt-1 text-2xl font-extrabold text-ink">まで注ぐ</p>
    </div>
  );
}

export const FocusGuideDisplay: React.FC<FocusGuideDisplayProps> = ({ currentTime, recipeName, currentStep, currentStepIndex, totalSteps}) => {
  if (!currentStep) {
    return (
      <div
        data-testid="drip-focus-display"
        className="w-full max-w-md mx-auto text-center text-ink-muted text-base py-4"
      >
        準備ができたら
        <br />
        スタートボタンを押してください
      </div>
    );
  }

  const { mainTitle, detail } = splitStepTitle(currentStep.title);

  return (
    <div
      data-testid="drip-focus-display"
      className="w-full max-w-md lg:max-w-5xl mx-auto lg:h-full lg:flex lg:items-center"
    >
      {/* Smartphone portrait: quick-glance stacked layout */}
      <div className="w-full space-y-7 lg:hidden">
        <section className="rounded-lg bg-surface border border-edge px-4 py-3 shadow-card flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-ink-muted truncate">{recipeName}</p>
              <p className="text-xs font-bold text-ink-muted">{currentStepIndex + 1} / {totalSteps}</p>
            </div>
            <h2 className="text-[1.7rem] font-extrabold leading-tight text-ink mt-0.5">{mainTitle}</h2>
            {detail && <p className="mt-0.5 text-sm font-bold leading-tight text-ink-muted">{detail}</p>}
          </div>
          <div className="text-[2.75rem] font-extrabold leading-none text-ink tabular-nums font-nunito">
            {formatTime(currentTime)}
          </div>
        </section>

        <section className="min-h-[360px] rounded-lg bg-surface border border-edge px-6 py-8 shadow-card text-center flex flex-col justify-center">
          <WaterTarget targetTotalWater={currentStep.targetTotalWater} />
          <p className="mt-8 text-[1.4rem] font-extrabold leading-relaxed text-ink">{currentStep.description}</p>
          {currentStep.note && (
            <p className="mt-5 text-lg font-semibold leading-relaxed text-ink-sub">{currentStep.note}</p>
          )}
        </section>
      </div>

      {/* Tablet landscape / wide screens: one information card, controls stay in footer */}
      <section className="hidden lg:grid w-full min-h-[390px] grid-cols-[0.82fr_1.18fr] gap-10 rounded-xl border border-edge bg-surface px-10 py-9 shadow-card">
        <div className="flex flex-col justify-center border-r border-edge pr-10">
          <div className="mx-auto w-full max-w-[330px]">
            <h2 className="text-[2.5rem] font-extrabold leading-tight text-ink">{mainTitle}</h2>
            {detail && <p className="mt-2 text-xl font-bold leading-tight text-ink-muted">{detail}</p>}
            <div className="mt-8 text-[6.75rem] font-extrabold leading-none text-ink tabular-nums font-nunito">
              {formatTime(currentTime)}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center text-center">
          <WaterTarget targetTotalWater={currentStep.targetTotalWater} />
          <p className="mt-9 text-[2.1rem] font-extrabold leading-relaxed text-ink">{currentStep.description}</p>
          {currentStep.note && (
            <p className="mt-5 text-[1.35rem] font-bold leading-relaxed text-ink-sub">{currentStep.note}</p>
          )}
        </div>
      </section>
    </div>
  );
};
