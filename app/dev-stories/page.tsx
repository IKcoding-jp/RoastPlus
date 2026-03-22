'use client';

import React from 'react';

import { RiLightbulbFlashFill } from 'react-icons/ri';
import { FloatingNav } from '@/components/ui';
import { EpisodeCard } from '@/components/dev-stories/EpisodeCard';
import { getSortedEpisodes } from '@/data/dev-stories/episodes';

export default function DevStoriesPage() {
  const episodes = getSortedEpisodes();

  return (
    <div className="h-screen overflow-y-hidden flex flex-col px-3 sm:px-6 lg:px-8 pt-14 pb-2 sm:pb-3 lg:pb-4 bg-page transition-colors duration-1000">
      <FloatingNav backHref="/" />
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0">
        <main className="flex-1 min-h-0 overflow-y-auto pb-20 sm:pb-0">
          {episodes.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-ground rounded-full">
                  <RiLightbulbFlashFill className="h-12 w-12 text-ink-muted" />
                </div>
              </div>
              <p className="text-ink-sub">まだエピソードがありません</p>
              <p className="text-sm text-ink-muted mt-2">新しいエピソードをお楽しみに！</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {episodes.map((episode) => (
                <EpisodeCard key={episode.id} episode={episode} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
