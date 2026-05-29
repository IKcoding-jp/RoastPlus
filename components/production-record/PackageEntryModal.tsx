'use client';

import { useEffect, useState } from 'react';
import { HiX } from 'react-icons/hi';

import { Modal, IconButton, Button, Input, NumberInput } from '@/components/ui';
import { calculatePackageTotals, formatPercent } from '@/lib/productionRecords';
import type { PackageEntry, PackageEntryInput, TeamCounts } from '@/types';

interface PackageEntryModalProps {
  /** 編集時の初期値 */
  initial?: PackageEntry | null;
  /** デフォルトの作業日 (yyyy-MM-dd) */
  defaultWorkDate: string;
  onSave: (input: PackageEntryInput) => Promise<void>;
  onClose: () => void;
}

export function PackageEntryModal({ initial, defaultWorkDate, onSave, onClose }: PackageEntryModalProps) {
  const [workDate, setWorkDate] = useState(defaultWorkDate);
  const [teamAGood, setTeamAGood] = useState('');
  const [teamADefective, setTeamADefective] = useState('');
  const [teamBGood, setTeamBGood] = useState('');
  const [teamBDefective, setTeamBDefective] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setWorkDate(initial.workDate);
    setTeamAGood(String(initial.teamA.goodCount));
    setTeamADefective(String(initial.teamA.defectiveCount));
    setTeamBGood(String(initial.teamB.goodCount));
    setTeamBDefective(String(initial.teamB.defectiveCount));
  }, [initial]);

  const teamA: TeamCounts = {
    goodCount: parseInt(teamAGood, 10) || 0,
    defectiveCount: parseInt(teamADefective, 10) || 0,
  };
  const teamB: TeamCounts = {
    goodCount: parseInt(teamBGood, 10) || 0,
    defectiveCount: parseInt(teamBDefective, 10) || 0,
  };
  const totals = calculatePackageTotals(teamA, teamB);

  const handleSave = async () => {
    setError(null);
    if (workDate === '') {
      setError('作業日を入力してください');
      return;
    }
    if (teamA.goodCount < 0 || teamA.defectiveCount < 0 || teamB.goodCount < 0 || teamB.defectiveCount < 0) {
      setError('個数は0以上の整数で入力してください');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ workDate, teamA, teamB });
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
      <div className="sticky top-0 p-4 flex items-center justify-between z-20 border-b bg-surface border-edge">
        <h2 className="text-xl font-semibold text-ink">パッケージ記録</h2>
        <IconButton onClick={onClose} rounded aria-label="閉じる">
          <HiX className="h-6 w-6" />
        </IconButton>
      </div>

      <div className="space-y-5 p-5">
        <Input label="作業日" type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />

        {/* A班・B班は塗りカードを使わず、小見出し＋区切り線でグループ化（フラット） */}
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink">A班</p>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="良品数"
                labelClassName="text-info"
                suffix="個"
                suffixInside
                align="left"
                min={0}
                step="1"
                placeholder="0"
                value={teamAGood}
                onChange={(e) => setTeamAGood(e.target.value)}
              />
              <NumberInput
                label="不良品数"
                labelClassName="text-danger"
                suffix="個"
                suffixInside
                align="left"
                min={0}
                step="1"
                placeholder="0"
                value={teamADefective}
                onChange={(e) => setTeamADefective(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2 border-t border-edge pt-4">
            <p className="text-sm font-semibold text-ink">B班</p>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="良品数"
                labelClassName="text-info"
                suffix="個"
                suffixInside
                align="left"
                min={0}
                step="1"
                placeholder="0"
                value={teamBGood}
                onChange={(e) => setTeamBGood(e.target.value)}
              />
              <NumberInput
                label="不良品数"
                labelClassName="text-danger"
                suffix="個"
                suffixInside
                align="left"
                min={0}
                step="1"
                placeholder="0"
                value={teamBDefective}
                onChange={(e) => setTeamBDefective(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 合計は区切り線付きの4連メトリクス（塗り無し・枠線のみで出力を区別） */}
        <div className="grid grid-cols-4 divide-x divide-edge overflow-hidden rounded-xl border border-edge">
          <div className="px-3 py-2.5">
            <div className="text-[11px] font-medium text-info">良品合計</div>
            <div className="mt-0.5 text-xl font-bold tabular-nums text-info">{totals.goodTotal}</div>
          </div>
          <div className="px-3 py-2.5">
            <div className="text-[11px] font-medium text-danger">不良品合計</div>
            <div className="mt-0.5 text-xl font-bold tabular-nums text-danger">{totals.defectiveTotal}</div>
          </div>
          <div className="px-3 py-2.5">
            <div className="text-[11px] font-medium text-ink-muted">生産個数</div>
            <div className="mt-0.5 text-xl font-bold tabular-nums text-ink">{totals.producedTotal}</div>
          </div>
          <div className="px-3 py-2.5">
            <div className="text-[11px] font-medium text-danger">不良率</div>
            <div className="mt-0.5 text-xl font-bold tabular-nums text-danger">{formatPercent(totals.defectRate)}</div>
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
