import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeHeader } from './HomeHeader';

const mocks = vi.hoisted(() => ({ isChristmasMode: false }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/hooks/useChristmasMode', () => ({
  useChristmasMode: () => ({ isChristmasMode: mocks.isChristmasMode }),
}));

beforeEach(() => {
  mocks.isChristmasMode = false;
});

describe('HomeHeader', () => {
  it('通常モード: ロゴが「Roast」「Plus」の太字一体型で、Plusがアクセント色', () => {
    render(<HomeHeader />);

    const roast = screen.getByText('Roast');
    const plus = screen.getByText('Plus');

    expect(roast).toBeInTheDocument();
    expect(plus).toBeInTheDocument();
    expect(roast.parentElement).toBeTruthy();
    expect(roast.parentElement?.className).not.toMatch(/gap-/);
    expect(roast.className).toMatch(/font-extrabold/);
    expect(plus.className).toMatch(/font-extrabold/);
    expect(plus.className).toMatch(/text-header-accent/);
    expect(screen.queryByTestId('christmas-tree')).not.toBeInTheDocument();
  });

  it('クリスマスモード: R=赤・oast=クリーム・Plus=金の太字ワードマーク＋緑ツリーを表示', () => {
    mocks.isChristmasMode = true;
    render(<HomeHeader />);

    const r = screen.getByText('R');
    const oast = screen.getByText('oast');
    const plus = screen.getByText('Plus');

    // 太字Interは維持
    expect(r.className).toMatch(/font-extrabold/);
    expect(oast.className).toMatch(/font-extrabold/);
    expect(plus.className).toMatch(/font-extrabold/);
    // 配色: R=赤(明示), oast=テーマトークン(クリーム), Plus=テーマトークン(金)
    expect(r.className).toMatch(/text-\[#e23636\]/);
    expect(oast.className).toMatch(/text-header-text/);
    expect(plus.className).toMatch(/text-header-accent/);
    // クリスマスツリーアイコンを表示
    expect(screen.getByTestId('christmas-tree')).toBeInTheDocument();
  });

  it('デジタル時計ボタンを表示する', () => {
    render(<HomeHeader />);
    expect(screen.getByRole('button', { name: 'デジタル時計を表示' })).toBeInTheDocument();
  });
});
