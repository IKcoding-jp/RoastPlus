'use client';

import { useRouter } from 'next/navigation';
import { HiClock } from 'react-icons/hi';
import { useChristmasMode } from '@/hooks/useChristmasMode';
import { IconButton } from '@/components/ui';

const LOGO_TEXT_BASE =
  'text-2xl md:text-3xl font-[var(--font-inter)] font-extrabold tracking-[-0.04em] leading-none';

export function HomeHeader() {
  const router = useRouter();
  const { isChristmasMode } = useChristmasMode();

  return (
    <header className="shrink-0 relative z-50 transition-all duration-1000 bg-header-bg shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* ロゴ（クリスマス時のみツリー＋赤いR、それ以外は太字一体型） */}
        <div className="flex items-center gap-2 cursor-default select-none">
          {isChristmasMode && (
            <svg data-testid="christmas-tree" aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 shrink-0">
              <path
                d="M12 0.4l.95 2.05 2.25.25-1.7 1.5.45 2.2L12 5.5 9.75 6.6l.45-2.2-1.7-1.5 2.25-.25z"
                fill="#ffcc33"
              />
              <polygon points="12,4 16.5,10 7.5,10" fill="#1a8a3a" />
              <polygon points="12,8 18,15 6,15" fill="#1a8a3a" />
              <polygon points="12,12 19.5,20 4.5,20" fill="#1a8a3a" />
              <rect x="10.8" y="20" width="2.4" height="2.8" fill="#6b4423" />
              <circle cx="10.3" cy="13" r="0.9" fill="#e23636" />
              <circle cx="13.6" cy="17" r="0.9" fill="#d4af37" />
              <circle cx="11.2" cy="18.4" r="0.8" fill="#f8f1e7" />
            </svg>
          )}
          {isChristmasMode ? (
            <div className="flex items-baseline">
              <span className={`${LOGO_TEXT_BASE} text-[#e23636]`}>R</span>
              <span className={`${LOGO_TEXT_BASE} text-header-text`}>oast</span>
              <span className={`${LOGO_TEXT_BASE} text-header-accent`}>Plus</span>
            </div>
          ) : (
            <div className="flex items-baseline">
              <span className={`${LOGO_TEXT_BASE} text-header-text`}>Roast</span>
              <span className={`${LOGO_TEXT_BASE} text-header-accent`}>Plus</span>
            </div>
          )}
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
