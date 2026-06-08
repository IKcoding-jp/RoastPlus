'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { HiPlus, HiX } from 'react-icons/hi';

import { Modal, IconButton, Button, NumberInput } from '@/components/ui';
import { DEFAULT_POWDER_PER_PACK_GRAM, MAX_BLEND_ITEMS, formatKg, validateBlendItems } from '@/lib/productionRecords';
import type { BlendItem, ProductionRecordMonth, ProductionRecordMonthInput } from '@/types';

interface MonthSettingsModalProps {
  /** 対象月 (yyyy-MM)。表示のみ。 */
  month: string;
  /** 編集時の初期値 */
  initial?: ProductionRecordMonth | null;
  /** 入力済みのハンドピック済み生豆重量合計(g)。生豆総量はこれを下回れない。新規作成時は0 */
  handpickedTotalGram?: number;
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

export function MonthSettingsModal({
  month,
  initial,
  handpickedTotalGram = 0,
  onSave,
  onClose,
}: MonthSettingsModalProps) {
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
    // 既に入力済みのハンドピック済み合計を下回る総量は、月合計CSVと詳細記録の整合を崩すため拒否する
    if (greenBeanTotalGram < handpickedTotalGram) {
      setError(`生豆総量はハンドピック済み合計（${formatKg(handpickedTotalGram)}kg）以上で入力してください`);
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
      contentClassName="rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto bg-overlay border border-edge shadow-xl"
    >
      <div className="sticky top-0 p-5 flex items-center justify-between z-20 border-b bg-surface border-edge">
        <h2 className="text-xl font-semibold text-ink">月設定（{formatMonthLabel(month)}）</h2>
        <IconButton onClick={onClose} rounded aria-label="閉じる">
          <HiX className="h-6 w-6" />
        </IconButton>
      </div>

      <div className="p-5 space-y-5">
        {/* 月の基本設定：2カラムで均等に並べ、下の配合表と左右端を揃える */}
        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="生豆総量"
            suffix="kg"
            suffixInside
            align="left"
            min={0}
            step="0.01"
            placeholder="0"
            value={greenBeanTotal}
            onChange={(e) => setGreenBeanTotal(e.target.value)}
          />
          <NumberInput
            label="1袋粉量"
            suffix="g"
            suffixInside
            align="left"
            min={0}
            step="0.1"
            placeholder="0"
            value={powderPerPack}
            onChange={(e) => setPowderPerPack(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold text-ink">配合</p>
            <p className="text-xs text-ink-muted">最大{MAX_BLEND_ITEMS}件・合計100%</p>
          </div>
          {/* 配合：セル一体のスプレッドシート型。入力欄をセルいっぱいに広げ、
              ヘッダーと中身を同じセル余白(px-3)で揃える。枠は標準入力ではなくセル側で描く。 */}
          <div className="overflow-hidden rounded-xl border border-edge">
            {/* ヘッダー行：4列をそのままデータ行と共有して位置を一致させる */}
            <div className="grid grid-cols-[1fr_92px_104px_44px] divide-x divide-edge border-b border-edge bg-surface text-[11px] font-medium text-ink-muted">
              <div className="px-3 py-2">豆名</div>
              <div className="px-3 py-2">比率</div>
              <div className="px-3 py-2">必要量</div>
              <div className="px-3 py-2 sr-only">削除</div>
            </div>
            <div className="divide-y divide-edge">
              {blendDrafts.map((item, index) => {
                const ratio = parseFloat(item.ratioPercent) || 0;
                const requiredKg = (greenBeanTotalGram * (ratio / 100)) / 1000;
                // セルいっぱいの枠なし入力。フォーカスは枠ではなく塗り＋内側リングで示す。
                const cellInput =
                  'min-h-[44px] w-full bg-transparent px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:bg-field focus:outline-none focus:ring-2 focus:ring-inset focus:ring-spot-subtle';
                return (
                  <div key={item.id} className="grid grid-cols-[1fr_92px_104px_44px] divide-x divide-edge">
                    {/* 豆名 */}
                    <input
                      aria-label={`豆 ${index + 1}`}
                      placeholder="豆名"
                      className={cellInput}
                      value={item.beanName}
                      onChange={(e) => handleBlendChange(index, 'beanName', e.target.value)}
                    />
                    {/* 比率：% はセル内右端に固定 */}
                    <div className="relative">
                      <input
                        aria-label="比率"
                        type="number"
                        min={0}
                        placeholder="0"
                        className={`${cellInput} pr-7`}
                        value={item.ratioPercent}
                        onChange={(e) => handleBlendChange(index, 'ratioPercent', e.target.value)}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs font-medium text-ink-sub">
                        %
                      </span>
                    </div>
                    {/* 必要量：派生表示（読み取り専用）。0のときは薄色で静かに */}
                    <div
                      className={`flex min-h-[44px] items-center px-3 py-2 text-sm font-bold tabular-nums ${
                        requiredKg > 0 ? 'text-ink' : 'text-ink-muted'
                      }`}
                    >
                      {requiredKg.toFixed(2)}
                      <span className="ml-0.5 text-xs font-medium text-ink-sub">kg</span>
                    </div>
                    {/* 削除：1行だけのときは消せないよう空セル */}
                    <div className="flex items-center justify-center">
                      {blendDrafts.length > 1 && (
                        // eslint-disable-next-line local/no-raw-button -- セル内に収める小型の削除ボタンのため Button では表現できない
                        <button
                          type="button"
                          aria-label={`豆 ${index + 1} を削除`}
                          onClick={() => handleRemoveBlend(index)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ground hover:text-ink"
                        >
                          <HiX className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={handleAddBlend}
              disabled={blendDrafts.length >= MAX_BLEND_ITEMS}
            >
              <HiPlus className="h-4 w-4" />
              豆を追加
            </Button>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
                ratioSum === 100 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
              }`}
            >
              配合合計 {ratioSum}%
            </span>
          </div>
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
