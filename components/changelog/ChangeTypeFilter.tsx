'use client';

import React from 'react';
import type { ChangelogEntryType } from '@/types';
import { CHANGE_TYPE_CONFIG, FILTER_TYPES } from '@/data/dev-stories/detailed-changelog';
import { Button } from '@/components/ui';

interface ChangeTypeFilterProps {
  selectedTypes: ChangelogEntryType[];
  onToggle: (type: ChangelogEntryType) => void;
  onClear: () => void;
}

export const ChangeTypeFilter: React.FC<ChangeTypeFilterProps> = ({
  selectedTypes,
  onToggle,
  onClear,
}) => {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-ink-muted mr-1">フィルター:</span>
      {FILTER_TYPES.map((type) => {
        const config = CHANGE_TYPE_CONFIG[type];
        const isSelected = selectedTypes.includes(type);
        return (
          <Button
            key={type}
            onClick={() => onToggle(type)}
            variant="ghost"
            size="sm"
            className={`!rounded-md !px-2 !py-1 !min-h-0 text-sm font-medium !bg-transparent hover:!bg-transparent ${
              isSelected
                ? `${config.color} underline decoration-current underline-offset-4`
                : 'text-ink-muted hover:text-ink-sub'
            }`}
          >
            {config.label}
          </Button>
        );
      })}
      {selectedTypes.length > 0 && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          クリア
        </Button>
      )}
    </div>
  );
};
