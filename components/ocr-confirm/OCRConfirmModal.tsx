'use client';

import { useState, useEffect } from 'react';
import type { TimeLabel, RoastSchedule } from '@/types';
import { HiX, HiClock, HiFire, HiRefresh } from 'react-icons/hi';
import { OCRTimeLabelEditor } from '../OCRTimeLabelEditor';
import { OCRRoastScheduleEditor } from '../OCRRoastScheduleEditor';
import { useToastContext } from '../Toast';
import { sortTimeLabels, sortRoastSchedules } from './OCRConfirmHelpers';
import type { TabType } from './OCRConfirmHelpers';
import { Button, IconButton, Tabs, TabsList, TabsTrigger, TabsContent, Modal } from '@/components/ui';

interface OCRConfirmModalProps {
  timeLabels: TimeLabel[];
  roastSchedules: RoastSchedule[];
  selectedDate: string;
  existingTimeLabels?: TimeLabel[];
  existingRoastSchedules?: RoastSchedule[];
  onSave: (mode: 'replace' | 'add', timeLabels: TimeLabel[], roastSchedules: RoastSchedule[]) => void;
  onCancel: () => void;
  onRetry: () => void;
}

export function OCRConfirmModal({
  timeLabels: initialTimeLabels,
  roastSchedules: initialRoastSchedules,
  selectedDate,
  existingTimeLabels = [],
  existingRoastSchedules = [],
  onSave,
  onCancel,
  onRetry,
}: OCRConfirmModalProps) {
  const { showToast } = useToastContext();
  const [activeTab, setActiveTab] = useState<TabType>('timeLabels');
  const [mode, setMode] = useState<'replace' | 'add'>('replace');
  const [timeLabels, setTimeLabels] = useState<TimeLabel[]>(() => sortTimeLabels(initialTimeLabels));
  const [roastSchedules, setRoastSchedules] = useState<RoastSchedule[]>(() =>
    sortRoastSchedules(initialRoastSchedules)
  );

  // ESCキーで閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onCancel]);

  const handleSave = () => {
    // バリデーション: TimeLabelの時間が必須
    const invalidTimeLabels = timeLabels.filter((label) => !label.time || label.time.trim() === '');
    if (invalidTimeLabels.length > 0) {
      showToast('時間が入力されていないスケジュールがあります。', 'error');
      return;
    }

    // バリデーション: RoastScheduleの時間が必須（アフターパージを除く）
    const invalidRoastSchedules = roastSchedules.filter(
      (schedule) => !schedule.isAfterPurge && (!schedule.time || schedule.time.trim() === '')
    );
    if (invalidRoastSchedules.length > 0) {
      showToast('時間が入力されていないローストスケジュールがあります。', 'error');
      return;
    }

    // 時間順にソート
    const sortedTimeLabels = [...timeLabels].sort((a, b) => {
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }
      return 0;
    });
    sortedTimeLabels.forEach((label, index) => {
      label.order = index;
    });

    // ローストスケジュールのソート：アフターパージは前のローストの後に配置
    const sortedRoastSchedules = [...roastSchedules];

    // アフターパージで時間が空の場合、前のローストの時間を参照
    const finalSorted: RoastSchedule[] = [];
    let lastRoastTime = '00:00';

    for (const schedule of sortedRoastSchedules) {
      if (schedule.isAfterPurge && !schedule.time) {
        // アフターパージで時間が空の場合、前のローストの時間を使用（ソート用）
        const tempTime = lastRoastTime;
        finalSorted.push({ ...schedule, time: tempTime });
      } else {
        if (schedule.time) {
          lastRoastTime = schedule.time;
        }
        finalSorted.push(schedule);
      }
    }

    // 時間順にソート
    finalSorted.sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });

    // アフターパージの時間を元に戻す（空文字列に）
    const restoredSchedules = finalSorted.map((schedule) => {
      if (
        schedule.isAfterPurge &&
        schedule.time === lastRoastTime &&
        !roastSchedules.find((s) => s.id === schedule.id)?.time
      ) {
        return { ...schedule, time: '' };
      }
      return schedule;
    });

    restoredSchedules.forEach((schedule, index) => {
      schedule.order = index;
    });

    onSave(mode, sortedTimeLabels, restoredSchedules);
  };

  const hasExistingData = existingTimeLabels.length > 0 || existingRoastSchedules.length > 0;

  return (
    <Modal
      show
      onClose={onCancel}
      contentClassName="bg-overlay rounded-2xl shadow-2xl w-full max-w-4xl h-[90dvh] max-h-[calc(100dvh-2rem)] border border-edge flex flex-col overflow-hidden"
      closeOnBackdropClick={false}
    >
      <div className="flex flex-col h-full">
        {/* ヘッダー */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b flex-shrink-0 border-edge bg-overlay">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-ink">読み取り結果の確認</h2>
            <span className="text-[11px] text-ink-sub">
              {timeLabels.length}件の予定 / {roastSchedules.length}件のロースト
            </span>
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={onCancel}
            rounded
            aria-label="閉じる"
            className="!rounded-full"
          >
            <HiX className="h-4 w-4 sm:h-5 sm:w-5" />
          </IconButton>
        </div>

        {hasExistingData && (
          <div className="flex items-center justify-end gap-2 px-4 py-2 border-b flex-shrink-0 border-edge bg-ground/40">
            <span className="text-[11px] font-semibold text-ink-sub">保存方法</span>
            <div className="flex rounded-lg bg-overlay p-0.5 border border-edge">
              <Button
                variant={mode === 'replace' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setMode('replace')}
                className="!min-h-[28px] !px-3 !text-xs"
              >
                置き換え
              </Button>
              <Button
                variant={mode === 'add' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setMode('add')}
                className="!min-h-[28px] !px-3 !text-xs"
              >
                追加
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto p-3 md:overflow-hidden bg-ground/50">
          {/* モバイル: タブ */}
          <div className="md:hidden landscape:hidden">
            <Tabs
              value={activeTab}
              defaultValue="timeLabels"
              onValueChange={(value) => setActiveTab(value as TabType)}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="border-b border-edge flex-shrink-0">
                <TabsList className="mt-2 grid grid-cols-2">
                  <TabsTrigger value="timeLabels" className="text-xs !gap-1.5 !px-2 !py-1.5 !min-h-0">
                    <HiClock className="h-4 w-4" />
                    <span>本日の予定</span>
                    <span className="rounded-full px-2 py-0.5 text-xs bg-ground text-ink">{timeLabels.length}</span>
                  </TabsTrigger>
                  <TabsTrigger value="roastSchedules" className="text-xs !gap-1.5 !px-2 !py-1.5 !min-h-0">
                    <HiFire className="h-4 w-4" />
                    <span>ロースト</span>
                    <span className="rounded-full px-2 py-0.5 text-xs bg-ground text-ink">{roastSchedules.length}</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              <div className="flex-1 min-h-0">
                <TabsContent value="timeLabels" className="space-y-2 pb-1">
                  <OCRTimeLabelEditor
                    timeLabels={timeLabels}
                    onUpdate={setTimeLabels}
                    onDelete={(id) => {
                      setTimeLabels(timeLabels.filter((label) => label.id !== id));
                    }}
                  />
                </TabsContent>
                <TabsContent value="roastSchedules" className="space-y-2 pb-1">
                  <OCRRoastScheduleEditor
                    roastSchedules={roastSchedules}
                    selectedDate={selectedDate}
                    onUpdate={setRoastSchedules}
                    onDelete={(id) => {
                      setRoastSchedules(roastSchedules.filter((schedule) => schedule.id !== id));
                    }}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* 横画面: 左右並び */}
          <div className="hidden md:grid md:grid-cols-2 md:h-full md:gap-3 landscape:grid landscape:grid-cols-2 landscape:h-full landscape:gap-3">
            <section className="flex h-full flex-col min-h-0 border rounded-xl border-edge bg-overlay shadow-sm">
              <div className="px-3 py-2 border-b border-edge flex items-center gap-2 bg-overlay">
                <span className="h-5 w-1 rounded-full bg-accent" />
                <h3 className="text-sm font-bold text-ink">本日の予定</h3>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
                <OCRTimeLabelEditor
                  timeLabels={timeLabels}
                  onUpdate={setTimeLabels}
                  onDelete={(id) => {
                    setTimeLabels(timeLabels.filter((label) => label.id !== id));
                  }}
                />
              </div>
            </section>

            <section className="flex h-full flex-col min-h-0 border rounded-xl border-edge bg-overlay shadow-sm">
              <div className="px-3 py-2 border-b border-edge flex items-center gap-2 bg-overlay">
                <span className="h-5 w-1 rounded-full bg-accent" />
                <h3 className="text-sm font-bold text-ink">ロースト</h3>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
                <OCRRoastScheduleEditor
                  roastSchedules={roastSchedules}
                  selectedDate={selectedDate}
                  onUpdate={setRoastSchedules}
                  onDelete={(id) => {
                    setRoastSchedules(roastSchedules.filter((schedule) => schedule.id !== id));
                  }}
                />
              </div>
            </section>
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between px-4 py-3 border-t gap-2 flex-shrink-0 border-edge bg-overlay">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            aria-label="再解析"
            className="!border-edge !bg-ground !text-ink-sub hover:!bg-surface hover:!text-ink"
          >
            <HiRefresh className="h-4 w-4" />
            再解析
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onCancel}>
              キャンセル
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave}>
              保存
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
