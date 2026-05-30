import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomeHeader } from './HomeHeader';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/hooks/useChristmasMode', () => ({
  useChristmasMode: () => ({ isChristmasMode: false }),
}));

describe('HomeHeader（通常モード）', () => {
  it('ロゴが「Roast」「Plus」の2要素で構成され、Plusがアクセント色を持つ', () => {
    render(<HomeHeader />);

    const roast = screen.getByText('Roast');
    const plus = screen.getByText('Plus');

    expect(roast).toBeInTheDocument();
    expect(plus).toBeInTheDocument();
    // 一体型: 親コンテナに gap 系クラスを持たない
    expect(roast.parentElement?.className).not.toMatch(/gap-/);
    // 太い一体型: 両セグメントとも extrabold
    expect(roast.className).toMatch(/font-extrabold/);
    expect(plus.className).toMatch(/font-extrabold/);
    // 色の役割: Plus はアクセント色
    expect(plus.className).toMatch(/text-header-accent/);
  });

  it('デジタル時計ボタンを表示する', () => {
    render(<HomeHeader />);
    expect(screen.getByRole('button', { name: 'デジタル時計を表示' })).toBeInTheDocument();
  });
});
