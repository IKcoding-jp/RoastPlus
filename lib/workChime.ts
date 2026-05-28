export type WorkChimeKind = 'break' | 'work-start' | 'work-resume' | 'cleanup-start';
export type WorkChimePeriodKind = 'work' | 'break' | 'cleanup';

export interface WorkChimePeriod {
  id: string;
  start: string;
  end: string;
  kind: WorkChimePeriodKind;
}

export interface WorkChimeSettings {
  enabled: boolean;
  soundEnabled: boolean;
  voiceAnnouncementEnabled: boolean;
  volume: number;
  periods: WorkChimePeriod[];
}

export interface CurrentWorkChimePeriod {
  period: WorkChimePeriod;
  label: string;
  minutesUntilEnd: number;
}

export interface NextWorkChime {
  period: WorkChimePeriod;
  time: string;
  kind: WorkChimeKind;
  label: string;
  minutesUntil: number;
}

export interface DueWorkChime {
  period: WorkChimePeriod;
  time: string;
  kind: WorkChimeKind;
  label: string;
  playKey: string;
  message: string;
}

const WORK_CHIME_SETTINGS_KEY = 'roastplus_work_chime_settings';

export const DEFAULT_WORK_CHIME_SETTINGS: WorkChimeSettings = {
  enabled: true,
  soundEnabled: true,
  voiceAnnouncementEnabled: false,
  volume: 0.8,
  periods: [
    { id: 'work-1', start: '10:00', end: '10:45', kind: 'work' },
    { id: 'break-1', start: '10:45', end: '11:00', kind: 'break' },
    { id: 'work-2', start: '11:00', end: '11:50', kind: 'work' },
    { id: 'break-2', start: '11:50', end: '13:00', kind: 'break' },
    { id: 'work-3', start: '13:00', end: '13:45', kind: 'work' },
    { id: 'break-3', start: '13:45', end: '14:00', kind: 'break' },
    { id: 'work-4', start: '14:00', end: '14:45', kind: 'work' },
    { id: 'break-4', start: '14:45', end: '15:00', kind: 'break' },
    { id: 'work-5', start: '15:00', end: '15:45', kind: 'work' },
    { id: 'break-5', start: '15:45', end: '16:00', kind: 'break' },
    { id: 'work-6', start: '16:00', end: '16:35', kind: 'work' },
    { id: 'cleanup-1', start: '16:35', end: '17:00', kind: 'cleanup' },
  ],
};

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function clampVolume(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_WORK_CHIME_SETTINGS.volume;
  }

  return Math.max(0, Math.min(1, value));
}

function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesFromDate(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function normalizePeriods(value: unknown): WorkChimePeriod[] {
  if (!Array.isArray(value)) return DEFAULT_WORK_CHIME_SETTINGS.periods;

  const periods = value.filter((period): period is WorkChimePeriod => {
    if (typeof period !== 'object' || period === null) return false;

    const candidate = period as Partial<WorkChimePeriod>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.start === 'string' &&
      typeof candidate.end === 'string' &&
      isValidTime(candidate.start) &&
      isValidTime(candidate.end) &&
      minutesFromTime(candidate.start) < minutesFromTime(candidate.end) &&
      (candidate.kind === 'work' || candidate.kind === 'break' || candidate.kind === 'cleanup')
    );
  });

  return periods.length > 0
    ? [...periods].sort((a, b) => a.start.localeCompare(b.start))
    : DEFAULT_WORK_CHIME_SETTINGS.periods;
}

