'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { IconType } from 'react-icons';
import { FaCoffee, FaUsers } from 'react-icons/fa';
import { IoSettings } from 'react-icons/io5';
import { MdCoffeeMaker, MdFactory, MdInventory2 } from 'react-icons/md';
import { RiBookFill, RiCalendarScheduleFill } from 'react-icons/ri';
import { Loading } from '@/components/Loading';
import { ActionCard } from '@/components/home/ActionCard';
import { HomeHeader } from '@/components/home/HomeHeader';
import { useChristmasMode } from '@/hooks/useChristmasMode';
import { useHomeFeatureVisibility } from '@/hooks/useHomeFeatureVisibility';
import { useInventory } from '@/hooks/useInventory';
import { useAuth } from '@/lib/auth';
import { getUserData } from '@/lib/firestore';
import { countReorderItems } from '@/lib/inventory';
import { needsConsent } from '@/lib/consent';
import type { HomeFeatureKey } from '@/lib/homeFeatures';
import dynamic from 'next/dynamic';
import { SPLASH_DISPLAY_TIME } from '@/lib/constants';

const Snowfall = dynamic(() => import('@/components/Snowfall').then((mod) => ({ default: mod.Snowfall })), {
  ssr: false,
});
import { FaTree, FaGift } from 'react-icons/fa';
import { GiCandyCanes, GiGingerbreadMan } from 'react-icons/gi';
import { BsStars } from 'react-icons/bs';

interface Action {
  key: HomeFeatureKey;
  title: string;
  label: string;
  description: string;
  href: string;
  icon: IconType;
  badge?: string;
}

/** クリスマスモード時のアイコンマッピング（モジュールレベルで定義し再生成を防止） */
const CHRISTMAS_ICONS: Record<string, IconType> = {
  assignment: FaGift,
  schedule: BsStars,
  tasting: FaTree,
  'defect-beans': GiGingerbreadMan,
  'production-record': MdFactory,
  inventory: MdInventory2,
  'drip-guide': GiCandyCanes,
  settings: IoSettings,
};

const ACTIONS: Action[] = [
  {
    key: 'assignment',
    title: '担当表',
    label: 'ASSIGNMENT',
    description: '公平に担当を割り当て',
    href: '/assignment',
    icon: FaUsers,
  },
  {
    key: 'schedule',
    title: 'スケジュール',
    label: 'SCHEDULE',
    description: '一日の予定を確認',
    href: '/schedule',
    icon: RiCalendarScheduleFill,
  },
  {
    key: 'tasting',
    title: '試飲感想記録',
    label: 'TASTING',
    description: '試飲の感想を記録',
    href: '/tasting',
    icon: FaCoffee,
  },
  {
    key: 'defect-beans',
    title: '欠点豆図鑑',
    label: 'DEFECTS',
    description: '欠点豆の知識を共有',
    href: '/defect-beans',
    icon: RiBookFill,
  },
  {
    key: 'production-record',
    title: '生産記録',
    label: 'PRODUCTION',
    description: '月次の生産実績を記録',
    href: '/production-record',
    icon: MdFactory,
  },
  {
    key: 'inventory',
    title: '在庫',
    label: 'INVENTORY',
    description: '不足品を共有・要発注',
    href: '/inventory',
    icon: MdInventory2,
  },
  {
    key: 'drip-guide',
    title: 'ドリップガイド',
    label: 'DRIP GUIDE',
    description: '淹れ方の手順',
    href: '/drip-guide',
    icon: MdCoffeeMaker,
  },
  {
    key: 'settings',
    title: 'その他',
    label: 'MORE',
    description: '設定やアプリ情報など',
    href: '/settings',
    icon: IoSettings,
  },
];

type HomePageProps = {
  params?: Promise<Record<string, never>>;
  searchParams?: Promise<Record<string, never>>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function HomePage(_props: HomePageProps = {}) {
  // Next.js 16ではparamsとsearchParamsがPromise型
  // このページでは使用しないが、型定義を追加して開発ツールのエラーを防ぐ

  const { user, loading } = useAuth();
  const router = useRouter();
  const [splashVisible, setSplashVisible] = useState(true);
  const [checkingConsent, setCheckingConsent] = useState(true);
  const { isChristmasMode } = useChristmasMode();
  const { isVisible } = useHomeFeatureVisibility();
  const { items: inventoryItems } = useInventory();
  const reorderCount = countReorderItems(inventoryItems);
  const visibleActions = ACTIONS.filter((action) => isVisible(action.key)).map((action) =>
    action.key === 'inventory' ? { ...action, badge: reorderCount > 0 ? `要発注${reorderCount}` : undefined } : action
  );

  // スプラッシュ画面の表示時間を管理（フェードアウト時間を加味）
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashVisible(false);
    }, SPLASH_DISPLAY_TIME + 300);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // 同意状態をチェック
  useEffect(() => {
    async function checkUserConsent() {
      if (!user) return;

      try {
        const userData = await getUserData(user.uid);
        if (needsConsent(userData.userConsent)) {
          // 同意が必要な場合は同意画面へリダイレクト
          router.push('/consent');
          return;
        }
      } catch (error) {
        console.error('同意状態の確認に失敗:', error);
      }

      setCheckingConsent(false);
    }

    if (!loading && user) {
      checkUserConsent();
    } else if (!loading && !user) {
      // ログインページにリダイレクトされるまでの間、ローディング状態を解除
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCheckingConsent(false);
    }
  }, [user, loading, router]);

  // スプラッシュ表示中はLoadingを出さない（スプラッシュが前面に表示されるため）
  if ((loading || checkingConsent) && !splashVisible) {
    return <Loading />;
  }

  if (!user) {
    return null;
  }

  return (
    <div
      className={`h-dvh flex flex-col overflow-hidden animate-home-page relative transition-colors duration-1000 bg-page text-ink ${
        isChristmasMode ? 'bg-[radial-gradient(circle_at_center,_#0a2f1a_0%,_#051a0e_100%)]' : ''
      }`}
    >
      {isChristmasMode && <Snowfall />}

      {/* ノイズテクスチャ (高級感の演出) */}
      {isChristmasMode && (
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
          style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }}
        ></div>
      )}

      {/* ヘッダー */}
      <HomeHeader />

      {/* メインコンテンツ */}
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-2 pb-2 sm:px-6 sm:pt-3 sm:pb-3 flex-1 min-h-0">
        <div className="flex h-full flex-col gap-2 md:grid md:h-auto md:grid-cols-4 md:gap-4 md:[grid-auto-rows:1fr]">
          {visibleActions.map(({ key, title, label, description, href, icon: DefaultIcon, badge }, index) => {
            const Icon = isChristmasMode ? CHRISTMAS_ICONS[key] || DefaultIcon : DefaultIcon;

            return (
              <ActionCard
                key={key}
                title={title}
                label={label}
                description={description}
                href={href}
                icon={Icon}
                badge={badge}
                index={index}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
