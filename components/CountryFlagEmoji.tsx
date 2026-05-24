interface CountryFlagEmojiProps {
  countryName: string;
  className?: string;
}

// 国名と国旗のマッピング
const getCountryFlag = (countryName: string): string => {
  const flagMap: Record<string, string> = {
    ブラジル: '\u{1F1E7}\u{1F1F7}', // 🇧🇷
    ジャマイカ: '\u{1F1EF}\u{1F1F2}', // 🇯🇲
    ドミニカ: '\u{1F1E9}\u{1F1F2}', // 🇩🇲
    ベトナム: '\u{1F1FB}\u{1F1F3}', // 🇻🇳
    ハイチ: '\u{1F1ED}\u{1F1F9}', // 🇭🇹
    ペルー: '\u{1F1F5}\u{1F1EA}', // 🇵🇪
    エルサルバドル: '\u{1F1F8}\u{1F1FB}', // 🇸🇻
    グアテマラ: '\u{1F1EC}\u{1F1F9}', // 🇬🇹
    エチオピア: '\u{1F1EA}\u{1F1F9}', // 🇪🇹
    コロンビア: '\u{1F1E8}\u{1F1F4}', // 🇨🇴
    インドネシア: '\u{1F1EE}\u{1F1E9}', // 🇮🇩
    タンザニア: '\u{1F1F9}\u{1F1FF}', // 🇹🇿
    ルワンダ: '\u{1F1F7}\u{1F1FC}', // 🇷🇼
    マラウイ: '\u{1F1F2}\u{1F1FC}', // 🇲🇼
    インド: '\u{1F1EE}\u{1F1F3}', // 🇮🇳
  };

  return flagMap[countryName] || '';
};

export function CountryFlagEmoji({ countryName, className = '' }: CountryFlagEmojiProps) {
  const flag = getCountryFlag(countryName);

  if (!flag) {
    return null;
  }

  return (
    <span
      className={`emoji inline-block ${className}`}
      role="img"
      aria-label={`${countryName}の国旗`}
      style={{ minWidth: '16px', minHeight: '16px', display: 'inline-block', verticalAlign: 'middle' }}
    >
      {flag}
    </span>
  );
}
