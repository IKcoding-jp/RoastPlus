'use client';

import { HiXMark } from 'react-icons/hi2';

import { IconButton } from '@/components/ui';
import type { ThemeColors } from '@/lib/clockSettings';
import type { DueWorkChime } from '@/lib/workChime';

interface WorkChimeAlertProps {
  chime: DueWorkChime | null;
  colors: ThemeColors;
  onClose: () => void;
}

export function WorkChimeAlert({ chime, colors, onClose }: WorkChimeAlertProps) {
  if (!chime) return null;

  const accentColor = chime.kind === 'break' ? '#0891b2' : chime.kind === 'cleanup-start' ? '#4b5563' : '#d97706';

  return (
    <div
      className="absolute inset-0 z-30 grid place-items-center px-5 py-16 backdrop-blur-[1px]"
      style={{ backgroundColor: `${colors.bg}b8` }}
    >
      <div
        className="relative flex min-h-72.5 w-full max-w-4xl flex-col items-center justify-center overflow-hidden rounded-lg border border-t-8 px-8 py-12 text-center shadow-[0_16px_38px_rgba(33,23,20,0.10)] sm:min-h-82.5 sm:px-14"
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.uiBg,
          borderTopColor: accentColor,
        }}
        role="status"
        aria-live="polite"
      >
        <div className="absolute right-5 top-5">
          <IconButton variant="ghost" rounded onClick={onClose} aria-label="作業チャイム表示を閉じる">
            <HiXMark className="h-6 w-6" style={{ color: colors.uiText }} />
          </IconButton>
        </div>
        <div
          className="text-[clamp(1.75rem,4.2vw,2.875rem)] font-black leading-tight"
          style={{ color: accentColor, fontFeatureSettings: '"tnum"' }}
        >
          {chime.time} {chime.label}
        </div>
        <div
          className="mt-5 text-[clamp(3.875rem,10vw,7.25rem)] font-black leading-[1.02]"
          style={{ color: colors.text }}
        >
          {chime.message}
        </div>
      </div>
    </div>
  );
}
