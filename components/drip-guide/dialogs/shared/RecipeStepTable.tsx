'use client';

import React from 'react';
import { DripStep } from '@/lib/drip-guide/types';
import { formatSecondsAsTimer as formatTime } from '@/lib/dateUtils';
import { Button } from '@/components/ui';

interface RecipeStepTableProps {
  steps: DripStep[];
  onStepDetailClick?: (stepId: string, stepTitle: string) => void;
  showPourAmount?: boolean;
}

const HEAD_STYLES = 'pb-2 text-[11px] font-bold tracking-[0.1em] text-ink-muted';

export const RecipeStepTable: React.FC<RecipeStepTableProps> = ({
  steps,
  onStepDetailClick,
  showPourAmount = false,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-xs">
        <thead>
          <tr>
            <th className={`${HEAD_STYLES} w-[3.2rem] text-left`}>時間</th>
            <th className={`${HEAD_STYLES} text-left`}>ステップ</th>
            {showPourAmount && <th className={`${HEAD_STYLES} w-[2.8rem] text-right`}>注湯</th>}
            <th className={`${HEAD_STYLES} w-[3rem] text-right`}>累計</th>
            {onStepDetailClick && <th className={`${HEAD_STYLES} w-12 text-center`}>詳細</th>}
          </tr>
        </thead>
        <tbody>
          {steps.map((step, index) => {
            const prevTarget = index > 0 ? steps[index - 1].targetTotalWater || 0 : 0;
            const currentTarget = step.targetTotalWater || 0;
            const pourAmount = currentTarget - prevTarget;

            return (
              <tr key={step.id} className="border-t border-edge align-top">
                <td className="py-2.5 pr-1 font-num tabular-nums text-ink-muted">{formatTime(step.startTimeSec)}</td>
                <td className="py-2.5 pr-2 font-semibold leading-snug text-ink">{step.title}</td>
                {showPourAmount && (
                  <td className="py-2.5 pl-1 text-right font-num font-bold tabular-nums text-ink">{pourAmount}g</td>
                )}
                <td className="py-2.5 pl-1 text-right font-num tabular-nums text-ink-muted">
                  {step.targetTotalWater != null ? `${step.targetTotalWater}g` : '-'}
                </td>
                {onStepDetailClick && (
                  <td className="py-2.5 pl-1 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => onStepDetailClick(step.id, step.title)}
                      className="!min-h-0 !px-1 !py-0.5 !text-xs underline !text-spot hover:!text-spot-hover"
                    >
                      詳細
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
