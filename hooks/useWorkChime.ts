'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  isWorkChimeAudioReady,
  markWorkChimeAudioSuspect,
  playWorkChime,
  reviveWorkChimeAudio,
  unlockWorkChimeAudio,
} from '@/lib/workChimeAudio';
import {
  getCurrentWorkChimePeriod,
  getDueWorkChimeSince,
  getNextWorkChime,
  getWorkChimeMessage,
  getWorkChimeSettings,
  setWorkChimeSettings,
  type CurrentWorkChimePeriod,
  type DueWorkChime,
  type NextWorkChime,
  type WorkChimeKind,
  type WorkChimeSettings,
} from '@/lib/workChime';

interface UseWorkChimeReturn {
  settings: WorkChimeSettings;
  currentPeriod: CurrentWorkChimePeriod | null;
  nextChime: NextWorkChime | null;
  activeChime: DueWorkChime | null;
  isAudioEnabled: boolean;
  enableAudio: () => void;
  testWorkChime: (kind: WorkChimeKind) => void;
  updateSettings: (patch: Partial<WorkChimeSettings>) => void;
  dismissActiveChime: () => void;
}

function loadInitialSettings(): WorkChimeSettings {
  return getWorkChimeSettings();
}

function getTestChimeLabel(kind: WorkChimeKind): string {
  if (kind === 'break') return '休憩開始';
  if (kind === 'cleanup-start') return '掃除開始';
  if (kind === 'work-resume') return '作業再開';
  return '作業開始';
}

export function useWorkChime(now: Date | null): UseWorkChimeReturn {
  const [settings, setSettings] = useState<WorkChimeSettings>(loadInitialSettings);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [activeChime, setActiveChime] = useState<DueWorkChime | null>(null);
  const playedKeysRef = useRef<string[]>([]);
  const previousNowRef = useRef<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissActiveChime = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setActiveChime(null);
  }, []);

  const enableAudio = useCallback(() => {
    void unlockWorkChimeAudio().then(setIsAudioEnabled);
  }, []);

  const updateSettings = useCallback((patch: Partial<WorkChimeSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      setWorkChimeSettings(next);
      return next;
    });
  }, []);

  const testWorkChime = useCallback(
    (kind: WorkChimeKind) => {
      const testTime = now ?? new Date();
      const hours = String(testTime.getHours()).padStart(2, '0');
      const minutes = String(testTime.getMinutes()).padStart(2, '0');
      const time = `${hours}:${minutes}`;
      const chime: DueWorkChime = {
        period: {
          id: `test-${kind}`,
          start: time,
          end: time,
          kind: kind === 'break' ? 'break' : kind === 'cleanup-start' ? 'cleanup' : 'work',
        },
        time,
        kind,
        label: getTestChimeLabel(kind),
        playKey: `test-${kind}-${Date.now()}`,
        message: getWorkChimeMessage(kind),
      };

      if (timerRef.current) clearTimeout(timerRef.current);

      setActiveChime(chime);

      void unlockWorkChimeAudio().then((audioReady) => {
        setIsAudioEnabled(audioReady);
        if (settings.soundEnabled && audioReady) {
          void playWorkChime(kind, { volume: settings.volume });
        }
      });

      timerRef.current = setTimeout(() => {
        setActiveChime(null);
        timerRef.current = null;
      }, 5000);
    },
    [now, settings.soundEnabled, settings.volume]
  );

  const currentPeriod = now ? getCurrentWorkChimePeriod(now, settings) : null;
  const nextChime = now ? getNextWorkChime(now, settings) : null;

  useEffect(() => {
    if (!now) return;

    const due = getDueWorkChimeSince(previousNowRef.current, now, settings, playedKeysRef.current);
    previousNowRef.current = now;
    if (!due) return;

    playedKeysRef.current = [...playedKeysRef.current, due.playKey].slice(-50);
    setActiveChime(due);

    // 発火時は React の isAudioEnabled フラグ（古い値の可能性あり）ではなく、
    // AudioContext の生きた状態 isWorkChimeAudioReady() で判定する。
    // これにより iOS の interrupted 自動復帰後も確実に鳴り、未アンロック時は
    // 余計な AudioContext 生成やコンソール警告を避けられる。結果でフラグを自己修復する。
    const audioReady = isWorkChimeAudioReady();
    if (settings.soundEnabled && audioReady) {
      void playWorkChime(due.kind, { volume: settings.volume }).then(setIsAudioEnabled);
    } else if (!audioReady) {
      // 鳴らせない状態なので有効フラグを下げ、「有効化」ボタンを出して
      // 次のユーザー操作で復帰できるようにする。
      setIsAudioEnabled(false);
      if (settings.soundEnabled) {
        // 復帰直後の生存確認中にチャイム時刻をまたいだ場合に備え、復旧できたら遅れて鳴らす。
        void reviveWorkChimeAudio().then((revived) => {
          setIsAudioEnabled(revived);
          if (revived) {
            void playWorkChime(due.kind, { volume: settings.volume });
          }
        });
      }
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActiveChime(null);
      timerRef.current = null;
    }, 5000);
  }, [now, settings]);

  // フォアグラウンド復帰時の自動復旧。iPadOS WebKit はバックグラウンド復帰後に
  // state='running' を報告したまま実際は音が出ない「ゾンビ状態」になることがあるため、
  // state（isWorkChimeAudioReady）を信頼せず、必ず実測プローブ（revive）で生存確認する。
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const refreshAudioState = () => {
      // 非表示への遷移時は判定できないため何もしない（復帰側のイベントだけ処理する）。
      if (document.visibilityState === 'hidden') return;
      markWorkChimeAudioSuspect();
      void reviveWorkChimeAudio().then(setIsAudioEnabled);
    };

    window.addEventListener('focus', refreshAudioState);
    window.addEventListener('pageshow', refreshAudioState);
    document.addEventListener('visibilitychange', refreshAudioState);

    return () => {
      window.removeEventListener('focus', refreshAudioState);
      window.removeEventListener('pageshow', refreshAudioState);
      document.removeEventListener('visibilitychange', refreshAudioState);
    };
  }, []);

  // 画面上の任意のユーザー操作でオーディオを自動的に有効化する。
  // ボタンを押し直さなくても、タップ／クリック／キー操作だけで suspended から復帰できる。
  // ゾンビ疑い中や作り直し直後の context は ready が false になるため、必要な場面では
  // 必ず unlockWorkChimeAudio() が走る（正常時の毎タップの無駄なノード生成は避ける）。
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleGesture = () => {
      if (isWorkChimeAudioReady()) {
        setIsAudioEnabled(true);
        return;
      }
      void unlockWorkChimeAudio().then(setIsAudioEnabled);
    };

    const options: AddEventListenerOptions = { passive: true };
    document.addEventListener('pointerdown', handleGesture, options);
    document.addEventListener('keydown', handleGesture, options);
    document.addEventListener('touchend', handleGesture, options);

    return () => {
      document.removeEventListener('pointerdown', handleGesture);
      document.removeEventListener('keydown', handleGesture);
      document.removeEventListener('touchend', handleGesture);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    settings,
    currentPeriod,
    nextChime,
    activeChime,
    isAudioEnabled,
    enableAudio,
    testWorkChime,
    updateSettings,
    dismissActiveChime,
  };
}
