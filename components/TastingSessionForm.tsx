'use client';

import { useState } from 'react';
import type { TastingSession } from '@/types';
import { useToastContext } from '@/components/Toast';
import { motion } from 'framer-motion';
import { Coffee, CalendarBlank, Thermometer, Trash, Plus, Warning } from 'phosphor-react';
import { Input, Select, Button } from '@/components/ui';
import { ROAST_LEVELS } from '@/lib/constants';
import { getTodayDateString } from '@/lib/dateUtils';

interface TastingSessionFormProps {
  session: TastingSession | null;
  onSave: (session: TastingSession) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export function TastingSessionForm({ session, onSave, onCancel, onDelete }: TastingSessionFormProps) {
  const isNew = !session;
  const { showToast } = useToastContext();

  const [beanName, setBeanName] = useState(session?.beanName || '');
  const [createdAt, setCreatedAt] = useState(
    session?.createdAt ? session.createdAt.split('T')[0] : getTodayDateString()
  );
  const [roastLevel, setRoastLevel] = useState<'浅煎り' | '中煎り' | '中深煎り' | '深煎り'>(
    session?.roastLevel || '中深煎り'
  );

  const handleDelete = () => {
    if (!session || !onDelete) return;
    onDelete(session.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!beanName.trim()) {
      showToast('豆の名前を入力してください', 'warning');
      return;
    }

    const now = new Date().toISOString();
    const createdAtDate = createdAt ? new Date(createdAt).toISOString() : now;
    const sessionData: TastingSession = {
      id: session?.id || crypto.randomUUID(),
      beanName: beanName.trim(),
      roastLevel,
      createdAt: createdAtDate,
      updatedAt: now,
      userId: session?.userId || '',
    };

    onSave(sessionData);
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {/* メインカード */}
      <div className="rounded-lg bg-surface border border-edge shadow-sm overflow-hidden">
        {/* セクションヘッダー */}
        <div className="px-4 py-3 border-b border-edge flex items-center gap-2">
          <Coffee size={15} weight="fill" className="text-spot" />
          <span className="text-sm font-semibold text-ink">基本情報</span>
        </div>

        {/* フィールド群 */}
        <div className="p-4 space-y-4">
          {/* 豆の名前 */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold ml-1 text-ink-sub">
              豆の名前 <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={beanName}
              onChange={(e) => setBeanName(e.target.value)}
              required
              placeholder="例: コロンビア・エチオピアなど"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 焙煎度合い */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold ml-1 text-ink-sub">
                <Thermometer size={14} weight="bold" className="text-spot" />
                焙煎度合い <span className="text-red-500">*</span>
              </label>
              <Select
                value={roastLevel}
                onChange={(e) => setRoastLevel(e.target.value as '浅煎り' | '中煎り' | '中深煎り' | '深煎り')}
                options={ROAST_LEVELS.map((level) => ({ value: level, label: level }))}
                required
              />
            </div>

            {/* 試飲日 */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold ml-1 text-ink-sub">
                <CalendarBlank size={14} weight="bold" className="text-spot" />
                試飲日 <span className="text-red-500">*</span>
              </label>
              <Input type="date" value={createdAt} onChange={(e) => setCreatedAt(e.target.value)} required />
            </div>
          </div>
        </div>
      </div>

      {/* ボタン行 */}
      <div className="flex gap-3">
        <Button type="button" variant="surface" onClick={onCancel} className="flex-1">
          キャンセル
        </Button>
        <Button type="submit" variant="primary" className="flex-[1.5]">
          {isNew ? (
            <>
              <Plus size={18} weight="bold" />
              試飲感想を追加
            </>
          ) : (
            '更新する'
          )}
        </Button>
      </div>

      {/* Danger Zone（編集時のみ） */}
      {!isNew && onDelete && (
        <div className="rounded-lg border border-edge bg-surface p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Warning size={13} weight="fill" className="text-danger" />
            <span className="text-xs font-bold text-danger">危険な操作</span>
          </div>
          <Button type="button" variant="danger" onClick={handleDelete} className="w-full">
            <Trash size={16} weight="bold" />
            試飲感想を削除する
          </Button>
        </div>
      )}
    </motion.form>
  );
}
