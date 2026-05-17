'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { playWorkChime } from '@/lib/workChimeAudio';
import {
  getCurrentWorkChimePeriod,
  getDueWorkChime,
  getNextWorkChime,
  getWorkChimeSettings,
  setWorkChimeSettings,
  type CurrentWorkChimePeriod,
  type DueWorkChime,
  type NextWorkChime,
  type WorkChimeSettings,
} from '@/lib/workChime';

interface UseWorkChimeReturn {
  settings: WorkChimeSettings;
  currentPeriod: CurrentWorkChimePeriod | null;
  nextChime: NextWorkChime | null;
  activeChime: DueWorkChime | null;
  isAudioEnabled: boolean;
  enableAudio: () => void;
  updateSettings: (patch: Partial<WorkChimeSettings>) => void;
  dismissActiveChime: () => void;
}

function loadInitialSettings(): WorkChimeSettings {
  return getWorkChimeSettings();
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
    updateSettings,
    dismissActiveChime,
  };
}
