'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Coffee, Plus, Faders } from 'phosphor-react';
import type { AppData, TastingRecord, TastingSession } from '@/types';
import { TastingSessionCarousel } from './TastingSessionCarousel';
import { TastingSessionFilterModal } from './TastingSessionFilterModal';
import { useMembers, getActiveMembers } from '@/hooks/useMembers';
import { useAuth } from '@/lib/auth';
import { useTastingFilters } from '@/hooks/useTastingFilters';
import { motion } from 'framer-motion';
import { Button, IconButton, EmptyState } from '@/components/ui';
import { useToastContext } from '@/components/Toast';

const SAMPLE_TASTING_PREFIX = 'sample-tasting-';

const SAMPLE_SESSIONS = [
  {
    beanName: 'エチオピア イルガチェフェ',
    roastLevel: '浅煎り',
    comments: [
      '花のような香りが強く、冷めるとレモンティーのような明るさが出ました。',
      '酸味はきれいだけど少し軽め。朝の一杯にちょうどよさそうです。',
      '香りの印象が一番残りました。甘みは控えめで後味がすっきりしています。',
      '口に含んだ瞬間は華やかで、後半は少し紅茶っぽい余韻でした。',
      '苦味が少ないので飲みやすいです。浅煎りが苦手な人にも説明しやすそう。',
      '香りはかなり良いですが、もう少し甘さがあるとさらに好みです。',
      '冷めてからの透明感がよく、試飲の変化を見るには面白い豆でした。',
      '軽やかで明るい印象。お菓子と合わせるより単体で飲みたいです。',
    ],
  },
  {
    beanName: 'ブラジル ショコラ',
    roastLevel: '中煎り',
    comments: [
      'ナッツ感とチョコっぽさがあって飲みやすいです。ミルクにも合いそう。',
      '酸味が少なく、苦味も丸いので万人向けに感じました。',
      '香りは穏やかですが、甘みとコクのバランスが良かったです。',
      '後味に少しカカオ感が残ります。毎日飲むならこれが一番安定しそう。',
      '派手さはないけど安心感があります。ホットでもアイスでも使いやすそう。',
      '口当たりがやわらかく、苦味が尖っていないところが良いです。',
      'もう少し香りが立つと嬉しいですが、味のまとまりは高いと思います。',
      'ミルクを入れても味が消えなさそう。店頭向けに使いやすい印象です。',
    ],
  },
  {
    beanName: 'グアテマラ アンティグア',
    roastLevel: '中深煎り',
    comments: [
      'ココアのような厚みがあり、後半に少しスパイス感がありました。',
      '苦味と甘みのバランスがよく、ホットでゆっくり飲みたい味です。',
      '口当たりがしっかりしていて、余韻も長めに残りました。',
      '香ばしさが前に出ますが、重すぎないので飲み疲れしにくいです。',
      '甘い焼き菓子と合わせると良さそう。酸味は控えめでした。',
      '中深煎りらしいコクがあり、後味に少しビター感が残ります。',
      '香りよりも味の厚みが印象的でした。安定した人気が出そうです。',
      '温度が下がっても薄くならず、最後までコーヒー感が残りました。',
    ],
  },
  {
    beanName: 'コロンビア ウィラ',
    roastLevel: '中煎り',
    comments: [
      '赤い果実っぽい酸味がありつつ、甘みもあって飲みやすいです。',
      '温度が下がると酸味が少し前に出ます。香りは華やかでした。',
      '全体的にまとまりがよく、試飲会でも説明しやすそうです。',
      '酸味と甘みのバランスがよく、明るいけど尖っていない印象です。',
      '飲み始めは軽く、後味に少しシロップのような甘さが残りました。',
      '香りは控えめですが、味の輪郭が分かりやすいです。',
      '冷めると果実感が出てきて、時間変化を見るのが楽しい豆でした。',
      '苦味が弱めなので、酸味を楽しみたい人にすすめやすいと思います。',
    ],
  },
  {
    beanName: 'インドネシア マンデリン',
    roastLevel: '深煎り',
    comments: [
      '重めのボディとハーブっぽい香りがあり、かなり個性的でした。',
      '苦味はしっかりありますが、嫌な焦げ感は少ないです。',
      '余韻が長く、アイスコーヒーにしても存在感が残りそうです。',
      '土っぽさとスパイス感があり、好き嫌いは分かれそうですが印象的です。',
      'ミルクを入れると丸くなりそう。ブラックだとかなり力強いです。',
      '苦味の奥に甘さがあり、深煎り好きには刺さりそうです。',
      '香りに独特の重さがあります。食後の一杯に向いていそうです。',
      '後味が長く続くので、少量でも満足感がありました。',
    ],
  },
] as const;

