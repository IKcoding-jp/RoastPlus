'use client';

import React, { useEffect, useCallback } from 'react';
import { AnimatePresence, motion, type MotionProps } from 'framer-motion';
import { ArrowRight, Coffee, HandPointing, Scales, Timer } from 'phosphor-react';
import { Button } from '@/components/ui';

interface StartHintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  totalWaterGram?: number;
  servings?: number;
  recipeName?: string;
  isManualMode?: boolean;
  extraHints?: { title: string; body: string }[];
}

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const dialogMotion: MotionProps = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 12 },
  transition: { type: 'spring', stiffness: 240, damping: 28 },
};

interface HintRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const HintRow: React.FC<HintRowProps> = ({ icon, title, description }) => (
  <div className="flex items-start gap-3.5 py-3.5">
    <span className="mt-0.5 shrink-0 text-ink-muted">{icon}</span>
    <div>
      <p className="text-sm font-bold text-ink">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{description}</p>
    </div>
  </div>
);

export const StartHintDialog: React.FC<StartHintDialogProps> = ({
  isOpen,
  onClose,
  onStart,
  totalWaterGram,
  servings,
  recipeName,
  isManualMode,
  extraHints,
}) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div {...overlayMotion} className="fixed inset-0 z-50 bg-black/55" onClick={onClose} />
          <motion.div
            {...dialogMotion}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <div
              className="w-full max-w-md rounded-[28px] border border-edge bg-overlay p-7 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[11px] font-bold tracking-[0.18em] text-ink-muted">ドリップ前のヒント</p>
              <h3 className="mt-1.5 text-xl font-extrabold text-ink">{recipeName ?? '一杯をおいしく淹れるために'}</h3>

              {typeof totalWaterGram === 'number' && (
                <div className="mt-5">
                  <p className="font-num text-[56px] font-bold leading-none tracking-tight text-ink tabular-nums">
                    {totalWaterGram}
                    <span className="text-[28px] font-semibold text-spot">g</span>
                  </p>
                  <p className="mt-2 text-xs tracking-[0.08em] text-ink-muted">
                    総湯量{servings ? ` ・ ${servings}人前` : ''}
                  </p>
                </div>
              )}

              <div className="mt-5 h-px bg-edge" />

              <div className="divide-y divide-edge">
                <HintRow
                  icon={<Scales size={20} weight="light" />}
                  title="スケールは0に戻さない"
                  description="表示される湯量は合計量です"
                />
                <HintRow
                  icon={<Timer size={20} weight="light" />}
                  title="蒸らし後にタイマー開始"
                  description="蒸らしのお湯を入れてからスタートします"
                />
                {isManualMode && (
                  <HintRow
                    icon={<HandPointing size={20} weight="light" />}
                    title="手順は「次へ」タップで進む"
                    description="タイマーは経過時間の目安です"
                  />
                )}
                {extraHints?.map((hint) => (
                  <HintRow
                    key={hint.title}
                    icon={<Coffee size={20} weight="light" />}
                    title={hint.title}
                    description={hint.body}
                  />
                ))}
              </div>

              <div className="mt-4 flex gap-2.5">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="!rounded-2xl border border-edge !px-5 !text-sm !font-semibold !text-ink-sub hover:bg-ground"
                >
                  閉じる
                </Button>
                <Button
                  variant="primary"
                  onClick={onStart}
                  className="flex-1 gap-2 !rounded-2xl !text-[15px] active:scale-[0.99] touch-manipulation"
                >
                  ガイド開始
                  <ArrowRight size={16} weight="bold" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
