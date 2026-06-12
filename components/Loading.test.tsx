// Loading の脱出ハッチ（長時間続いたら再読み込み導線を出す）のテスト
// iOS PWA復帰後にデータ読み込みが固まったとき、タスクキルせずに復帰できるようにする

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Loading, RELOAD_PROMPT_DELAY_MS } from './Loading';

describe('Loading の脱出ハッチ', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Lottieアニメーションの取得は失敗させてフォールバック表示にする（本テストの対象外）
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('表示直後は再読み込みボタンを出さない', () => {
    render(<Loading />);

    expect(screen.queryByRole('button', { name: '再読み込み' })).not.toBeInTheDocument();
  });

  it('しきい値を超えて読み込みが続いたら再読み込みボタンを表示する', async () => {
    render(<Loading />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RELOAD_PROMPT_DELAY_MS);
    });

    expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument();
  });

  it('再読み込みボタンを押すとページを再読み込みする', async () => {
    const reloadSpy = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload: reloadSpy },
      writable: true,
      configurable: true,
    });

    render(<Loading />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RELOAD_PROMPT_DELAY_MS);
    });

    fireEvent.click(screen.getByRole('button', { name: '再読み込み' }));

    expect(reloadSpy).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('fullScreen=false（インライン表示）でも脱出ハッチは機能する', async () => {
    render(<Loading fullScreen={false} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RELOAD_PROMPT_DELAY_MS);
    });

    expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument();
  });
});
