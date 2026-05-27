'use client';

import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import type { IconType } from 'react-icons';
import { BsStars } from 'react-icons/bs';
import { Button } from '@/components/ui';

interface ActionCardProps {
  title: string;
  description: string;
  href: string;
  icon: IconType;
  badge?: string;
  index: number;
  cardHeight: number | null;
}

export function ActionCard({ title, description, href, icon: Icon, badge, index, cardHeight }: ActionCardProps) {
  const router = useRouter();
  const cardStyle = {
    ...(cardHeight ? { '--home-card-height': `${cardHeight}px` } : {}),
    animationDelay: `${index * 60}ms`,
  } as CSSProperties;

  return (
    <Button
      variant="ghost"
      onClick={() => router.push(href)}
      className="group relative flex w-full flex-1 flex-row !items-center !justify-start gap-3 !rounded-xl border border-edge-strong bg-surface px-3 py-1.5 text-left text-ink shadow-card transition-all hover:bg-ground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 animate-home-card !min-h-[44px] md:h-[var(--home-card-height)] md:flex-none md:flex-col md:!justify-center md:gap-3 md:!rounded-2xl md:p-5 md:text-center md:shadow-2xl md:hover:-translate-y-2 md:hover:bg-surface md:hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] md:!min-h-0"
      style={cardStyle}
      aria-label={title}
    >
      {/* バッジ表示 */}
      {badge && (
        <div className="absolute -top-1 -right-1 z-20 animate-pulse-scale sm:-top-2 sm:-right-2">
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] whitespace-nowrap font-bold text-white shadow-lg ${
              badge === 'NEW' ? 'new-label-gradient' : 'completed-label-gradient'
            } ring-2 ring-white/20 sm:px-3 sm:py-1`}
          >
            <BsStars className="text-[10px]" />
            {badge}
          </span>
        </div>
      )}

      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center self-center text-spot transition-all duration-300 md:h-14 md:w-14">
        <Icon className="relative z-10 h-6 w-6 md:h-11 md:w-11" />
      </span>
      <div className="relative z-10 flex min-w-0 flex-1 items-center md:block md:flex-none md:text-center">
        <p
          className={`truncate leading-none font-bold text-ink transition-colors group-hover:text-spot ${title === 'ハンドピックタイマー' ? 'text-sm md:text-sm' : 'text-base md:text-lg'}`}
        >
          {title}
        </p>
        <p className="hidden text-xs text-ink-muted transition-colors md:block md:text-sm">{description}</p>
      </div>
      <span aria-hidden="true" className="shrink-0 text-lg leading-none text-ink-muted md:hidden">
        ›
      </span>
    </Button>
  );
}
