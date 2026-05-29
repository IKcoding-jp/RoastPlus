'use client';

import { useEffect, useState } from 'react';
import { HiX } from 'react-icons/hi';

import { Modal, IconButton, Button, Input, NumberInput, Select } from '@/components/ui';
import { calculateDefectRate, formatPercent } from '@/lib/productionRecords';
import type { HandpickEntry, HandpickEntryInput, HandpickSegment } from '@/types';

interface HandpickEntryModalProps {
  /** 月設定で登録された豆名の一覧（Select の選択肢になる） */
  beanNames: string[];
  /** 編集時の初期値 */
  initial?: HandpickEntry | null;
  /** デフォルトの作業日 (yyyy-MM-dd) */
  defaultWorkDate: string;
  onSave: (input: HandpickEntryInput) => Promise<void>;
  onClose: () => void;
}

const SEGMENT_LABELS: Record<HandpickSegment, string> = {
  first: '前半',
  second: '後半',
};

export function HandpickEntryModal({ beanNames, initial, defaultWorkDate, onSave, onClose }: HandpickEntryModalProps) {
  const [workDate, setWorkDate] = useState(defaultWorkDate);
  const [beanName, setBeanName] = useState(beanNames[0] ?? '');
  const [segment, setSegment] = useState<HandpickSegment>('first');
  const [greenBeanWeight, setGreenBeanWeight] = useState('');
  const [defectBeanWeight, setDefectBeanWeight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setWorkDate(initial.workDate);
    setBeanName(initial.beanName);
    setSegment(initial.segment);
    setGreenBeanWeight(String(initial.greenBeanWeightGram / 1000));
    setDefectBeanWeight(String(initial.defectBeanWeightGram));
  }, [initial]);

  const greenBeanWeightGram = (parseFloat(greenBeanWeight) || 0) * 1000;
  // 欠点豆重量gは整数運用。小数入力されても整数に丸めて担保する。
  const defectBeanWeightGram = Math.round(parseFloat(defectBeanWeight) || 0);
  const defectRate = calculateDefectRate(defectBeanWeightGram, greenBeanWeightGram);

  const handleSave = async () => {
    setError(null);
    if (workDate === '') {
      setError('作業日を入力してください');
      return;
    }
    if (beanName === '') {
      setError('豆の種類を選択してください');
      return;
    }
    if (greenBeanWeightGram <= 0) {
      setError('今回生豆重量は0より大きい値を入力してください');
      return;
    }
    if (defectBeanWeightGram < 0) {
      setError('欠点豆重量は0以上の値を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        workDate,
        beanName,
        segment,
        greenBeanWeightGram,
        defectBeanWeightGram,
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
      contentClassName="rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto bg-overlay border border-edge shadow-xl"
    >
      <div className="sticky top-0 p-5 flex items-center justify-between z-20 border-b bg-surface border-edge">
        <h2 className="text-xl font-semibold text-ink">ハンドピック記録</h2>
        <IconButton onClick={onClose} rounded aria-label="閉じる">
          <HiX className="h-6 w-6" />
        </IconButton>
      </div>

      <div className="p-5 space-y-5">
        <Input label="作業日" type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="豆の種類"
            placeholder="選択してください"
            options={beanNames.map((name) => ({ value: name, label: name }))}
            value={beanName}
            onChange={(e) => setBeanName(e.target.value)}
          />
          <Select
            label="区分"
            options={[
              { value: 'first', label: SEGMENT_LABELS.first },
              { value: 'second', label: SEGMENT_LABELS.second },
            ]}
            value={segment}
            onChange={(e) => setSegment(e.target.value as HandpickSegment)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="今回生豆重量"
            suffix="kg"
            suffixInside
            align="left"
            min={0}
            step="0.01"
            placeholder="0"
            value={greenBeanWeight}
            onChange={(e) => setGreenBeanWeight(e.target.value)}
          />
          <NumberInput
            label="欠点豆重量"
            suffix="g"
            suffixInside
            align="left"
            min={0}
            step={1}
            placeholder="0"
            value={defectBeanWeight}
            onChange={(e) => setDefectBeanWeight(e.target.value)}
          />
        </div>

        {/* 自動計算の出力：塗り無し・枠線のみで入力と区別 */}
        <div className="overflow-hidden rounded-xl border border-edge px-3 py-2.5">
          <div className="text-[11px] font-medium text-ink-muted">今回の欠点率</div>
          <div className="mt-0.5 text-xl font-bold tabular-nums text-ink">{formatPercent(defectRate)}</div>
        </div>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 p-5 flex justify-end gap-2 border-t bg-surface border-edge">
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
