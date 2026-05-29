'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { HiX } from 'react-icons/hi';

import { Modal, IconButton, Button, NumberInput, Input } from '@/components/ui';
import { DEFAULT_POWDER_PER_PACK_GRAM, MAX_BLEND_ITEMS, validateBlendItems } from '@/lib/productionRecords';
import type { BlendItem, ProductionRecordMonth, ProductionRecordMonthInput } from '@/types';

interface MonthSettingsModalProps {
  /** 対象月 (yyyy-MM)。表示のみ。 */
  month: string;
  /** 編集時の初期値 */
  initial?: ProductionRecordMonth | null;
  /** 保存ハンドラ */
  onSave: (input: ProductionRecordMonthInput) => Promise<void>;
  /** 閉じるハンドラ */
  onClose: () => void;
}

interface BlendItemDraft {
  /** React の key 用の安定ID（中間行の削除でフォーカスがずれないようにする） */
  id: string;
  beanName: string;
  ratioPercent: string;
}

/** yyyy-MM を「2026年8月分」表記に変換する */
function formatMonthLabel(month: string): string {
  const [year, mon] = month.split('-');
  return `${year}年${Number(mon)}月分`;
}

export function MonthSettingsModal({ month, initial, onSave, onClose }: MonthSettingsModalProps) {
  // useId() を基点に連番でドラフト行の安定IDを生成する（乱数系APIは使わない）
  const idBase = useId();
  const idCounterRef = useRef(0);
  const nextDraftId = () => `${idBase}-blend-${idCounterRef.current++}`;

  const [greenBeanTotal, setGreenBeanTotal] = useState('');
  const [powderPerPack, setPowderPerPack] = useState(String(DEFAULT_POWDER_PER_PACK_GRAM));
  const [blendDrafts, setBlendDrafts] = useState<BlendItemDraft[]>(() => [
    { id: nextDraftId(), beanName: '', ratioPercent: '' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setGreenBeanTotal(String(initial.greenBeanTotalGram / 1000));
    setPowderPerPack(String(initial.powderPerPackGram));
    setBlendDrafts(
      initial.blendItems.map((item) => ({
        id: nextDraftId(),
        beanName: item.beanName,
        ratioPercent: String(item.ratioPercent),
      }))
    );
    // nextDraftId は ref ベースで安定しているため依存配列には含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const greenBeanTotalGram = (parseFloat(greenBeanTotal) || 0) * 1000;
  const powderPerPackGram = parseFloat(powderPerPack) || 0;

  const ratioSum = blendDrafts.reduce((sum, item) => sum + (parseFloat(item.ratioPercent) || 0), 0);

  const handleAddBlend = () => {
    if (blendDrafts.length >= MAX_BLEND_ITEMS) return;
    setBlendDrafts((prev) => [...prev, { id: nextDraftId(), beanName: '', ratioPercent: '' }]);
  };

  const handleRemoveBlend = (index: number) => {
    setBlendDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBlendChange = (index: number, key: keyof BlendItemDraft, value: string) => {
    setBlendDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const handleSave = async () => {
    setError(null);
    const blendItems: BlendItem[] = blendDrafts.map((item) => ({
      beanName: item.beanName.trim(),
      ratioPercent: parseFloat(item.ratioPercent) || 0,
    }));

    if (greenBeanTotalGram <= 0) {
      setError('生豆総量は0より大きい値を入力してください');
      return;
    }
    if (powderPerPackGram <= 0) {
      setError('1袋粉量は0より大きい値を入力してください');
      return;
    }
    if (blendItems.some((item) => item.beanName === '')) {
      setError('豆名をすべて入力してください');
      return;
    }
    try {
      validateBlendItems(blendItems);
    } catch (e) {
      setError(e instanceof Error ? e.message : '配合比率が不正です');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        month,
        greenBeanTotalGram,
        powderPerPackGram,
        blendItems,
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
        <h2 className="text-xl font-semibold text-ink">月設定（{formatMonthLabel(month)}）</h2>
        <IconButton onClick={onClose} rounded aria-label="閉じる">
          <HiX className="h-6 w-6" />
        </IconButton>
      </div>

      <div className="p-4 space-y-4">
        <NumberInput
          label="生豆総量"
          suffix="kg"
          min={0}
          step="0.01"
          value={greenBeanTotal}
          onChange={(e) => setGreenBeanTotal(e.target.value)}
        />
        <NumberInput
          label="1袋粉量"
          suffix="g"
          min={0}
          step="0.1"
          value={powderPerPack}
          onChange={(e) => setPowderPerPack(e.target.value)}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">配合（最大{MAX_BLEND_ITEMS}件・合計100%）</p>
          {blendDrafts.map((item, index) => {
            const ratio = parseFloat(item.ratioPercent) || 0;
            const requiredKg = (greenBeanTotalGram * (ratio / 100)) / 1000;
            return (
              <div key={item.id} className="space-y-2 rounded-lg p-3 bg-ground">
                <Input
                  label="豆名"
                  value={item.beanName}
                  onChange={(e) => handleBlendChange(index, 'beanName', e.target.value)}
                />
                <div className="flex items-end gap-3">
                  <div className="w-28 shrink-0">
                    <NumberInput
                      label="比率"
                      suffix="%"
                      min={0}
                      value={item.ratioPercent}
                      onChange={(e) => handleBlendChange(index, 'ratioPercent', e.target.value)}
                    />
                  </div>
                  <p className="min-w-0 flex-1 pb-2.5 text-sm text-ink-sub">必要量 {requiredKg.toFixed(2)} kg</p>
                  {blendDrafts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="shrink-0"
                      onClick={() => handleRemoveBlend(index)}
                    >
                      削除
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={handleAddBlend}
              disabled={blendDrafts.length >= MAX_BLEND_ITEMS}
            >
              豆を追加
            </Button>
            <span className={`text-sm ${ratioSum === 100 ? 'text-info' : 'text-danger'}`}>配合合計: {ratioSum}%</span>
          </div>
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
