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

  const accentColor = chime.kind === 'break'
    ? '#16a34a'
    : chime.kind === 'cleanup-start'
      ? '#4b5563'
      : '#d97706';
  const softAccent = chime.kind === 'break'
    ? 'rgba(22, 163, 74, 0.14)'
    : chime.kind === 'cleanup-start'
      ? 'rgba(75, 85, 99, 0.14)'
      : 'rgba(217, 119, 6, 0.16)';

  return (
    <div
      className="absolute inset-0 z-30 grid place-items-center px-5 py-16 backdrop-blur-[2px]"
      style={{ backgroundColor: `${colors.bg}b8` }}
    >
      <div
        className="relative flex min-h-[300px] w-full max-w-4xl flex-col items-center justify-center overflow-hidden rounded-[18px] border px-8 py-12 text-center shadow-2xl sm:min-h-[330px] sm:px-14"
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.uiBg,
          boxShadow: '0 18px 64px rgba(33, 23, 20, 0.16)',
        }}
        role="status"
        aria-live="polite"
      >
        <div
          className="absolute left-7 right-7 top-6 h-[5px] rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        <div className="absolute right-5 top-5">
          <IconButton
            variant="ghost"
            rounded
            onClick={onClose}
            aria-label="作業チャイム表示を閉じる"
          >
            <HiXMark className="h-6 w-6" style={{ color: colors.uiText }} />
          </IconButton>
        </div>
        <div
          className="rounded-full px-5 py-1.5 text-2xl font-black sm:text-4xl"
          style={{ backgroundColor: softAccent, color: accentColor }}
        >
          {chime.time} {chime.label}
        </div>
        <div
          className="mt-5 whitespace-nowrap text-[clamp(4.5rem,9.8vw,8rem)] font-black leading-[1.04]"
          style={{ color: colors.text }}
        >
          {chime.message}
        </div>
      </div>
    </div>
  );
}
