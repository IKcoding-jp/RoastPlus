import { useState } from 'react';
import { MdDelete } from 'react-icons/md';
import { Button, Input, NumberInput } from '@/components/ui';
import { clampTableDimension, parseTableDimensionInput, validateTableDimensionInput } from '../../../lib/tableModalLogic';
import { ModalShell } from './ModalShell';
import { DEFAULT_TABLE_SETTINGS } from '../types';
import type { AssignmentTableModalData, HeightSettingsModalState, TableModalCallbacks } from './types';

const ROW_HEIGHT_MIN_VALUE = 60;
const ROW_HEIGHT_MAX_VALUE = 140;

type HeightSettingsModalProps = {
  tableSettings: AssignmentTableModalData['tableSettings'];
  state: HeightSettingsModalState;
  onDeleteTaskLabel: TableModalCallbacks['onDeleteTaskLabel'];
};

export function HeightSettingsModal({ tableSettings, state, onDeleteTaskLabel }: HeightSettingsModalProps) {
  const { heightConfig, setHeightConfig, handleSaveRowConfig } = state;
  const headerLabels = tableSettings?.headerLabels ?? DEFAULT_TABLE_SETTINGS.headerLabels;

  return (
    <ModalShell
      isOpen={heightConfig !== null}
      onClose={() => setHeightConfig(null)}
      panelClassName="rounded-xl shadow-xl p-6 w-full max-w-xs relative z-10 bg-overlay border border-edge"
    >
      {heightConfig && (
        <HeightSettingsModalContent
          key={heightConfig.taskLabelId}
          heightConfig={heightConfig}
          setHeightConfig={setHeightConfig}
          handleSaveRowConfig={handleSaveRowConfig}
          headerLabels={headerLabels}
          onDeleteTaskLabel={onDeleteTaskLabel}
        />
      )}
    </ModalShell>
  );
}

type HeightSettingsModalContentProps = {
  heightConfig: NonNullable<HeightSettingsModalState['heightConfig']>;
  setHeightConfig: HeightSettingsModalState['setHeightConfig'];
  handleSaveRowConfig: HeightSettingsModalState['handleSaveRowConfig'];
  headerLabels: { left: string; right: string };
  onDeleteTaskLabel: TableModalCallbacks['onDeleteTaskLabel'];
};

function HeightSettingsModalContent({
  heightConfig,
  setHeightConfig,
  handleSaveRowConfig,
  headerLabels,
  onDeleteTaskLabel,
}: HeightSettingsModalContentProps) {
  const [draftHeight, setDraftHeight] = useState(() => String(heightConfig.currentHeight));
  const heightError = validateTableDimensionInput(draftHeight, ROW_HEIGHT_MIN_VALUE, ROW_HEIGHT_MAX_VALUE);
  const draftHeightValue = clampTableDimension(
    parseTableDimensionInput(draftHeight, heightConfig.currentHeight),
    ROW_HEIGHT_MIN_VALUE,
    ROW_HEIGHT_MAX_VALUE
  );

  const handleSave = () => {
    if (heightError) return;
    handleSaveRowConfig(parseTableDimensionInput(draftHeight, heightConfig.currentHeight), heightConfig.currentName);
  };

  return (
    <>
      <h3 className="text-lg font-bold mb-4 text-ink">{heightConfig.label}</h3>

      <div className="mb-4">
        <Input
          label={heightConfig.editMode === 'left' ? `${headerLabels.left}の名前` : `${headerLabels.right}の名前`}
          value={heightConfig.currentName}
          onChange={(event) => setHeightConfig({ ...heightConfig, currentName: event.target.value })}
          placeholder={
            heightConfig.editMode === 'left' ? `${headerLabels.left}を入力` : `${headerLabels.right}を入力（任意）`
          }
        />
        {heightConfig.editMode === 'right' && (
          <p className="text-xs mt-1 text-ink-muted">{headerLabels.right}は任意です。空欄にすると削除されます。</p>
        )}
      </div>

      <div className="mb-6">
        <NumberInput
          label="高さ"
          suffix="px"
          value={draftHeight}
          min={ROW_HEIGHT_MIN_VALUE}
          max={ROW_HEIGHT_MAX_VALUE}
          error={heightError ?? undefined}
          onChange={(event) => setDraftHeight(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleSave()}
        />
        <div className="mt-3">
          <input
            type="range"
            min={ROW_HEIGHT_MIN_VALUE}
            max={ROW_HEIGHT_MAX_VALUE}
            step={5}
            value={draftHeightValue}
            onChange={(event) => setDraftHeight(event.target.value)}
            className="w-full accent-spot"
            aria-label="行の高さ"
          />
          <div className="mt-1 flex justify-between text-xs font-medium text-ink-muted">
            <span>{ROW_HEIGHT_MIN_VALUE}px</span>
            <span>{draftHeightValue}px</span>
            <span>{ROW_HEIGHT_MAX_VALUE}px</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Button
          variant="danger"
          size="sm"
          fullWidth
          onClick={() => {
            if (confirm('この作業ラベルを削除しますか？\n（全てのチームから削除されます）')) {
              onDeleteTaskLabel(heightConfig.taskLabelId);
              setHeightConfig(null);
            }
          }}
          className="!flex !items-center !justify-center !gap-1"
        >
          <MdDelete size={18} />
          削除
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setHeightConfig(null)} className="flex-1">
            キャンセル
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={heightError !== null}
            className="flex-1"
          >
            保存
          </Button>
        </div>
      </div>
    </>
  );
}
