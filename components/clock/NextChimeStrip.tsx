'use client';

import type { ThemeColors } from '@/lib/clockSettings';
import type { CurrentWorkChimePeriod, NextWorkChime } from '@/lib/workChime';

interface NextChimeStripProps {
  currentPeriod: CurrentWorkChimePeriod | null;
  nextChime: NextWorkChime | null;
  colors: ThemeColors;
}

export function NextChimeStrip({ currentPeriod, nextChime, colors }: NextChimeStripProps) {
  if (!currentPeriod && !nextChime) return null;

  return (
    <div
      className="absolute left-1/2 bottom-5 sm:bottom-8 z-10 flex min-h-13.5 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 flex-col items-center justify-center gap-1 rounded-2xl border px-4 py-2 text-center sm:flex-row sm:gap-6 sm:rounded-full sm:px-6"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.uiBg,
        color: colors.uiText,
      }}
    >
      {currentPeriod && (
        <span className="text-base font-bold sm:text-xl">
          現在{' '}
          <strong style={{ color: colors.text }}>
            {currentPeriod.period.start}-{currentPeriod.period.end} {currentPeriod.label}
          </strong>
        </span>
      )}
      {nextChime && (
        <span className="text-base font-bold sm:text-xl">
          次{' '}
          <strong style={{ color: colors.text }}>
            {nextChime.time} {nextChime.label}
          </strong>
        </span>
      )}
      {nextChime && (
        <span className="text-base font-bold sm:text-xl">
          あと <strong style={{ color: colors.text }}>{nextChime.minutesUntil}分</strong>
        </span>
      )}
    </div>
  );
}
