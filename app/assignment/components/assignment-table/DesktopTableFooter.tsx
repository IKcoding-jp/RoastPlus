import React from 'react';
import { MdAdd } from 'react-icons/md';
import { PiShuffleBold } from 'react-icons/pi';

import { Button, Input } from '@/components/ui';

import { MAX_TASK_LABELS } from '../../lib/constants';

type HeaderLabels = {
  left: string;
  right: string;
};

interface DesktopTableFooterProps {
  teamsLength: number;
  taskLabelsLength: number;
  gridTemplateColumns: string;
  headerLabels: HeaderLabels;
  newLeftLabel: string;
  setNewLeftLabel: (value: string) => void;
  newRightLabel: string;
  setNewRightLabel: (value: string) => void;
  handleAddTaskLabel: () => Promise<void>;
  onShuffle: () => Promise<void>;
  isShuffleDisabled: boolean;
}

export const DesktopTableFooter: React.FC<DesktopTableFooterProps> = ({
  teamsLength,
  taskLabelsLength,
  gridTemplateColumns,
  headerLabels,
  newLeftLabel,
  setNewLeftLabel,
  newRightLabel,
  setNewRightLabel,
  handleAddTaskLabel,
  onShuffle,
  isShuffleDisabled,
}) => {
  return (
    <div className="grid items-center py-2 border-t min-h-[60px] bg-ground border-edge" style={{ gridTemplateColumns }}>
      {taskLabelsLength < MAX_TASK_LABELS ? (
        <div className="px-2">
          <Input
            value={newLeftLabel}
            onChange={(e) => setNewLeftLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTaskLabel();
            }}
            placeholder={`${headerLabels.left}を入力`}
            className="!p-2 text-sm! min-h-0! !text-center"
          />
        </div>
      ) : (
        <div />
      )}

      <div
        className="col-span-full px-2 flex items-center justify-center gap-3"
        style={{ gridColumn: `2 / span ${Math.max(1, teamsLength)}` }}
      >
        {taskLabelsLength < MAX_TASK_LABELS && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddTaskLabel}
            disabled={!newLeftLabel.trim()}
            className="rounded-full! px-4! shadow-md active:scale-95"
          >
            <MdAdd size={18} />
            <span className="font-medium text-sm">担当を追加</span>
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={onShuffle}
          disabled={isShuffleDisabled}
          className="rounded-full! px-4! shadow-md active:scale-95"
        >
          <PiShuffleBold className="w-5 h-5" />
          <span className="font-medium text-sm">シャッフル</span>
        </Button>
      </div>

      {taskLabelsLength < MAX_TASK_LABELS ? (
        <div className="px-2 flex items-center w-full h-full" style={{ gridColumn: '-2 / -1' }}>
          <Input
            value={newRightLabel}
            onChange={(e) => setNewRightLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTaskLabel();
            }}
            placeholder={`${headerLabels.right}を入力`}
            className="min-w-0! !p-2 !text-center text-sm! min-h-0! w-full"
          />
        </div>
      ) : (
        <div />
      )}
    </div>
  );
};
