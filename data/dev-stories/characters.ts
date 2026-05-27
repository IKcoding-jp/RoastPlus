import type { Character, CharacterId, CharacterPairInfo } from '@/types';

// キャラクター設定
export const CHARACTERS: Record<CharacterId, Character> = {
  // ========================================
  // episode-001: フカイリ & アサイリ（オリジナル）
  // ========================================
  asairi: {
    id: 'asairi',
    name: 'アサイリ',
    shortName: 'アサイリ',
    position: 'left',
    bubbleColor: '#FEF3C7', // amber-100
    textColor: '#92400E', // amber-800
  },
  fukairi: {
    id: 'fukairi',
    name: 'フカイリ',
    shortName: 'フカイリ',
    position: 'right',
    bubbleColor: '#E5E7EB', // gray-200
    textColor: '#1F2937', // gray-800
  },

  // ========================================
  // episode-002: ドリ & サーバ（バイブコーディング）
  // ========================================
  dori: {
    id: 'dori',
    name: 'ドリ',
    shortName: 'ドリ',
    position: 'left',
    bubbleColor: '#FDF2E9', // テラコッタ系・陶器の温かみ
    textColor: '#7C4A03',
  },
  server: {
    id: 'server',
    name: 'サーバ',
    shortName: 'サーバ',
    position: 'right',
    bubbleColor: '#E8F4F8', // 透明感あるガラス系
    textColor: '#1E5F74',
  },

  // ========================================
  // episode-003: ミル & ケトル（技術移行）
  // ========================================
  mill: {
    id: 'mill',
    name: 'ミル',
    shortName: 'ミル',
    position: 'left',
    bubbleColor: '#F5F0EB', // 木目・ナチュラルウッド
    textColor: '#5D4E37',
  },
  kettle: {
    id: 'kettle',
    name: 'ケトル',
    shortName: 'ケトル',
    position: 'right',
    bubbleColor: '#F0F4F5', // ステンレス・メタリック
    textColor: '#374151',
  },

  // ========================================
  // episode-004: プレス & サイフォン（AIの未来）
  // ========================================
  press: {
    id: 'press',
    name: 'プレス',
    shortName: 'プレス',
    position: 'left',
    bubbleColor: '#EDE9E3', // 真鍮・アンティークゴールド
    textColor: '#6B5D4D',
  },
  siphon: {
    id: 'siphon',
    name: 'サイフォン',
    shortName: 'サイフォン',
    position: 'right',
    bubbleColor: '#F8F4FF', // 科学実験器具・クリアパープル
    textColor: '#4C3D6E',
  },
};

// エピソードごとのキャラクターペア設定
const EPISODE_CHARACTER_PAIRS: Record<string, CharacterPairInfo> = {
  'episode-001': {
    left: {
      id: 'asairi',
      name: 'アサイリ',
      emoji: '🌰',
      subtitle: 'やさしくて世話焼き、でも芯がある人',
      description:
        'いつも周りを気にかけて「大丈夫？」って自然に声をかけるタイプ。フカイリの危なっかしさを放っておけない、安心感のかたまり。',
    },
    right: {
      id: 'fukairi',
      name: 'フカイリ',
      emoji: '🕶️',
      subtitle: 'クール気取りの不器用な努力家',
      description: '無口で皮肉っぽいけど、内心はめちゃくちゃ真面目。実はアサイリをすごく信頼してる、情に厚い仲間想い。',
    },
    relationship:
      '🤝 幼なじみの相棒タイプ\n言葉が少なくても通じ合う二人。アサイリが日常担当、フカイリが裏方・決断担当。\nどちらかが欠けると成立しない、自然体の信頼関係。',
  },
  'episode-002': {
    left: {
      id: 'dori',
      name: 'ドリ',
      emoji: '☕',
      subtitle: '穏やかで丁寧、一滴一滴を大切にする観察者',
      description:
        '好奇心旺盛で細やかな観察眼を持つ。一滴一滴丁寧に抽出するように、物事をじっくり理解したがる。新しいことに興味津々だけど慎重派。',
    },
    right: {
      id: 'server',
      name: 'サーバ',
      emoji: '🫖',
      subtitle: '落ち着いて全体を見せる、包容力のある説明役',
      description:
        '物事を受け止めて全体像を見せるのが得意。ドリから流れてくる情報を整理して、わかりやすくまとめる。寛容で説明上手。',
    },
    relationship:
      '💧 抽出と受容の完璧なコンビ\nドリの細かい質問をサーバが優しく受け止める。\n穏やかで丁寧な会話で、新しい概念をゆっくり理解していく。',
  },
  'episode-003': {
    left: {
      id: 'mill',
      name: 'ミル',
      emoji: '⚙️',
      subtitle: 'ストレートで歯切れがいい、核心を砕く質問者',
      description:
        '問題を粉砕・分解するのが得意。複雑なことも細かく砕いて本質を見抜く。せっかち気味だけど的確。ガリガリと前に進むタイプ。',
    },
    right: {
      id: 'kettle',
      name: 'ケトル',
      emoji: '🔥',
      subtitle: '熱意をもって流れるように語る、情熱の解説者',
      description:
        '適温のタイミングで必要な情報を注ぐ。熱いパッションを持ちながらも、注ぎ口のように繊細なコントロールができる。話が上手で流れを作る。',
    },
    relationship:
      '⚡ 砕くミルと注ぐケトル\nミルがガシガシ質問し、ケトルが熱く語る。\nテンポよく歯切れのいい会話で、失敗と再構築を熱く語る。',
  },
  'episode-004': {
    left: {
      id: 'press',
      name: 'プレス',
      emoji: '🏺',
      subtitle: 'シンプルで直球、本質を絞り出す効率主義者',
      description:
        'ストレートにグイッと押し込む。複雑なことをシンプルに捉えたがる。効率重視でまどろっこしいのが苦手。圧力をかけて本質を絞り出す。',
    },
    right: {
      id: 'siphon',
      name: 'サイフォン',
      emoji: '🔬',
      subtitle: '知的で詩的、科学と美を語るロマンチスト',
      description:
        '科学的で美しいプロセスを大切にする。蒸気が上がって降りてくるように、物事を高い視点から俯瞰する。ロマンチストで未来志向。',
    },
    relationship:
      '🌌 シンプルと複雑の対比\nプレスが「要するに？」と聞き、サイフォンが深く広く語る。\nシンプル vs 深遠の対比で、未来をロマンチックに語る。',
  },
  'episode-006': {
    left: {
      id: 'press',
      name: 'プレス',
      emoji: '🏺',
      subtitle: 'シンプルで直球、本質を絞り出す効率主義者',
      description: 'ストレートにグイッと押し込む。複雑なことをシンプルに捉えたがる。',
    },
    right: {
      id: 'siphon',
      name: 'サイフォン',
      emoji: '🔬',
      subtitle: '知的で詩的、科学と美を語るロマンチスト',
      description: '科学的で美しいプロセスを大切にする。技術の進化を楽しむ。',
    },
    relationship: '🔧 シンプル vs 深遠\nプレスが「要するに？」と聞き、サイフォンが詳しく解説する。',
  },
};

// エピソードIDからキャラクターペアを取得
export const getCharacterPairByEpisodeId = (episodeId: string): CharacterPairInfo | undefined => {
  return EPISODE_CHARACTER_PAIRS[episodeId];
};
