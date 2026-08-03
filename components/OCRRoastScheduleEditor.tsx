'use client';

import { useState } from 'react';
import type { RoastSchedule } from '@/types';
import { HiPlus, HiTrash, HiPencil, HiFire, HiChevronDown } from 'react-icons/hi';
import { FaSnowflake, FaBroom } from 'react-icons/fa';
import { PiCoffeeBeanFill } from 'react-icons/pi';
import { RoastScheduleMemoDialog } from './RoastScheduleMemoDialog';
import { Badge, Button, IconButton } from '@/components/ui';

interface OCRRoastScheduleEditorProps {
  roastSchedules: RoastSchedule[];
  selectedDate: string;
  onUpdate: (roastSchedules: RoastSchedule[]) => void;
  onDelete: (id: string) => void;
}

export function OCRRoastScheduleEditor({
  roastSchedules,
  selectedDate,
  onUpdate,
  onDelete,
}: OCRRoastScheduleEditorProps) {
  const [editingSchedule, setEditingSchedule] = useState<RoastSchedule | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);

  const handleEdit = (schedule: RoastSchedule) => {
    setEditingSchedule(schedule);
    setIsAdding(false);
  };

  const handleAdd = () => {
    const newSchedule: RoastSchedule = {
      id: `ocr-roast-${Date.now()}`,
      date: selectedDate,
      time: '',
      order: roastSchedules.length,
    };
    setEditingSchedule(newSchedule);
    setIsAdding(true);
  };

  const handleSave = (schedule: RoastSchedule) => {
    if (isAdding) {
      onUpdate([...roastSchedules, schedule]);
    } else {
      onUpdate(roastSchedules.map((s) => (s.id === schedule.id ? schedule : s)));
    }
    setEditingSchedule(null);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setEditingSchedule(null);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    onDelete(id);
  };

  const sortedSchedules = [...roastSchedules].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;

    const timeA = a.time || '';
    const timeB = b.time || '';

    if (timeA && timeB) {
      return timeA.localeCompare(timeB);
    }
    if (!timeA && timeB) {
      return 1;
    }
    if (timeA && !timeB) {
      return -1;
    }
    return 0;
  });

  const getScheduleTypeLabel = (schedule: RoastSchedule): string => {
    if (schedule.isRoasterOn) return '焙煎機予熱';
    if (schedule.isRoast) return 'ロースト';
    if (schedule.isAfterPurge) return 'アフターパージ';
    if (schedule.isChaffCleaning) return 'チャフのお掃除';
    return 'その他';
  };

  const getScheduleTypeIcon = (schedule: RoastSchedule) => {
    if (schedule.isRoasterOn) return <HiFire className="h-4 w-4 text-orange-600" />;
    if (schedule.isRoast) return <PiCoffeeBeanFill className="h-4 w-4 text-amber-600" />;
    if (schedule.isAfterPurge) return <FaSnowflake className="h-4 w-4 text-blue-600" />;
    if (schedule.isChaffCleaning) return <FaBroom className="h-4 w-4 text-gray-600" />;
    return null;
  };

  const toggleDetails = (scheduleId: string) => {
    setExpandedScheduleId((prev) => (prev === scheduleId ? null : scheduleId));
  };

  return (
    <>
      <div className="space-y-2.5">
        {sortedSchedules.length === 0 ? (
          <div className="text-center py-8 text-ink-muted">
            <p>ローストスケジュールがありません</p>
          </div>
        ) : (
          sortedSchedules.map((schedule) => {
            const isExpanded = expandedScheduleId === schedule.id;
            return (
              <div
                key={schedule.id}
                className="border rounded-lg p-2 transition-colors border-edge bg-surface hover:bg-ground"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {schedule.time && (
                        <span className="rounded-md border border-edge bg-overlay px-2 py-1 text-sm font-bold text-ink shadow-sm">
                          {schedule.time}
                        </span>
                      )}
                      {getScheduleTypeIcon(schedule)}
                      <span className="text-sm font-semibold text-ink">{getScheduleTypeLabel(schedule)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {schedule.beanName && (
                        <Badge size="sm" variant="secondary" className="text-[10px]!">
                          豆: {schedule.beanName}
                        </Badge>
                      )}
                      {schedule.beanName2 && schedule.blendRatio && (
                        <Badge size="sm" variant="secondary" className="text-[10px]!">
                          副豆 {schedule.beanName2}（{schedule.blendRatio}）
                        </Badge>
                      )}
                      {schedule.weight && (
                        <Badge size="sm" variant="secondary" className="text-[10px]!">
                          {schedule.weight}g
                        </Badge>
                      )}
                      {schedule.roastLevel && (
                        <Badge size="sm" variant="coffee" className="text-[10px]!">
                          {schedule.roastLevel}
                        </Badge>
                      )}
                      {schedule.bagCount && (
                        <Badge size="sm" variant="secondary" className="text-[10px]!">
                          {schedule.bagCount}袋
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="-mt-0.5 flex gap-1 shrink-0">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDetails(schedule.id)}
                      aria-label={isExpanded ? '詳細を閉じる' : '詳細を開く'}
                      className="text-ink-muted"
                    >
                      <HiChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </IconButton>
                    <IconButton variant="ghost" size="sm" onClick={() => handleEdit(schedule)} aria-label="編集">
                      <HiPencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(schedule.id)}
                      className="text-red-500"
                      aria-label="削除"
                    >
                      <HiTrash className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-1.5 pt-1.5 border-t border-edge text-xs text-ink-sub space-y-1">
                    {schedule.beanName2 && schedule.blendRatio && (
                      <div>
                        副豆比率: {schedule.beanName2}（{schedule.blendRatio}）
                      </div>
                    )}
                    {schedule.isAfterPurge && <div>アフターパージ: 前のローストの時間を引き継ぎ</div>}
                    {schedule.isChaffCleaning && <div>チャフのお掃除</div>}
                    {schedule.weight && <div>豆量: {schedule.weight}g</div>}
                  </div>
                )}
              </div>
            );
          })
        )}

        <Button onClick={handleAdd} variant="primary" size="sm" className="w-full px-3! py-2! min-h-9! text-sm!">
          <HiPlus className="h-5 w-5" />
          <span>ローストスケジュールを追加</span>
        </Button>
      </div>

      {editingSchedule && (
        <RoastScheduleMemoDialog
          schedule={editingSchedule}
          selectedDate={selectedDate}
          onSave={handleSave}
          onDelete={isAdding ? undefined : () => handleDelete(editingSchedule.id)}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
