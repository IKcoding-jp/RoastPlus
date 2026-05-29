'use client';

import { useEffect, useState } from 'react';
import { HiX } from 'react-icons/hi';

import { Modal, IconButton, Button, Input, NumberInput } from '@/components/ui';
import { calculateDailyTheoryPacks, calculateRoastYield, formatPercent } from '@/lib/productionRecords';
import type { RoastEntry, RoastEntryInput } from '@/types';

interface RoastEntryModalProps {
  /** 月設定の1袋粉量(g)。当日理論袋数の計算に使う。 */
  powderPerPackGram: number;
  /** 編集時の初期値 */
  initial?: RoastEntry | null;
  /** デフォルトの作業日 (yyyy-MM-dd) */
  defaultWorkDate: string;
  onSave: (input: RoastEntryInput) => Promise<void>;
  onClose: () => void;
}

export function RoastEntryModal({
  powderPerPackGram,
  initial,
  defaultWorkDate,
  onSave,
  onClose,
}: RoastEntryModalProps) {
  const [workDate, setWorkDate] = useState(defaultWorkDate);
  const [beforeWeight, setBeforeWeight] = useState('');
  const [afterWeight, setAfterWeight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setWorkDate(initial.workDate);
    setBeforeWeight(String(initial.beforeRoastWeightGram / 1000));
    setAfterWeight(String(initial.afterRoastWeightGram / 1000));
  }, [initial]);

  const beforeRoastWeightGram = (parseFloat(beforeWeight) || 0) * 1000;
  const afterRoastWeightGram = (parseFloat(afterWeight) || 0) * 1000;
  const roastYield = calculateRoastYield(beforeRoastWeightGram, afterRoastWeightGram);
  const dailyTheoryPacks = calculateDailyTheoryPacks(afterRoastWeightGram, powderPerPackGram);

  const handleSave = async () => {
    setError(null);
    if (workDate === '') {
      setError('作業日を入力してください');
      return;
    }
    if (beforeRoastWeightGram <= 0) {
      setError('焙煎前重量は0より大きい値を入力してください');
      return;
    }
    if (afterRoastWeightGram <= 0) {
      setError('焙煎後重量は0より大きい値を入力してください');
      return;
    }
    if (afterRoastWeightGram > beforeRoastWeightGram) {
      setError('焙煎後重量は焙煎前重量以下にしてください');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        workDate,
        beforeRoastWeightGram,
        afterRoastWeightGram,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      show={true}
      onClose={onClose}
      closeOnBackdropClick={false}
      contentClassName="rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto bg-overlay border border-edge"
    >
      <div className="sticky top-0 p-4 flex items-center justify-between z-20 border-b bg-surface border-edge">
        <h2 className="text-xl font-semibold text-ink">焙煎記録</h2>
        <IconButton onClick={onClose} rounded aria-label="閉じる">
          <HiX className="h-6 w-6" />
        </IconButton>
      </div>

      <div className="p-4 space-y-4">
        <Input label="作業日" type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
        <NumberInput
          label="焙煎前重量"
          suffix="kg"
          min={0}
          step="0.01"
          value={beforeWeight}
          onChange={(e) => setBeforeWeight(e.target.value)}
        />
        <NumberInput
          label="焙煎後重量"
          suffix="kg"
          min={0}
          step="0.01"
          value={afterWeight}
          onChange={(e) => setAfterWeight(e.target.value)}
        />

        <div className="rounded-lg p-3 space-y-1 bg-ground">
          <p className="text-sm text-ink-sub">
            焙煎歩留まり: <span className="font-bold text-ink">{formatPercent(roastYield)}</span>
          </p>
          <p className="text-sm text-ink-sub">
            当日理論袋数: <span className="font-bold text-ink">{dailyTheoryPacks} 袋</span>
          </p>
        </div>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 p-4 flex justify-end gap-2 border-t bg-surface border-edge">
        <Button variant="secondary" type="button" onClick={onClose}>
          キャンセル
        </Button>
        <Button variant="primary" type="button" loading={isSaving} onClick={handleSave}>
          保存
        </Button>
      </div>
    </Modal>
  );
}