const SAMPLE_REVIEWERS = [
  { id: `${SAMPLE_TASTING_PREFIX}member-1`, name: '佐藤' },
  { id: `${SAMPLE_TASTING_PREFIX}member-2`, name: '飯田' },
  { id: `${SAMPLE_TASTING_PREFIX}member-3`, name: '鈴木' },
  { id: `${SAMPLE_TASTING_PREFIX}member-4`, name: '田中' },
  { id: `${SAMPLE_TASTING_PREFIX}member-5`, name: '高橋' },
  { id: `${SAMPLE_TASTING_PREFIX}member-6`, name: '伊藤' },
  { id: `${SAMPLE_TASTING_PREFIX}member-7`, name: '中村' },
  { id: `${SAMPLE_TASTING_PREFIX}member-8`, name: '小林' },
];

interface TastingSessionListProps {
  data: AppData;
  onUpdate?: (newDataOrUpdater: AppData | ((currentData: AppData) => AppData)) => Promise<void> | void;
  sampleButtonContainerId?: string;
  filterButtonContainerId?: string;
  filterButtonContainerIdMobile?: string;
}

export function TastingSessionList({
  data,
  onUpdate,
  sampleButtonContainerId,
  filterButtonContainerId,
  filterButtonContainerIdMobile,
}: TastingSessionListProps) {
  const { showToast } = useToastContext();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.uid ?? null;
  const { members: allMembers, manager } = useMembers(userId);

  const tastingSessions = useMemo(
    () => (Array.isArray(data.tastingSessions) ? data.tastingSessions : []),
    [data.tastingSessions]
  );
  const tastingRecords = useMemo(
    () => (Array.isArray(data.tastingRecords) ? data.tastingRecords : []),
    [data.tastingRecords]
  );

  const activeMemberCount = getActiveMembers(allMembers).length + (manager ? 1 : 0);
  const [isEmptyPreview, setIsEmptyPreview] = useState(false);
  const visibleTastingSessions = isEmptyPreview ? [] : tastingSessions;
  const visibleTastingRecords = isEmptyPreview ? [] : tastingRecords;

  const {
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    selectedRoastLevels,
    setSelectedRoastLevels,
    filteredAndSortedSessions,
    activeFilterCount,
  } = useTastingFilters(visibleTastingSessions);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [containers, setContainers] = useState<{
    sample: HTMLElement | null;
    desktop: HTMLElement | null;
    mobile: HTMLElement | null;
  }>({ sample: null, desktop: null, mobile: null });
  const showDevDataButtons = process.env.NODE_ENV !== 'production' && !!onUpdate;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ハイドレーション後のポータル有効化に必要
    setMounted(true);
    const updateContainers = () => {
      const desktopEl = filterButtonContainerId ? document.getElementById(filterButtonContainerId) : null;
      const sampleEl = sampleButtonContainerId ? document.getElementById(sampleButtonContainerId) : null;
      const mobileEl = filterButtonContainerIdMobile ? document.getElementById(filterButtonContainerIdMobile) : null;

      setContainers({
        sample: sampleEl && sampleEl.getBoundingClientRect().width > 0 ? sampleEl : null,
        desktop: desktopEl && desktopEl.getBoundingClientRect().width > 0 ? desktopEl : null,
        mobile: mobileEl && mobileEl.getBoundingClientRect().width > 0 ? mobileEl : null,
      });
    };

    updateContainers();
    const timer = setTimeout(updateContainers, 100);
    window.addEventListener('resize', updateContainers);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateContainers);
    };
  }, [sampleButtonContainerId, filterButtonContainerId, filterButtonContainerIdMobile]);

  // AI分析結果をFirestoreに保存するコールバック
  const handleUpdateSession = async (sessionId: string, aiAnalysis: string, recordCount: number) => {
    if (!onUpdate) return;

    try {
      await onUpdate((currentData) => {
        const updatedSessions = currentData.tastingSessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                aiAnalysis,
                aiAnalysisUpdatedAt: new Date().toISOString(),
                aiAnalysisRecordCount: recordCount,
              }
            : session
        );

        return {
          ...currentData,
          tastingSessions: updatedSessions,
        };
      });
    } catch (error) {
      console.error('Failed to save tasting session:', error);
      showToast('試飲セッションの保存に失敗しました。通信を確認してもう一度お試しください。', 'error');
    }
  };

  const handleApplyFilters = (filters: {
    searchQuery: string;
    sortOption: 'newest' | 'oldest' | 'beanName';
    dateFrom: string;
    dateTo: string;
    selectedRoastLevels: Array<'浅煎り' | '中煎り' | '中深煎り' | '深煎り'>;
  }) => {
    setSearchQuery(filters.searchQuery);
    setSortOption(filters.sortOption);
    setDateFrom(filters.dateFrom);
    setDateTo(filters.dateTo);
    setSelectedRoastLevels(filters.selectedRoastLevels);
  };

  const handleAddSampleData = () => {
    if (!onUpdate) return;

    const now = new Date('2026-02-08T09:00:00.000Z');
    const ownerId = userId ?? `${SAMPLE_TASTING_PREFIX}user`;
    const sampleMembers = [
      ...(manager ? [{ id: manager.id, name: manager.name }] : []),
      ...getActiveMembers(allMembers).map((member) => ({ id: member.id, name: member.name })),
    ];
    const existingReviewerIds = new Set(sampleMembers.map((member) => member.id));
    const reviewers = [
      ...sampleMembers,
      ...SAMPLE_REVIEWERS.filter((member) => !existingReviewerIds.has(member.id)),
    ].slice(0, 8);

    const sampleSessions: TastingSession[] = SAMPLE_SESSIONS.map((session, sessionIndex) => {
      const createdAt = new Date(now);
      createdAt.setDate(now.getDate() - sessionIndex);

      return {
        id: `${SAMPLE_TASTING_PREFIX}session-${sessionIndex + 1}`,
        beanName: session.beanName,
        roastLevel: session.roastLevel,
        memo: '見た目確認用のテストデータです。',
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
        userId: ownerId,
        aiAnalysis: `${session.beanName}は、${session.comments[0]} 複数人の感想でも方向性が揃っており、現場で共有しやすいサンプルです。`,
        aiAnalysisUpdatedAt: createdAt.toISOString(),
        aiAnalysisRecordCount: reviewers.length,
      };
    });

    const sampleRecords: TastingRecord[] = SAMPLE_SESSIONS.flatMap((session, sessionIndex) => {
      const tastingDate = new Date(now);
      tastingDate.setDate(now.getDate() - sessionIndex);
      const dateText = tastingDate.toISOString().split('T')[0];

      return reviewers.map((reviewer, reviewerIndex) => {
        const createdAt = new Date(tastingDate);
        createdAt.setHours(9 + reviewerIndex, 15, 0, 0);
        const base = 3 + ((sessionIndex + reviewerIndex) % 3);

        return {
          id: `${SAMPLE_TASTING_PREFIX}record-${sessionIndex + 1}-${reviewerIndex + 1}`,
          sessionId: `${SAMPLE_TASTING_PREFIX}session-${sessionIndex + 1}`,
          beanName: session.beanName,
          tastingDate: dateText,
          roastLevel: session.roastLevel,
          bitterness: Math.min(5, session.roastLevel === '深煎り' ? base + 1 : base),
          acidity: Math.max(1, session.roastLevel === '浅煎り' ? base + 1 : base - 1),
          body: Math.min(5, session.roastLevel === '深煎り' || session.roastLevel === '中深煎り' ? base + 1 : base),
          sweetness: Math.min(5, base),
          aroma: Math.min(5, session.roastLevel === '浅煎り' ? base + 1 : base),
          overallRating: Math.min(5, base),
          overallImpression: `${reviewer.name}: ${session.comments[reviewerIndex]}`,
          createdAt: createdAt.toISOString(),
          updatedAt: createdAt.toISOString(),
          userId: ownerId,
          memberId: reviewer.id,
        };
      });
    });

    onUpdate((currentData) => ({
      ...currentData,
      tastingSessions: [
        ...currentData.tastingSessions.filter((session) => !session.id.startsWith(SAMPLE_TASTING_PREFIX)),
        ...sampleSessions,
      ],
      tastingRecords: [
        ...currentData.tastingRecords.filter((record) => !record.id.startsWith(SAMPLE_TASTING_PREFIX)),
        ...sampleRecords,
      ],
    }))?.catch((error) => {
      console.error('Failed to add sample data:', error);
    });
  };

  const filterButtonDesktop = (
    <Button
      variant="surface"
      size="sm"
      onClick={() => setIsFilterModalOpen(true)}
      badge={activeFilterCount}
      title="フィルター"
      aria-label="フィルター"
      className="!px-3 !py-2 gap-1.5"
    >
      <Faders size={20} weight={activeFilterCount > 0 ? 'fill' : 'bold'} />
      <span className="text-xs sm:text-sm whitespace-nowrap">フィルター</span>
    </Button>
  );

  const devDataButtonsDesktop = showDevDataButtons ? (
    <div className="flex items-center gap-2">
      {tastingSessions.length > 0 && (
        <Button
          variant="surface"
          size="sm"
          onClick={() => setIsEmptyPreview((current) => !current)}
          className="!px-3 !py-2 gap-1.5"
        >
          <span className="text-xs sm:text-sm whitespace-nowrap">
            {isEmptyPreview ? '元の表示に戻す' : '空表示を確認'}
          </span>
        </Button>
      )}
      <Button variant="surface" size="sm" onClick={handleAddSampleData} className="!px-3 !py-2 gap-1.5">
        <span className="text-xs sm:text-sm whitespace-nowrap">テストデータを追加</span>
      </Button>
    </div>
  ) : null;

  const filterButtonMobile = (
    <IconButton variant="surface" onClick={() => setIsFilterModalOpen(true)} aria-label="フィルター">
      <Faders size={22} weight={activeFilterCount > 0 ? 'fill' : 'bold'} />
    </IconButton>
  );

  if (visibleTastingSessions.length === 0) {
    return (
      <div className="min-h-[calc(100dvh-96px)] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
          <EmptyState
            size="md"
            className="mx-auto max-w-sm"
            icon={<Coffee size={40} weight="duotone" />}
            title={isEmptyPreview ? '空表示プレビュー中' : '試飲感想がありません'}
            description={isEmptyPreview ? '実データはそのままです。' : '最初の試飲感想を追加してください。'}
            action={
              <div className="flex flex-col gap-3">
                {isEmptyPreview ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setIsEmptyPreview(false)}
                    className="justify-center"
                  >
                    元の表示に戻す
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => router.push('/tasting/sessions/new')}
                    className="gap-2 justify-center"
                  >
                    <Plus size={18} weight="bold" />
                    試飲感想を追加
                  </Button>
                )}

                {showDevDataButtons && !isEmptyPreview && (
                  <Button variant="surface" size="sm" onClick={handleAddSampleData} className="justify-center">
                    テストデータを追加
                  </Button>
                )}
              </div>
            }
          />
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* フィルターボタンを外部コンテナにPortalでレンダリング */}
      {mounted && containers.sample && devDataButtonsDesktop && createPortal(devDataButtonsDesktop, containers.sample)}
      {mounted && containers.desktop && createPortal(filterButtonDesktop, containers.desktop)}
      {mounted && containers.mobile && createPortal(filterButtonMobile, containers.mobile)}

      <div className="h-full flex flex-col min-h-0">
        {/* フィルターモーダル */}
        <TastingSessionFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          searchQuery={searchQuery}
          sortOption={sortOption}
          dateFrom={dateFrom}
          dateTo={dateTo}
          selectedRoastLevels={selectedRoastLevels}
          onApply={handleApplyFilters}
        />

        <div className="flex-1 min-h-0 overflow-y-hidden pt-4 pb-2">
          <TastingSessionCarousel
            sessions={filteredAndSortedSessions}
            tastingRecords={visibleTastingRecords}
            activeMemberCount={activeMemberCount}
            onUpdateSession={handleUpdateSession}
          />
        </div>
      </div>
    </>
  );
}
