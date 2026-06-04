'use client';

import { useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import { HiCog6Tooth } from 'react-icons/hi2';
import { MdSchedule, MdVolumeUp } from 'react-icons/md';
import { BackLink, Button, IconButton } from '@/components/ui';
import { useClockSettings } from '@/hooks/useClockSettings';
import { ClockSettingsModal } from '@/components/clock/ClockSettingsModal';
import { NextChimeStrip } from '@/components/clock/NextChimeStrip';
import { WorkChimeAlert } from '@/components/clock/WorkChimeAlert';
import { WorkChimeScheduleModal } from '@/components/clock/WorkChimeScheduleModal';
import { useWorkChime } from '@/hooks/useWorkChime';
import { getThemeColors, getFontFamily, getFontWidthFactor, getScaledClamp } from '@/lib/clockSettings';
import type { DueWorkChime, WorkChimeKind } from '@/lib/workChime';

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

function getPreviewChime(): DueWorkChime | null {
  if (typeof window === 'undefined') return null;

  const preview = new URLSearchParams(window.location.search).get('previewChime');
  const previews: Record<string, { time: string; kind: WorkChimeKind; label: string; message: string }> = {
    break: { time: '10:45', kind: 'break', label: '休憩開始', message: '休憩時間です' },
    work: { time: '10:00', kind: 'work-start', label: '作業開始', message: '作業開始です' },
    cleanup: { time: '16:35', kind: 'cleanup-start', label: '掃除開始', message: '掃除開始です' },
  };
  const target = preview ? previews[preview] : null;

  if (!target) return null;

  return {
    period: {
      id: `preview-${preview}`,
      start: target.time,
      end: target.time,
      kind: target.kind === 'break' ? 'break' : target.kind === 'cleanup-start' ? 'cleanup' : 'work',
    },
    time: target.time,
    kind: target.kind,
    label: target.label,
    playKey: `preview-${preview}`,
    message: target.message,
  };
}

function formatTime(date: Date, use24Hour: boolean): { h: string; m: string; s: string; ampm?: string } {
  let hours = date.getHours();
  let ampm: string | undefined;

  if (!use24Hour) {
    ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
  }

  return {
    h: String(hours).padStart(2, '0'),
    m: String(date.getMinutes()).padStart(2, '0'),
    s: String(date.getSeconds()).padStart(2, '0'),
    ampm,
  };
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const day = DAY_NAMES[date.getDay()];
  return `${y}/${m}/${d} (${day})`;
}

function useCurrentTime() {
  const subscribe = useCallback((callback: () => void) => {
    const timer = setInterval(callback, 1000);
    return () => clearInterval(timer);
  }, []);

  const getSnapshot = useCallback(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
  }, []);

  const getServerSnapshot = useCallback(() => '', []);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!snapshot) return null;
  return new Date();
}

