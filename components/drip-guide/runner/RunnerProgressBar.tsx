'use client';

import React from 'react';

interface RunnerProgressBarProps {
  /** 進捗の比率（0〜1） */
  ratio: number;
}

/**
 * 実行画面の最上部に出す全体進捗バー。
 * 自動モードは経過時間、手動モードはステップ数を基準にした比率を受け取る。
 */
export const RunnerProgressBar: React.FC<RunnerProgressBarProps> = ({ ratio }) => {
  const percent = Math.round(ratio * 100);

  return (
    <div
      data-testid="drip-progress-bar"
      role="progressbar"
      aria-label="抽出の進捗"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="flex-none h-1.5 w-full bg-edge"
    >
      <div
        className="h-full bg-spot rounded-r-full transition-[width] duration-500 ease-linear"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};
