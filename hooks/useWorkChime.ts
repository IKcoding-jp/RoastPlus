'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { playWorkChime } from '@/lib/workChimeAudio';
import {
  getCurrentWorkChimePeriod,
  getDueWorkChime,
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissActiveChime = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setActiveChime(null);
  }, []);

  const enableAudio = useCallback(() => {
    playWorkChime('work-start', { volume: 0 });
    setIsAudioEnabled(true);
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

      setIsAudioEnabled(true);
      setActiveChime(chime);

      if (settings.soundEnabled) {
        playWorkChime(kind, { volume: settings.volume });
      }

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
    if (!now || !isAudioEnabled) return;

    const due = getDueWorkChime(now, settings, playedKeysRef.current);
    if (!due) return;

    playedKeysRef.current = [...playedKeysRef.current, due.playKey].slice(-50);
    setActiveChime(due);

    if (settings.soundEnabled) {
      playWorkChime(due.kind, { volume: settings.volume });
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActiveChime(null);
      timerRef.current = null;
    }, 5000);
  }, [isAudioEnabled, now, settings]);

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
