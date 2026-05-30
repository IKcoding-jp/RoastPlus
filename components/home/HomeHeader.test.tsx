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
  });

  it('クリスマスモード: 専用ロゴではなく通常と同じ太字ワードマークを使う（一本化）', () => {
    mocks.isChristmasMode = true;
    render(<HomeHeader />);

    // ワードマークは1つだけ（Playfair版との二重描画がない）
    const roast = screen.getByText('Roast');
    const plus = screen.getByText('Plus');
    expect(roast.className).toMatch(/font-extrabold/);
    expect(plus.className).toMatch(/font-extrabold/);
    // テーマトークンで色が切り替わるため、クラスは通常と同じ text-header-text / text-header-accent
    expect(roast.className).toMatch(/text-header-text/);
    expect(plus.className).toMatch(/text-header-accent/);
  });

  it('デジタル時計ボタンを表示する', () => {
    render(<HomeHeader />);
    expect(screen.getByRole('button', { name: 'デジタル時計を表示' })).toBeInTheDocument();
  });
});
