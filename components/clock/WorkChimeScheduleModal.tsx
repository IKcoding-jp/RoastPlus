'use client';

import { HiXMark } from 'react-icons/hi2';
import { MdAdd, MdDelete } from 'react-icons/md';

import { Button, IconButton, Input, Modal } from '@/components/ui';
import {
  type WorkChimePeriod,
  type WorkChimePeriodKind,
  type WorkChimeSettings,
} from '@/lib/workChime';

interface WorkChimeScheduleModalProps {
  show: boolean;
  settings: WorkChimeSettings;
  onUpdate: (patch: Partial<WorkChimeSettings>) => void;
  onClose: () => void;
}

function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(value: number): string {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, value));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getNextPeriodDraft(periods: WorkChimePeriod[]): WorkChimePeriod {
  const sortedPeriods = [...periods].sort((a, b) => a.start.localeCompare(b.start));
  const last = sortedPeriods.at(-1);
  const kind: WorkChimePeriodKind = last?.kind === 'work' ? 'break' : 'work';
  const start = last?.end ?? '09:00';
  const duration = kind === 'break' ? 15 : 60;

  return {
    id: `period-${Date.now()}`,
    start,
    end: timeFromMinutes(minutesFromTime(start) + duration),
    kind,
  };
}

function getKindButtonStyle(buttonKind: WorkChimePeriodKind, currentKind: WorkChimePeriodKind) {
  const isSelected = buttonKind === currentKind;

  if (!isSelected) {
    return {
      backgroundColor: 'var(--surface)',
      borderColor: 'var(--edge)',
      color: 'var(--ink-sub)',
      boxShadow: 'none',
    };
  }

  if (buttonKind === 'break') {
    return {
      backgroundColor: 'var(--success)',
      borderColor: 'var(--success)',
      color: '#ffffff',
      boxShadow: 'none',
    };
  }

  if (buttonKind === 'cleanup') {
    return {
      backgroundColor: 'var(--ink-sub)',
      borderColor: 'var(--ink-sub)',
      color: '#ffffff',
      boxShadow: 'none',
    };
  }

  return {
    backgroundColor: 'var(--spot)',
    borderColor: 'var(--spot)',
    color: '#ffffff',
    boxShadow: 'none',
  };
}

export function WorkChimeScheduleModal({
  show,
  settings,
  onUpdate,
  onClose,
}: WorkChimeScheduleModalProps) {
  const sortedPeriods = [...settings.periods].sort((a, b) => a.start.localeCompare(b.start));

  const updatePeriod = (id: string, patch: Partial<WorkChimePeriod>) => {
    onUpdate({
      periods: settings.periods.map((period) => (
        period.id === id ? { ...period, ...patch } : period
      )),
    });
  };

  const addPeriod = () => {
    onUpdate({
      periods: [...settings.periods, getNextPeriodDraft(settings.periods)],
    });
  };

  const removePeriod = (id: string) => {
    if (settings.periods.length <= 1) return;
    onUpdate({
      periods: settings.periods.filter((period) => period.id !== id),
    });
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      contentClassName="flex h-[85vh] max-h-[720px] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-edge bg-overlay shadow-2xl"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-edge bg-overlay px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-ink">チャイム時刻設定</h2>
          <p className="mt-1 text-sm text-ink-muted">作業と休憩の時間帯</p>
        </div>
        <IconButton
          variant="ghost"
          rounded
          onClick={onClose}
          aria-label="閉じる"
        >
          <HiXMark className="h-6 w-6" />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {sortedPeriods.map((period, index) => (
          <div key={period.id} className="rounded-xl border border-edge bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-ground p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updatePeriod(period.id, { kind: 'work' })}
                  className="!min-h-[36px] !rounded-md !border !px-4 transition-colors"
                  style={getKindButtonStyle('work', period.kind)}
                >
                  作業
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updatePeriod(period.id, { kind: 'break' })}
                  className="!min-h-[36px] !rounded-md !border !px-4 transition-colors"
                  style={getKindButtonStyle('break', period.kind)}
                >
                  休憩
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updatePeriod(period.id, { kind: 'cleanup' })}
                  className="!min-h-[36px] !rounded-md !border !px-4 transition-colors"
                  style={getKindButtonStyle('cleanup', period.kind)}
                >
                  掃除
                </Button>
              </div>

              <IconButton
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`${index + 1}行目の時間帯を削除`}
                onClick={() => removePeriod(period.id)}
                disabled={sortedPeriods.length <= 1}
              >
                <MdDelete className="h-5 w-5" />
              </IconButton>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <Input
                label="開始"
                type="time"
                value={period.start}
                onChange={(e) => updatePeriod(period.id, { start: e.target.value })}
                className="!px-3 !py-2 !text-base"
              />
              <span className="pb-3 text-sm font-bold text-ink-muted">-</span>
              <Input
                label="終了"
                type="time"
                value={period.end}
                onChange={(e) => updatePeriod(period.id, { end: e.target.value })}
                className="!px-3 !py-2 !text-base"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-edge bg-overlay px-4 py-4">
        <Button type="button" variant="secondary" fullWidth onClick={addPeriod} className="!min-h-[48px]">
          <MdAdd className="mr-1.5 h-5 w-5" />
          時間帯を追加
        </Button>
      </div>
    </Modal>
  );
}
