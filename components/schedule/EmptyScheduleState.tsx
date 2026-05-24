'use client';

import { HiCamera, HiPlus } from 'react-icons/hi';
import { Button } from '@/components/ui';

interface EmptyScheduleStateProps {
  icon: 'clock' | 'calendar';
  message: string;
  subMessage?: string;
  onCamera?: () => void;
  onAdd?: () => void;
  addLabel?: string;
}

export function EmptyScheduleState({
  icon,
  message,
  subMessage = 'カメラで読み取るか、追加してください',
  onCamera,
  onAdd,
  addLabel = '手動追加',
}: EmptyScheduleStateProps) {
  return (
    <div className="text-center py-4">
      {icon === 'clock' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="w-12 h-12 text-ink-muted opacity-25 mx-auto mb-4"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="w-12 h-12 text-ink-muted opacity-25 mx-auto mb-4"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      )}
      <p className="text-sm font-semibold text-ink mb-1">{message}</p>
      <p className="text-xs text-ink-muted mb-5">{subMessage}</p>
      {(onCamera || onAdd) && (
        <div className="flex gap-2 justify-center flex-wrap">
          {onCamera && (
            <Button variant="primary" size="sm" onClick={onCamera} className="gap-1.5">
              <HiCamera className="w-3.5 h-3.5" />
              読み取る
            </Button>
          )}
          {onAdd && (
            <Button variant="ghost" size="sm" onClick={onAdd} className="gap-1.5 !text-ink hover:!bg-ground">
              <HiPlus className="w-3.5 h-3.5" />
              {addLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
