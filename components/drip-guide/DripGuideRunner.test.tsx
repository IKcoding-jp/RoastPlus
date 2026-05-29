import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { DripGuideRunner } from './DripGuideRunner';
import type { DripRecipe } from '@/lib/drip-guide/types';
import { useRunnerTimer } from '@/hooks/drip-guide/useRunnerTimer';
import { playDripCountdownAudio } from '@/lib/drip-guide/countdownAudio';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('./runner/CompletionScreen', () => ({
  CompletionScreen: () => <div>完了</div>,
}));

vi.mock('@/lib/drip-guide/countdownAudio', () => ({
  playDripCountdownAudio: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/hooks/drip-guide/useRunnerTimer', () => ({
  useRunnerTimer: vi.fn(),
}));

const recipe: DripRecipe = {
  id: 'recipe-test',
  name: 'BYSN Standard Drip',
  beanName: 'BYSNドリップパック',
  beanAmountGram: 12,
  totalWaterGram: 150,
  totalDurationSec: 120,
  isManualMode: true,
  steps: [
    {
      id: 'step-1',
      title: '蒸らし',
      description: '粉全体にまんべんなくお湯を注いで、均一に湿らせます。',
      startTimeSec: 0,
      targetTotalWater: 20,
      note: '粉全体が均一に膨らむのを確認',
    },
    {
      id: 'step-2',
      title: '2投目',
      description: '中心から外へ注ぎます。',
      startTimeSec: 30,
      targetTotalWater: 40,
    },
  ],
};

const autoRecipe: DripRecipe = {
  id: 'recipe-auto',
  name: 'Auto Recipe',
  beanName: 'Test',
  beanAmountGram: 12,
  totalWaterGram: 150,
  totalDurationSec: 120,
  isManualMode: false,
  steps: [
    {
      id: 'step-1',
      title: '蒸らし',
      description: '粉全体にまんべんなくお湯を注いで、均一に湿らせます。',
      startTimeSec: 0,
      targetTotalWater: 20,
    },
    {
      id: 'step-2',
      title: '2投目',
      description: '中心から外へ注ぎます。',
      startTimeSec: 30,
      targetTotalWater: 150,
    },
  ],
};

describe('DripGuideRunner', () => {
  it('集中表示で現在の注水量と説明文を大きく確認できる', () => {
    render(<DripGuideRunner recipe={recipe} />);

    expect(screen.getByTestId('drip-focus-display')).toBeInTheDocument();
    expect(screen.getAllByTestId('drip-current-water')).toHaveLength(2);
    screen.getAllByTestId('drip-current-water').forEach((element) => {
      expect(element).toHaveTextContent('20g');
      expect(element).toHaveTextContent('まで注ぐ');
    });
    expect(screen.getAllByText('粉全体にまんべんなくお湯を注いで、均一に湿らせます。')).toHaveLength(2);
  });

  it('次の注水量を作業カード内に表示しない', () => {
    render(<DripGuideRunner recipe={recipe} />);

    expect(screen.queryByText('40gまで')).not.toBeInTheDocument();
  });

  describe('カウントダウン音', () => {
    beforeEach(() => {
      vi.mocked(playDripCountdownAudio).mockClear();
      vi.mocked(useRunnerTimer).mockReset();
    });

    it('nextStep の 3 秒前に playDripCountdownAudio を呼ぶ', async () => {
      let capturedOnTick: (updater: (prev: number) => number) => void = () => {};
      vi.mocked(useRunnerTimer).mockImplementation(({ onTick }) => {
        capturedOnTick = onTick;
        return { current: null };
      });

      render(<DripGuideRunner recipe={autoRecipe} />);

      await act(async () => {
        capturedOnTick(() => 27); // step-2 は 30s 開始 → countdown は 30-3=27s
      });

      expect(playDripCountdownAudio).toHaveBeenCalledWith({ volume: 0.7 });
    });

    it('同じカウントダウン区間で 2 回以上呼ばれない', async () => {
      let capturedOnTick: (updater: (prev: number) => number) => void = () => {};
      vi.mocked(useRunnerTimer).mockImplementation(({ onTick }) => {
        capturedOnTick = onTick;
        return { current: null };
      });

      render(<DripGuideRunner recipe={autoRecipe} />);

      await act(async () => {
        capturedOnTick(() => 27);
        capturedOnTick(() => 28); // 同じカウントダウン区間内の 2 回目
      });

      expect(playDripCountdownAudio).toHaveBeenCalledTimes(1);
    });
  });
});
