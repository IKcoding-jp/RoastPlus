'use client';

import React from 'react';
import { clsx } from 'clsx';
import type { NextStepPreview as NextStepPreviewData } from '@/lib/drip-guide/runnerDisplay';

interface NextStepPreviewProps {
  preview: NextStepPreviewData;
  /** compact: スマホ縦 / wide: タブレット横 */
  variant: 'compact' | 'wide';
}

/**
 * 情報カード最下部に出す「次の1手」予告。
 * 直前の合図は NextStepAlert（リング＋せり上がるバー）が担うため、この行は常に控えめな見た目を保つ。
 */
export const NextStepPreview: React.FC<NextStepPreviewProps> = ({ preview, variant }) => {
  const isWide = variant === 'wide';

  return (
    <div
      data-testid="drip-next-preview"
      className={clsx(
        'flex flex-wrap items-center justify-center border-t border-edge pt-4 text-ink-sub',
        isWide ? 'mt-5 gap-x-3 gap-y-1' : 'mt-6 gap-x-2 gap-y-0.5'
      )}
    >
      {preview.leadLabel && (
        <span className={clsx('font-extrabold tracking-widest text-ink-muted', isWide ? 'text-sm' : 'text-xs')}>
          {preview.leadLabel}
        </span>
      )}
      <span className={clsx('font-extrabold', isWide ? 'text-lg' : 'text-sm')}>{preview.body}</span>
      {preview.remainingText && (
        <>
          <span aria-hidden="true" className={clsx('text-edge-strong', isWide ? 'text-sm' : 'text-xs')}>
            ・
          </span>
          <span className={clsx('font-extrabold tabular-nums', isWide ? 'text-lg' : 'text-sm')}>
            {preview.remainingText}
          </span>
        </>
      )}
    </div>
  );
};
