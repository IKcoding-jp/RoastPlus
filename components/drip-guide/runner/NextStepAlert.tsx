'use client';

import React from 'react';
import type { NextStepAlert as NextStepAlertData } from '@/lib/drip-guide/runnerDisplay';

interface NextStepAlertProps {
  alert: NextStepAlertData;
}

/**
 * 次の注湯が来る直前（残り3秒）の合図。
 * 画面外周のリングで周辺視野に気づかせ、下からせり上がるバーで次の指示を伝える。
 * 現在の湯量・説明文は隠さない。
 */
export const NextStepAlert: React.FC<NextStepAlertProps> = ({ alert }) => {
  return (
    <>
      <div
        data-testid="drip-alert-ring"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-30 animate-drip-alert-ring"
      />

      <div
        data-testid="drip-alert-bar"
        className="absolute inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 bg-spot px-6 py-9 text-on-spot shadow-[0_-8px_24px_rgba(0,0,0,0.18)] animate-drip-alert-slide-up safe-area-bottom sm:px-8 lg:py-8"
      >
        <div className="min-w-0">
          <p className="text-xs font-extrabold tracking-wide text-on-spot/80 sm:text-sm">まもなく次の注湯</p>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 font-extrabold leading-tight">
            <span className="text-xl sm:text-2xl lg:text-[1.75rem]">{alert.title}</span>
            {alert.targetTotalWater && (
              <>
                <span className="text-2xl tabular-nums sm:text-3xl lg:text-[2.25rem]">→ {alert.targetTotalWater}g</span>
                <span className="text-base text-on-spot/85 sm:text-lg">まで注ぐ</span>
              </>
            )}
          </div>
        </div>

        <div
          data-testid="drip-alert-countdown"
          className="flex-none text-[3.5rem] font-extrabold leading-none tabular-nums font-nunito animate-drip-alert-beat sm:text-[4.5rem]"
        >
          {alert.remainingSec}
        </div>
      </div>
    </>
  );
};