function normalizeSettings(value: unknown): WorkChimeSettings {
  if (typeof value !== 'object' || value === null) return DEFAULT_WORK_CHIME_SETTINGS;

  const partial = value as Partial<WorkChimeSettings>;

  return {
    enabled: typeof partial.enabled === 'boolean' ? partial.enabled : DEFAULT_WORK_CHIME_SETTINGS.enabled,
    soundEnabled:
      typeof partial.soundEnabled === 'boolean' ? partial.soundEnabled : DEFAULT_WORK_CHIME_SETTINGS.soundEnabled,
    voiceAnnouncementEnabled:
      typeof partial.voiceAnnouncementEnabled === 'boolean'
        ? partial.voiceAnnouncementEnabled
        : DEFAULT_WORK_CHIME_SETTINGS.voiceAnnouncementEnabled,
    volume: clampVolume(partial.volume),
    periods: normalizePeriods(partial.periods),
  };
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeKey(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getSortedPeriods(settings: WorkChimeSettings): WorkChimePeriod[] {
  return [...settings.periods].sort((a, b) => a.start.localeCompare(b.start));
}

function getBoundaryKind(period: WorkChimePeriod, periods: WorkChimePeriod[]): WorkChimeKind {
  if (period.kind === 'break') return 'break';
  if (period.kind === 'cleanup') return 'cleanup-start';

  const previous = periods
    .filter((candidate) => minutesFromTime(candidate.start) < minutesFromTime(period.start))
    .at(-1);

  return previous?.kind === 'break' ? 'work-resume' : 'work-start';
}

function getBoundaryLabel(kind: WorkChimeKind): string {
  if (kind === 'break') return '休憩開始';
  if (kind === 'cleanup-start') return '掃除開始';
  if (kind === 'work-resume') return '作業再開';
  return '作業開始';
}

function createDueWorkChime(now: Date, period: WorkChimePeriod, sortedPeriods: WorkChimePeriod[]): DueWorkChime {
  const kind = getBoundaryKind(period, sortedPeriods);

  return {
    period,
    time: period.start,
    kind,
    label: getBoundaryLabel(kind),
    playKey: `${dateKey(now)}:${period.id}`,
    message: getWorkChimeMessage(kind),
  };
}

export function getWorkChimeMessage(kind: WorkChimeKind): string {
  if (kind === 'cleanup-start') return '掃除開始です';
  return kind === 'break' ? '休憩時間です' : '作業開始です';
}

function getWorkChimePeriodLabel(kind: WorkChimePeriodKind): string {
  if (kind === 'cleanup') return '掃除中';
  return kind === 'break' ? '休憩中' : '作業中';
}

export function getWorkChimeSettings(): WorkChimeSettings {
  if (typeof window === 'undefined') return DEFAULT_WORK_CHIME_SETTINGS;

  const stored = localStorage.getItem(WORK_CHIME_SETTINGS_KEY);
  if (!stored) return DEFAULT_WORK_CHIME_SETTINGS;

  return normalizeSettings(parseJson<unknown>(stored));
}

export function setWorkChimeSettings(settings: WorkChimeSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WORK_CHIME_SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
}

export function getCurrentWorkChimePeriod(now: Date, settings: WorkChimeSettings): CurrentWorkChimePeriod | null {
  if (!settings.enabled) return null;

  const currentMinutes = minutesFromDate(now);
  const period = getSortedPeriods(settings).find(
    (candidate) => minutesFromTime(candidate.start) <= currentMinutes && currentMinutes < minutesFromTime(candidate.end)
  );

  if (!period) return null;

  return {
    period,
    label: getWorkChimePeriodLabel(period.kind),
    minutesUntilEnd: minutesFromTime(period.end) - currentMinutes,
  };
}

export function getNextWorkChime(now: Date, settings: WorkChimeSettings): NextWorkChime | null {
  if (!settings.enabled || settings.periods.length === 0) return null;

  const currentMinutes = minutesFromDate(now);
  const sortedPeriods = getSortedPeriods(settings);
  const todayPeriod = sortedPeriods.find((period) => minutesFromTime(period.start) > currentMinutes);
  const period = todayPeriod ?? sortedPeriods[0];
  const kind = getBoundaryKind(period, sortedPeriods);
  const periodStartMinutes = minutesFromTime(period.start);

  return {
    period,
    time: period.start,
    kind,
    label: getBoundaryLabel(kind),
    minutesUntil: todayPeriod ? periodStartMinutes - currentMinutes : 24 * 60 - currentMinutes + periodStartMinutes,
  };
}

export function getDueWorkChime(now: Date, settings: WorkChimeSettings, playedKeys: string[]): DueWorkChime | null {
  if (!settings.enabled) return null;

  const currentTime = timeKey(now);
  const sortedPeriods = getSortedPeriods(settings);
  const period = sortedPeriods.find((candidate) => candidate.start === currentTime);
  if (!period) return null;

  const due = createDueWorkChime(now, period, sortedPeriods);
  if (playedKeys.includes(due.playKey)) return null;

  return due;
}

export function getDueWorkChimeSince(
  previous: Date | null,
  now: Date,
  settings: WorkChimeSettings,
  playedKeys: string[]
): DueWorkChime | null {
  if (!settings.enabled) return null;
  if (!previous) return getDueWorkChime(now, settings, playedKeys);

  const previousTime = previous.getTime();
  const currentTime = now.getTime();
  if (previousTime >= currentTime) return getDueWorkChime(now, settings, playedKeys);

  const maxCatchUpMs = 5 * 60 * 1000;
  if (currentTime - previousTime > maxCatchUpMs) return getDueWorkChime(now, settings, playedKeys);

  const sortedPeriods = getSortedPeriods(settings);
  const due = sortedPeriods
    .map((period) => {
      const [hours, minutes] = period.start.split(':').map(Number);
      const boundary = new Date(now);
      boundary.setHours(hours, minutes, 0, 0);

      return {
        period,
        boundaryTime: boundary.getTime(),
      };
    })
    .find(({ boundaryTime, period }) => {
      const playKey = `${dateKey(now)}:${period.id}`;
      return previousTime < boundaryTime && boundaryTime <= currentTime && !playedKeys.includes(playKey);
    });

  return due ? createDueWorkChime(now, due.period, sortedPeriods) : null;
}
