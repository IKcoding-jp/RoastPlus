'use client';

import { HiCog6Tooth } from 'react-icons/hi2';
import { MdNotificationsActive } from 'react-icons/md';
import { Button, FloatingNav } from '@/components/ui';
import type { ThemeColors } from '@/lib/clockSettings';

interface ClockHeaderNavProps {
  /** 現在の時計テーマ色（uiBg/uiText を使用） */
  colors: ThemeColors;
  /** チャイム時刻設定モーダルを開く */
  onOpenChimeSchedule: () => void;
  /** 時計の表示設定モーダルを開く */
  onOpenSettings: () => void;
}

/**
 * 時計ページのヘッダーナビ。
 * 左上＝アプリ共通の戻る（FloatingNav）、右上＝ラベル付きテーマ追従ピル2つ。
 */
export function ClockHeaderNav({ colors, onOpenChimeSchedule, onOpenSettings }: ClockHeaderNavProps) {
  // 規約 local/no-raw-button に従い Button を使用。色はテーマ追従のためインラインstyleで上書き。
  const pillClassName = 'gap-2 !rounded-full !px-3.5 active:scale-95';
  const pillStyle = { backgroundColor: colors.uiBg, color: colors.uiText };

  return (
    <FloatingNav
      backHref="/"
      right={
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenChimeSchedule}
            aria-label="チャイム時刻設定"
            className={pillClassName}
            style={pillStyle}
          >
            <MdNotificationsActive className="h-5 w-5" aria-hidden="true" />
            チャイム
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            aria-label="時計の設定"
            className={pillClassName}
            style={pillStyle}
          >
            <HiCog6Tooth className="h-5 w-5" aria-hidden="true" />
            表示
          </Button>
        </>
      }
    />
  );
}
