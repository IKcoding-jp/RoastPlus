import { render, screen, fireEvent } from '@testing-library/react';
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

  it('次の注水量を現在の巨大数字として表示しない', () => {
    render(<DripGuideRunner recipe={recipe} />);

    expect(screen.queryByText('40gまで')).not.toBeInTheDocument();
    screen.getAllByTestId('drip-current-water').forEach((element) => {
      expect(element).not.toHaveTextContent('40g');
    });
  });

  describe('次ステップ予告', () => {
    beforeEach(() => {
      vi.mocked(useRunnerTimer).mockReset();
    });

    const renderWithTime = (targetRecipe: DripRecipe, seconds: number) => {
      let capturedOnTick: (updater: (prev: number) => number) => void = () => {};
      vi.mocked(useRunnerTimer).mockImplementation(({ onTick }) => {
        capturedOnTick = onTick;
        return { current: null };
      });

      const result = render(<DripGuideRunner recipe={targetRecipe} />);
      act(() => {
        capturedOnTick(() => seconds);
      });
      return result;
    };

    it('予告行は残り3秒以内でも見た目を変えない', () => {
      renderWithTime(autoRecipe, 27);

      screen.getAllByTestId('drip-next-preview').forEach((element) => {
        expect(element).not.toHaveAttribute('data-soon');
      });
    });

    it('自動モードで次のステップ・目標湯量・残り秒を出す', () => {
      renderWithTime(autoRecipe, 10);

      const previews = screen.getAllByTestId('drip-next-preview');
      expect(previews).toHaveLength(2);
      previews.forEach((element) => {
        expect(element).toHaveTextContent('2投目 → 150g');
        expect(element).toHaveTextContent('あと 20秒');
      });
    });

    it('残り3秒以内でも予告行の書式は変わらない', () => {
      renderWithTime(autoRecipe, 27);

      screen.getAllByTestId('drip-next-preview').forEach((element) => {
        expect(element).toHaveTextContent('あと 3秒');
      });
    });

    it('自動モードの最終ステップでは完了までの残りを出す', () => {
      renderWithTime(autoRecipe, 60);

      screen.getAllByTestId('drip-next-preview').forEach((element) => {
        expect(element).toHaveTextContent('完了まで');
        expect(element).toHaveTextContent('あと 1:00');
      });
    });

    it('手動モードでは残り秒を出さず見出しと目標湯量だけ出す', () => {
      render(<DripGuideRunner recipe={recipe} />);

      screen.getAllByTestId('drip-next-preview').forEach((element) => {
        expect(element).toHaveTextContent('2投目 → 40g');
        expect(element).not.toHaveTextContent('あと');
      });
    });
  });

  describe('次ステップ直前アラート', () => {
    beforeEach(() => {
      vi.mocked(useRunnerTimer).mockReset();
    });

    const renderRunning = (targetRecipe: DripRecipe, seconds: number) => {
      let capturedOnTick: (updater: (prev: number) => number) => void = () => {};
      vi.mocked(useRunnerTimer).mockImplementation(({ onTick }) => {
        capturedOnTick = onTick;
        return { current: null };
      });

      render(<DripGuideRunner recipe={targetRecipe} />);
      // 再生してタイマーを動かしてから経過時間を進める
      fireEvent.click(screen.getByLabelText('再生'));
      act(() => {
        capturedOnTick(() => seconds);
      });
    };

    it('残り3秒でリングとバーを出し、次の湯量を「まで注ぐ」付きで示す', () => {
      renderRunning(autoRecipe, 27);

      expect(screen.getByTestId('drip-alert-ring')).toBeInTheDocument();
      const bar = screen.getByTestId('drip-alert-bar');
      expect(bar).toHaveTextContent('まもなく次の注湯');
      expect(bar).toHaveTextContent('2投目');
      expect(bar).toHaveTextContent('→ 150g');
      expect(bar).toHaveTextContent('まで注ぐ');
      expect(screen.getByTestId('drip-alert-countdown')).toHaveTextContent('3');
    });

    it('残り4秒以上では出さない', () => {
      renderRunning(autoRecipe, 26);

      expect(screen.queryByTestId('drip-alert-bar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('drip-alert-ring')).not.toBeInTheDocument();
    });

    it('一時停止中は出さない', () => {
      let capturedOnTick: (updater: (prev: number) => number) => void = () => {};
      vi.mocked(useRunnerTimer).mockImplementation(({ onTick }) => {
        capturedOnTick = onTick;
        return { current: null };
      });

      render(<DripGuideRunner recipe={autoRecipe} />);
      act(() => {
        capturedOnTick(() => 27);
      });

      expect(screen.queryByTestId('drip-alert-bar')).not.toBeInTheDocument();
    });

    it('手動モードでは出さない', () => {
      render(<DripGuideRunner recipe={recipe} />);
      fireEvent.click(screen.getByLabelText('再生'));

      expect(screen.queryByTestId('drip-alert-bar')).not.toBeInTheDocument();
    });
  });

  describe('進捗バー', () => {
    beforeEach(() => {
      vi.mocked(useRunnerTimer).mockReset();
    });

    it('自動モードは経過時間の比率を示す', () => {
      let capturedOnTick: (updater: (prev: number) => number) => void = () => {};
      vi.mocked(useRunnerTimer).mockImplementation(({ onTick }) => {
        capturedOnTick = onTick;
        return { current: null };
      });

      render(<DripGuideRunner recipe={autoRecipe} />);
      act(() => {
        capturedOnTick(() => 60); // 120秒中の60秒 → 50%
      });

      expect(screen.getByTestId('drip-progress-bar')).toHaveAttribute('aria-valuenow', '50');
    });

    it('手動モードはステップ数の比率を示す', () => {
      render(<DripGuideRunner recipe={recipe} />);

      // 全2ステップの1つ目 → 50%
      expect(screen.getByTestId('drip-progress-bar')).toHaveAttribute('aria-valuenow', '50');
    });
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
