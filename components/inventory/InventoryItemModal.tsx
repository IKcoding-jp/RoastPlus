'use client';

import { useState } from 'react';
import { Modal, Input, Select, Textarea } from '@/components/ui';
import { StatusToggle } from './StatusToggle';
import { CATEGORY_LABELS } from '@/lib/inventory';
import type { InventoryCategory, InventoryItem, InventoryItemInput, InventoryStatus } from '@/types';

const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABELS) as InventoryCategory[]).map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

// 共通 Input/Select/Textarea は text-lg・厚いpaddingで大きいため、在庫まわりの
// コンパクト基調(13〜14px・控えめpadding)に合わせて className で上書きする。
const FIELD_CLASS = '!min-h-0 !rounded-[10px] !border !px-3 !py-2 !text-sm';

interface InventoryItemModalProps {
  /** モーダルの表示/非表示 */
  open: boolean;
  /** 編集対象。null/未指定なら新規追加モード */
  initial?: InventoryItem | null;
  /** モーダルを閉じるコールバック */
  onClose: () => void;
  /** 保存時に正規化前の入力を渡す（保存処理・トーストは親が担当） */
  onSave: (input: InventoryItemInput) => void;
}

export function InventoryItemModal({ open, initial, onClose, onSave }: InventoryItemModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<InventoryCategory>(initial?.category ?? 'consumable');
  const [status, setStatus] = useState<InventoryStatus>(initial?.status ?? 'enough');
  const [note, setNote] = useState(initial?.note ?? '');

  const isEditing = Boolean(initial);
  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) {
      return;
    }
    onSave({ name, category, status, note });
  };

  return (
    <Modal
      show={open}
      onClose={onClose}
      contentClassName="bg-overlay rounded-2xl shadow-xl overflow-hidden max-w-md w-full border border-edge"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-bold text-ink">{isEditing ? '品目を編集' : '品目を追加'}</h2>

        <Input
          label="品目名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: ドリップ袋"
          className={FIELD_CLASS}
        />

        <Select
          label="カテゴリ"
          value={category}
          options={CATEGORY_OPTIONS}
          onChange={(e) => setCategory(e.target.value as InventoryCategory)}
          className={FIELD_CLASS}
        />

        <div>
          <span className="mb-2 block text-sm font-medium text-ink">状態</span>
          <StatusToggle value={status} onChange={setStatus} />
        </div>

        <Textarea
          label="メモ（任意）"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="例: 残りわずか"
          className={FIELD_CLASS}
        />

        <div className="flex justify-end gap-2 pt-1">
          {/* eslint-disable-next-line local/no-raw-button -- モーダルのコンパクト基調に合わせた小型フッターボタン。共通Buttonはサイズが合わない */}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-[38px] items-center justify-center rounded-[10px] px-4 text-[13px] font-bold text-ink-sub transition-colors hover:bg-ground focus:outline-none focus-visible:ring-2 focus-visible:ring-spot/40"
          >
            キャンセル
          </button>
          {/* eslint-disable-next-line local/no-raw-button -- 同上 */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex h-[38px] items-center justify-center rounded-[10px] bg-btn-primary px-4 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-btn-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-spot/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </Modal>
  );
}
