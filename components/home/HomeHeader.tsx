'use client';

import { useRouter } from 'next/navigation';
import { HiClock } from 'react-icons/hi';
import { useChristmasMode } from '@/hooks/useChristmasMode';
import { IconButton } from '@/components/ui';

export function HomeHeader() {
  const router = useRouter();
  const { isChristmasMode } = useChristmasMode();

  return (
    <header className="shrink-0 relative z-50 transition-all duration-1000 bg-header-bg shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* ロゴ（テーマトークンで色が切り替わるため通常/クリスマス共通） */}
        <div className="flex items-baseline cursor-default select-none">
          <span className="text-2xl md:text-3xl font-[var(--font-inter)] font-extrabold tracking-[-0.04em] text-header-text leading-none">
            Roast
          </span>
          <span className="text-2xl md:text-3xl font-[var(--font-inter)] font-extrabold tracking-[-0.04em] text-header-accent leading-none">
            Plus
          </span>
        </div>

        {/* ボタン群 */}
        <div className="flex items-center gap-2">
          <IconButton
            variant="ghost"
            size="md"
            onClick={() => router.push('/clock')}
            className="!rounded-xl text-header-text/70 hover:text-header-text hover:bg-header-btn-hover active:scale-95"
            aria-label="デジタル時計を表示"
            title="デジタル時計"
          >
            <HiClock className="h-5 w-5" />
          </IconButton>
        </div>
      </div>

      {/* クリスマスモードのアクセントライン */}
      {isChristmasMode && (
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent shadow-[0_-1px_10px_rgba(212,175,55,0.3)]"></div>
      )}
    </header>
  );
}
