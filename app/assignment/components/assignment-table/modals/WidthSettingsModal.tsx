import { useState } from 'react';

import { Button, Input, NumberInput } from '@/components/ui';
import {
  clampTableDimension,
  parseTableDimensionInput,
  validateTableDimensionInput,
} from '../../../lib/tableModalLogic';
import { ModalShell } from './ModalShell';
import type { WidthSettingsModalState } from './types';

const WIDTH_MIN_VALUE = 120;
const WIDTH_MAX_VALUE = 260;

type WidthSettingsModalProps = {
  state: WidthSettingsModalState;
};

export function WidthSettingsModal({ state }: WidthSettingsModalProps) {
  const { widthConfig, setWidthConfig, handleSaveWidth } = state;

  return (
    <ModalShell
      isOpen={widthConfig !== null}
      onClose={() => setWidthConfig(null)}
      panelClassName="rounded-xl shadow-xl p-6 w-full max-w-xs relative z-10 bg-overlay border border-edge"
    >
      {widthConfig && (
        <WidthSettingsModalContent
          key={`${widthConfig.type}:${widthConfig.id ?? 'header'}:${widthConfig.currentWidth}`}
          widthConfig={widthConfig}
          setWidthConfig={setWidthConfig}
          handleSaveWidth={handleSaveWidth}
        />
      )}
    </ModalShell>
  );
}

type WidthSettingsModalContentProps = {
  widthConfig: NonNullable<WidthSettingsModalState['widthConfig']>;
  setWidthConfig: WidthSettingsModalState['setWidthConfig'];
  handleSaveWidth: WidthSettingsModalState['handleSaveWidth'];
};

function WidthSettingsModalContent({ widthConfig, setWidthConfig, handleSaveWidth }: WidthSettingsModalContentProps) {
  const [draftWidth, setDraftWidth] = useState(() => String(widthConfig.currentWidth));
  const widthError = validateTableDimensionInput(draftWidth, WIDTH_MIN_VALUE, WIDTH_MAX_VALUE);
  const draftWidthValue = clampTableDimension(
    parseTableDimensionInput(draftWidth, widthConfig.currentWidth),
    WIDTH_MIN_VALUE,
    WIDTH_MAX_VALUE
  );

  const handleSave = () => {
    if (widthError) return;
    handleSaveWidth(parseTableDimensionInput(draftWidth, widthConfig.currentWidth), widthConfig.currentTitle);
  };

  return (
    <>
      <h3 className="text-lg font-bold mb-4 text-ink">{widthConfig.label}</h3>
      {(widthConfig.type === 'taskLabel' || widthConfig.type === 'note') && (
        <div className="mb-4">
          <Input
            label="列の表示名"
            value={widthConfig.currentTitle ?? ''}
            onChange={(event) => setWidthConfig({ ...widthConfig, currentTitle: event.target.value })}
            placeholder={`${widthConfig.type === 'taskLabel' ? '左' : '右'}ラベル名`}
            onKeyDown={(event) => event.key === 'Enter' && handleSave()}
          />
        </div>
      )}
      <div className="mb-6">
        <NumberInput
          suffix="px"
          value={draftWidth}
          min={WIDTH_MIN_VALUE}
          max={WIDTH_MAX_VALUE}
          error={widthError ?? undefined}
          onChange={(event) => setDraftWidth(event.target.value)}
          autoFocus
          onKeyDown={(event) => event.key === 'Enter' && handleSave()}
        />
        <div className="mt-3">
          <input
            type="range"
            min={WIDTH_MIN_VALUE}
            max={WIDTH_MAX_VALUE}
            step={10}
            value={draftWidthValue}
            onChange={(event) => setDraftWidth(event.target.value)}
            className="w-full accent-spot"
            aria-label="列の幅"
          />
          <div className="mt-1 flex justify-between text-xs font-medium text-ink-muted">
            <span>{WIDTH_MIN_VALUE}px</span>
            <span>{draftWidthValue}px</span>
            <span>{WIDTH_MAX_VALUE}px</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="md" onClick={() => setWidthConfig(null)} className="flex-1">
          キャンセル
        </Button>
        <Button variant="primary" size="md" onClick={handleSave} disabled={widthError !== null} className="flex-1">
          保存
        </Button>
      </div>
    </>
  );
}