export default function ClockPage() {
  const now = useCurrentTime();
  const { settings, isLoaded, updateSettings, resetSettings } = useClockSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [showWorkChimeSchedule, setShowWorkChimeSchedule] = useState(false);
  const {
    settings: workChimeSettings,
    currentPeriod,
    nextChime,
    activeChime,
    isAudioEnabled,
    enableAudio,
    testWorkChime,
    updateSettings: updateWorkChimeSettings,
    dismissActiveChime,
  } = useWorkChime(now);
  const [previewChime, setPreviewChime] = useState<DueWorkChime | null>(() => getPreviewChime());
  useEffect(() => {
    if (!previewChime) return;

    const timer = window.setTimeout(() => {
      setPreviewChime(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [previewChime]);
  const displayedChime = previewChime ?? activeChime;
  const shouldShowAudioEnableButton =
    !displayedChime && workChimeSettings.enabled && workChimeSettings.soundEnabled && !isAudioEnabled;

  const handleTestWorkChime = useCallback(
    (kind: WorkChimeKind) => {
      setShowSettings(false);
      testWorkChime(kind);
    },
    [testWorkChime]
  );

  const colors = getThemeColors(settings.theme);
  const fontFamily = getFontFamily(settings.fontKey);
  const scale = settings.fontScale;
  const wf = getFontWidthFactor(settings.fontKey);

  if (!now || !isLoaded) {
    return (
      <div className="flex items-center justify-center h-dvh" style={{ backgroundColor: colors.bg }}>
        <div className="flex items-center gap-3">
          <div
            className="h-5 w-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: colors.accent, borderTopColor: 'transparent' }}
          />
          <span className="text-lg" style={{ color: colors.uiText }}>
            読み込み中...
          </span>
        </div>
      </div>
    );
  }

  const time = formatTime(now, settings.use24Hour);

  return (
    <div
      className="flex flex-col items-center justify-center h-dvh select-none relative"
      style={{ backgroundColor: colors.bg }}
    >
      {/* ヘッダー：戻るボタン＋設定ボタン */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <BackLink href="/" variant="icon-only" aria-label="ホームに戻る" />
      </div>

      <div className="absolute top-4 right-20 sm:top-6 sm:right-24">
        <IconButton
          variant="ghost"
          rounded
          onClick={() => setShowWorkChimeSchedule(true)}
          aria-label="チャイム時刻設定"
        >
          <MdSchedule className="h-6 w-6" style={{ color: colors.uiText }} />
        </IconButton>
      </div>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <IconButton variant="ghost" rounded onClick={() => setShowSettings(true)} aria-label="時計の設定">
          <HiCog6Tooth className="h-6 w-6" style={{ color: colors.uiText }} />
        </IconButton>
      </div>

      {/* 時計表示エリア */}
      <div className="text-center">
        {/* AM/PM 表示（12時間モード時） */}
        {!settings.use24Hour && time.ampm && (
          <p
            className="font-bold tracking-widest mb-2"
            style={{
              fontSize: getScaledClamp(1.5, 5, scale, wf),
              fontFamily,
              color: colors.accent,
            }}
          >
            {time.ampm}
          </p>
        )}

        {/* デジタル時計 */}
        <time
          className="flex items-baseline justify-center gap-1 leading-none"
          style={{ fontFamily, fontFeatureSettings: '"tnum"' }}
          dateTime={now.toISOString()}
        >
          <span className="font-black" style={{ fontSize: getScaledClamp(6, 28, scale, wf), color: colors.text }}>
            {time.h}
          </span>
          <span className="font-black" style={{ fontSize: getScaledClamp(4, 18, scale, wf), color: colors.accent }}>
            :
          </span>
          <span className="font-black" style={{ fontSize: getScaledClamp(6, 28, scale, wf), color: colors.text }}>
            {time.m}
          </span>
          {settings.showSeconds && (
            <span
              className="font-black ml-1"
              style={{ fontSize: getScaledClamp(2.5, 10, scale, wf), color: colors.accentSub }}
            >
              {time.s}
            </span>
          )}
        </time>

        {/* 日付表示 */}
        {settings.showDate && (
          <p
            className="mt-4 sm:mt-6 font-bold tracking-widest"
            style={{
              fontSize: getScaledClamp(1.5, 5, scale, wf),
              fontFamily,
              color: colors.dateText,
            }}
          >
            {formatDate(now)}
          </p>
        )}

        {/* アクセントライン */}
        <div
          className="mt-6 sm:mt-8 mx-auto w-24 sm:w-32 h-1 rounded-full opacity-60"
          style={{
            background: `linear-gradient(to right, ${colors.accentSub}, ${colors.accent}, ${colors.accentSub})`,
          }}
        />

        {!displayedChime && workChimeSettings.enabled && (
          <NextChimeStrip currentPeriod={currentPeriod} nextChime={nextChime} colors={colors} />
        )}

        {shouldShowAudioEnableButton && (
          <div className="mt-4 flex justify-center px-4">
            <div
              className="grid w-full max-w-lg grid-cols-[auto_1fr] items-center gap-3 rounded-2xl border p-3 text-left shadow-card sm:grid-cols-[auto_1fr_auto] sm:p-3.5"
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.accent,
              }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `${colors.accent}20`,
                  color: colors.accent,
                }}
                aria-hidden="true"
              >
                <MdVolumeUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold leading-snug" style={{ color: colors.text }}>
                  チャイム音の準備が必要です
                </p>
                <p className="mt-0.5 text-xs font-medium leading-relaxed" style={{ color: colors.uiText }}>
                  iPadの制限により、初回だけボタン操作で音を有効化します。
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={enableAudio}
                className="col-span-2 mt-1 w-full !min-h-11 !px-4 sm:col-span-1 sm:mt-0 sm:w-auto"
                style={{
                  backgroundColor: colors.accent,
                  color: '#FFFFFF',
                }}
              >
                <MdVolumeUp className="mr-1.5 h-4 w-4" aria-hidden="true" />
                音を有効化
              </Button>
            </div>
          </div>
        )}
      </div>

      <WorkChimeAlert
        chime={displayedChime}
        colors={colors}
        onClose={previewChime ? () => setPreviewChime(null) : dismissActiveChime}
      />

      {/* 設定モーダル */}
      <ClockSettingsModal
        show={showSettings}
        settings={settings}
        workChimeSettings={workChimeSettings}
        isWorkChimeAudioEnabled={isAudioEnabled}
        onUpdate={updateSettings}
        onWorkChimeUpdate={updateWorkChimeSettings}
        onEnableWorkChimeAudio={enableAudio}
        onTestWorkChime={handleTestWorkChime}
        onReset={resetSettings}
        onClose={() => setShowSettings(false)}
      />

      <WorkChimeScheduleModal
        show={showWorkChimeSchedule}
        settings={workChimeSettings}
        onUpdate={updateWorkChimeSettings}
        onClose={() => setShowWorkChimeSchedule(false)}
      />
    </div>
  );
}
