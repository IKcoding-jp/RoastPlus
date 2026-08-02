'use client';

import React from 'react';
import { formatSecondsAsTimer as formatTime } from '@/lib/dateUtils';
import type { DripStep } from '@/lib/drip-guide/types';
import { splitStepTitle, type NextStepPreview as NextStepPreviewData } from '@/lib/drip-guide/runnerDisplay';
import { NextStepPreview } from './NextStepPreview';

interface FocusGuideDisplayProps {
  currentTime: number;
  recipeName: string;
  currentStep: DripStep | null;
  currentStepIndex: number;
  totalSteps: number;
  nextStepPreview: NextStepPreviewData;
}

function WaterTarget({ targetTotalWater }: { targetTotalWater?: number }) {
  if (!targetTotalWater) {
    return null;
  }

  return (
    <div className="text-center" data-testid="drip-current-water">
      <div className="flex items-baseline justify-center gap-2">
        <span className="text-[7rem] lg:text-[5rem] font-extrabold leading-none text-spot tabular-nums font-nunito">
          {targetTotalWater}
        </span>
        <span className="text-[2rem] font-extrabold text-spot/65">g</span>
      </div>
      <p className="-mt-1 text-2xl lg:text-xl font-extrabold text-ink">まで注ぐ</p>
    </div>
  );
}

export const FocusGuideDisplay: React.FC<FocusGuideDisplayProps> = ({
  currentTime,
  recipeName,
  currentStep,
  currentStepIndex,
  totalSteps,
  nextStepPreview,
}) => {
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
      <div className="w-full space-y-5 lg:hidden">
        <section className="rounded-lg bg-surface border border-edge px-4 py-3 shadow-card flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-ink-muted truncate">{recipeName}</p>
              <p className="text-xs font-bold text-ink-muted">
                {currentStepIndex + 1} / {totalSteps}
              </p>
            </div>
            <h2 className="text-[1.7rem] font-extrabold leading-tight text-ink mt-0.5">{mainTitle}</h2>
            {detail && <p className="mt-0.5 text-sm font-bold leading-tight text-ink-muted">{detail}</p>}
          </div>
          <div className="text-[2.75rem] font-extrabold leading-none text-ink tabular-nums font-nunito">
            {formatTime(currentTime)}
          </div>
        </section>

        <section className="min-h-[320px] rounded-lg bg-surface border border-edge px-5 py-6 shadow-card text-center flex flex-col justify-center">
          <WaterTarget targetTotalWater={currentStep.targetTotalWater} />
          <p className="mt-6 text-[1.4rem] font-extrabold leading-snug text-ink">{currentStep.description}</p>
          {currentStep.note && (
            <p className="mt-4 text-base font-semibold leading-snug text-ink-sub">{currentStep.note}</p>
          )}
          <NextStepPreview preview={nextStepPreview} variant="compact" />
        </section>
      </div>

      {/* Tablet landscape / wide screens: one information card, controls stay in footer */}
      <section className="hidden lg:grid w-full min-h-[300px] grid-cols-[0.82fr_1.18fr] gap-8 rounded-xl border border-edge bg-surface px-8 py-6 shadow-card">
        <div className="flex flex-col justify-center border-r border-edge pr-8">
          <div className="mx-auto w-full max-w-[330px]">
            <p className="mb-1.5 text-sm font-extrabold tracking-wide text-ink-muted tabular-nums">
              {currentStepIndex + 1} / {totalSteps}
            </p>
            <h2 className="text-[1.875rem] font-extrabold leading-tight text-ink">{mainTitle}</h2>
            {detail && <p className="mt-1.5 text-lg font-bold leading-tight text-ink-muted">{detail}</p>}
            <div className="mt-5 text-[5rem] font-extrabold leading-none text-ink tabular-nums font-nunito">
              {formatTime(currentTime)}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center text-center">
          <WaterTarget targetTotalWater={currentStep.targetTotalWater} />
          <p className="mt-6 text-2xl font-extrabold leading-snug text-ink">{currentStep.description}</p>
          {currentStep.note && <p className="mt-3 text-base font-bold leading-snug text-ink-sub">{currentStep.note}</p>}
          <NextStepPreview preview={nextStepPreview} variant="wide" />
        </div>
      </section>
    </div>
  );
};
