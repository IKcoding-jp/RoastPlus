'use client';

import React from 'react';
import Image from 'next/image';
import type { CharacterId } from '@/types';
import { CHARACTERS } from '@/data/dev-stories/characters';

interface CharacterAvatarProps {
  characterId: CharacterId;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CONFIG = {
  sm: { className: 'w-14 h-14', pixels: 56 },
  md: { className: 'w-20 h-20', pixels: 80 },
  lg: { className: 'w-24 h-24', pixels: 96 },
};

// アバター画像のパス
const AVATAR_PATHS: Record<CharacterId, string> = {
  asairi: '/avatars/asairi.png',
  fukairi: '/avatars/hukairi.png',
  dori: '/avatars/dori.png',
  server: '/avatars/server.png',
  mill: '/avatars/mill.png',
  kettle: '/avatars/kettle.png',
  press: '/avatars/press.png',
  siphon: '/avatars/siphon.png',
};

// キャラクターごとのエモジ（画像がない場合のフォールバック）
const CHARACTER_EMOJI: Record<CharacterId, string> = {
  asairi: '🌰',
  fukairi: '🕶️',
  dori: '☕',
  server: '🫖',
  mill: '⚙️',
  kettle: '🔥',
  press: '🏺',
  siphon: '🔬',
};

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({ characterId, size = 'md', className = '' }) => {
  const character = CHARACTERS[characterId];
  const sizeConfig = SIZE_CONFIG[size];
  const avatarPath = AVATAR_PATHS[characterId];
  const emoji = CHARACTER_EMOJI[characterId];

  // フカイリとドリは画像が小さいので少し拡大
  const scale = characterId === 'fukairi' || characterId === 'dori' ? 'scale-125' : '';

  // 全キャラクターに画像あり
  const hasImage = true;

  if (hasImage) {
    return (
      <div
        className={`${sizeConfig.className} rounded-full overflow-hidden flex-shrink-0 ${className}`}
        title={character.name}
        aria-label={character.name}
      >
        <Image
          src={avatarPath}
          alt={character.name}
          width={sizeConfig.pixels}
          height={sizeConfig.pixels}
          className={`w-full h-full object-cover ${scale}`}
        />
      </div>
    );
  }

  // 画像がないキャラクターはエモジとカラフルな背景で表示
  return (
    <div
      className={`${sizeConfig.className} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center ${className}`}
      style={{ backgroundColor: character.bubbleColor }}
      title={character.name}
      aria-label={character.name}
    >
      <span className={`${size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-3xl' : 'text-2xl'}`}>{emoji}</span>
    </div>
  );
};
