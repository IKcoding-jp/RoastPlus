'use client';

import type { TimeLabel } from '@/types';
import { HiPlus } from 'react-icons/hi';
import { useOCRTimeLabelEditor } from './useOCRTimeLabelEditor';
import { TimeLabelRow } from './TimeLabelRow';
import { Button } from '@/components/ui';

interface OCRTimeLabelEditorProps {
  timeLabels: TimeLabel[];
  onUpdate: (timeLabels: TimeLabel[]) => void;
  onDelete: (id: string) => void;
}

export function OCRTimeLabelEditor({
  timeLabels,
  onUpdate,
  onDelete,
}: OCRTimeLabelEditorProps) {
  const editor = useOCRTimeLabelEditor({ timeLabels, onUpdate });

  return (
    <div className="space-y-2.5">
      {editor.sortedLabels.length === 0 ? (
        <div className="text-center py-8 text-ink-muted">
          <p>スケジュールがありません</p>
        </div>
      ) : (
        editor.sortedLabels.map((label) => (
          <TimeLabelRow
            key={label.id}
            label={label}
            isEditing={editor.editingId === label.id}
            editor={editor}
            onDelete={onDelete}
          />
        ))
      )}

      {/* 追加ボタン */}
      <Button
        onClick={editor.handleAdd}
        variant="primary"
        size="sm"
        className="w-full !px-3 !py-2 !min-h-[36px] !text-sm"
      >
        <HiPlus className="h-5 w-5" />
        <span>スケジュールを追加</span>
      </Button>
    </div>
  );
}
