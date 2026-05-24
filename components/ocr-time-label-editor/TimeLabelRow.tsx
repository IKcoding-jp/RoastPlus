'use client';

import { useState } from 'react';
import type { TimeLabel } from '@/types';
import { HiPlus, HiTrash, HiPencil, HiUser, HiChevronDown } from 'react-icons/hi';
import type { useOCRTimeLabelEditor } from './useOCRTimeLabelEditor';
import { Badge, Button, IconButton, Input, NumberInput, Textarea } from '@/components/ui';

interface TimeLabelRowProps {
  label: TimeLabel;
  isEditing: boolean;
  editor: ReturnType<typeof useOCRTimeLabelEditor>;
  onDelete: (id: string) => void;
}

export function TimeLabelRow({ label, isEditing, editor, onDelete }: TimeLabelRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    editingTime,
    setEditingTime,
    editingContent,
    setEditingContent,
    editingMemo,
    setEditingMemo,
    editingAssignee,
    setEditingAssignee,
    editingSubTasks,
    editingContinuesUntil,
    setEditingContinuesUntil,
    handleEdit,
    handleSave,
    handleCancel,
    handleAddSubTask,
    handleDeleteSubTask,
    handleUpdateSubTask,
  } = editor;

  const labelClass = 'block text-xs font-medium mb-1 text-ink-sub';
  const hasExtraDetails = Boolean(label.memo);
  const timeRange = label.time || '--:--';

  return (
    <div className="border rounded-lg p-2 transition-colors border-edge bg-surface hover:bg-ground">
      {isEditing ? (
        <div className="space-y-2">
          {/* 時間編集 */}
          <div>
            <label className={labelClass}>
              時間 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <NumberInput
                value={editingTime.hour}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 23)) {
                    setEditingTime((prev) => ({ ...prev, hour: value }));
                  }
                }}
                min={0}
                max={23}
                required
                placeholder="時"
                className="w-16 text-center !text-sm"
              />
              <span className="text-ink-sub">:</span>
              <NumberInput
                value={editingTime.minute}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 59)) {
                    setEditingTime((prev) => ({ ...prev, minute: value }));
                  }
                }}
                min={0}
                max={59}
                placeholder="分"
                className="w-16 text-center !text-sm"
              />
            </div>
          </div>

          {/* 内容編集 */}
          <div>
            <Input
              label="内容"
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              placeholder="内容を入力"
            />
          </div>

          {/* メモ編集 */}
          <div>
            <Textarea
              label="メモ"
              value={editingMemo}
              onChange={(e) => setEditingMemo(e.target.value)}
              rows={2}
              placeholder="メモを入力"
            />
          </div>

          {/* 担当者編集 */}
          <div>
            <label className={labelClass}>
              <span className="inline-flex items-center gap-1.5">
                <HiUser className="h-4 w-4" />
                担当者
              </span>
            </label>
            <Input
              value={editingAssignee}
              onChange={(e) => setEditingAssignee(e.target.value)}
              placeholder="例：浅田さん、小山さん"
            />
          </div>

          {/* 継続終了時間編集 */}
          <div>
            <label className={labelClass}>継続終了時間（時間経過タスクの場合）</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-muted">〜</span>
              <NumberInput
                value={editingContinuesUntil.hour}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 23)) {
                    setEditingContinuesUntil((prev) => ({ ...prev, hour: value }));
                  }
                }}
                min={0}
                max={23}
                placeholder="時"
                className="w-16 text-center !text-sm"
              />
              <span className="text-ink-sub">:</span>
              <NumberInput
                value={editingContinuesUntil.minute}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 59)) {
                    setEditingContinuesUntil((prev) => ({ ...prev, minute: value }));
                  }
                }}
                min={0}
                max={59}
                placeholder="分"
                className="w-16 text-center !text-sm"
              />
              <span className="text-sm text-ink-muted">まで</span>
              {editingContinuesUntil.hour && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingContinuesUntil({ hour: '', minute: '' })}
                  aria-label="継続終了時間をクリア"
                >
                  <HiTrash className="h-4 w-4" />
                </IconButton>
              )}
            </div>
          </div>

          {/* サブタスク編集 */}
          <div>
            <label className={`${labelClass} mb-2`}>
              <span className="inline-flex items-center gap-1.5">
                <HiChevronDown className="h-4 w-4" />
                連続タスク（サブタスク）
              </span>
            </label>
            <div className="space-y-2 ml-4">
              {editingSubTasks.map((subTask) => (
                <div key={subTask.id} className="flex items-start gap-2 p-2 rounded-md bg-ground">
                  <span className="text-sm mt-2 text-ink-muted">↓</span>
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={subTask.content}
                      onChange={(e) => handleUpdateSubTask(subTask.id, { content: e.target.value })}
                      placeholder="タスク内容"
                      className="!py-1.5 !text-sm"
                    />
                    <Input
                      value={subTask.assignee || ''}
                      onChange={(e) => handleUpdateSubTask(subTask.id, { assignee: e.target.value || undefined })}
                      placeholder="担当者（任意）"
                      className="!py-1 !text-xs"
                    />
                  </div>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSubTask(subTask.id)}
                    className="text-red-500 mt-1"
                    aria-label="サブタスクを削除"
                  >
                    <HiTrash className="h-4 w-4" />
                  </IconButton>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={handleAddSubTask}>
                <HiPlus className="h-4 w-4" />
                <span>サブタスクを追加</span>
              </Button>
            </div>
          </div>

          {/* 編集ボタン */}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={handleCancel}>
              キャンセル
            </Button>
            <Button variant="primary" size="sm" onClick={() => handleSave(label.id)} disabled={!editingTime.hour}>
              保存
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="mb-1.5 flex items-center gap-3">
              <span className="shrink-0 rounded-md border border-edge bg-overlay px-2 py-1 text-sm font-bold text-ink shadow-sm whitespace-nowrap">
                {timeRange}
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold leading-6 text-ink break-words">
                {label.content || '内容未入力'}
                {label.subTasks && label.subTasks.length > 0 && (
                  <>
                    {label.subTasks
                      .sort((a, b) => a.order - b.order)
                      .map((subTask) => (
                        <span key={subTask.id} className="text-ink-sub">
                          <span className="mx-1.5 text-ink-muted">・</span>
                          {subTask.content || '内容未入力'}
                        </span>
                      ))}
                  </>
                )}
              </span>
            </div>

            <div className="ml-[86px] flex flex-wrap items-center gap-1.5">
              {label.assignee && (
                <Badge size="sm" variant="secondary" className="!text-[10px]">
                  <span className="inline-flex items-center gap-1">
                    <HiUser className="h-3 w-3" />
                    {label.assignee}
                  </span>
                </Badge>
              )}
              {label.memo && (
                <Badge size="sm" variant="secondary" className="!text-[10px]">
                  メモあり
                </Badge>
              )}
            </div>

            {isExpanded && hasExtraDetails && (
              <div className="mt-1.5 space-y-1.5 pt-1.5 border-t border-edge/70">
                {label.memo && <p className="text-xs leading-relaxed whitespace-pre-wrap text-ink-sub">{label.memo}</p>}
              </div>
            )}
          </div>
          <div className="-mt-0.5 flex gap-1 shrink-0">
            {hasExtraDetails && (
              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded((prev) => !prev)}
                aria-label={isExpanded ? '詳細を閉じる' : '詳細を見る'}
                className="text-ink-muted"
              >
                <HiChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </IconButton>
            )}
            <IconButton variant="ghost" size="sm" onClick={() => handleEdit(label)} aria-label="編集">
              <HiPencil className="h-4 w-4" />
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => onDelete(label.id)}
              className="text-red-500"
              aria-label="削除"
            >
              <HiTrash className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
}
