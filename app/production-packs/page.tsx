'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MdInventory2 } from 'react-icons/md';
import LoginPage from '@/app/login/page';
import { Loading } from '@/components/Loading';
import { useToastContext } from '@/components/Toast';
import { Badge, Button, Card, Dialog, EmptyState, FloatingNav, Input, NumberInput } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import {
  deleteProductionPackRecord,
  saveProductionPackRecord,
  subscribeProductionPackRecord,
  subscribeRecentProductionPackRecords,
} from '@/lib/firestore/productionPackRecords';
import {
  calculateProductionPackTotals,
  formatProductionPackDateLabel,
  getTodayProductionPackDate,
  isProductionPackWorkDateEditable,
  normalizePackCountFieldValue,
  normalizePackCountInput,
} from '@/lib/productionPackRecords';
import type { ProductionPackRecord, ProductionPackRecordInput } from '@/types';

interface ProductionPackFormState {
  teamASuccess: string;
  teamAFailure: string;
  teamBSuccess: string;
  teamBFailure: string;
}

const emptyFormState: ProductionPackFormState = {
  teamASuccess: '0',
  teamAFailure: '0',
  teamBSuccess: '0',
  teamBFailure: '0',
};

function formStateFromRecord(record: ProductionPackRecord | null): ProductionPackFormState {
  if (!record) {
    return emptyFormState;
  }

  return {
    teamASuccess: String(record.teamA.successCount),
    teamAFailure: String(record.teamA.failureCount),
    teamBSuccess: String(record.teamB.successCount),
    teamBFailure: String(record.teamB.failureCount),
  };
}

function buildInputFromForm(workDate: string, form: ProductionPackFormState): ProductionPackRecordInput {
  return {
    workDate,
    teamA: {
      successCount: normalizePackCountInput(form.teamASuccess),
      failureCount: normalizePackCountInput(form.teamAFailure),
    },
    teamB: {
      successCount: normalizePackCountInput(form.teamBSuccess),
      failureCount: normalizePackCountInput(form.teamBFailure),
    },
  };
}

function saveStateLabel(record: ProductionPackRecord | null): string {
  if (!record) {
    return '未保存';
  }

  return '保存済み';
}

function saveStateVariant(record: ProductionPackRecord | null): 'success' | 'secondary' {
  return record ? 'success' : 'secondary';
}

interface TotalTileProps {
  label: string;
  value: number;
}

function TotalTile({ label, value }: TotalTileProps) {
  return (
    <div className="min-h-[86px] rounded-xl border border-edge bg-surface p-3">
      <div className="text-xs font-semibold text-ink-muted">{label}</div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{value}</p>
    </div>
  );
}

export default function ProductionPacksPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToastContext();
  const [todayDate] = useState(() => getTodayProductionPackDate());
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [currentRecord, setCurrentRecord] = useState<ProductionPackRecord | null>(null);
  const [records, setRecords] = useState<ProductionPackRecord[]>([]);
  const [form, setForm] = useState<ProductionPackFormState>(emptyFormState);
  const [isCurrentLoading, setIsCurrentLoading] = useState(true);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setIsCurrentLoading(true);
    return subscribeProductionPackRecord(
      user.uid,
      selectedDate,
      (record) => {
        setCurrentRecord(record);
        setForm(formStateFromRecord(record));
        setIsCurrentLoading(false);
      },
      () => {
        showToast('記録の読み込みに失敗しました', 'error');
        setIsCurrentLoading(false);
      }
    );
  }, [selectedDate, showToast, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setIsListLoading(true);
    return subscribeRecentProductionPackRecords(
      user.uid,
      (nextRecords) => {
        setRecords(nextRecords);
        setIsListLoading(false);
      },
      () => {
        showToast('一覧の読み込みに失敗しました', 'error');
        setIsListLoading(false);
      }
    );
  }, [showToast, user]);

  const formResult = useMemo(() => {
    try {
      const input = buildInputFromForm(selectedDate, form);
      return {
        input,
        totals: calculateProductionPackTotals(input),
        error: '',
      };
    } catch (error) {
      return {
        input: null,
        totals: { successTotal: 0, failureTotal: 0, total: 0 },
        error: error instanceof Error ? error.message : '入力値を確認してください',
      };
    }
  }, [form, selectedDate]);

  const isTodaySelected = selectedDate === todayDate;
  const canEditSelectedDate = isProductionPackWorkDateEditable(selectedDate, todayDate);
  const canSave = canEditSelectedDate && !isCurrentLoading && !isSaving && formResult.error === '';
  const canDelete = isTodaySelected && currentRecord !== null && !isDeleting;
  const isReadOnly = !canEditSelectedDate || isSaving || isDeleting;

  const handleCountChange = (key: keyof ProductionPackFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: normalizePackCountFieldValue(value) }));
  };

  const handleCountBlur = (key: keyof ProductionPackFormState) => {
    setForm((prev) => ({ ...prev, [key]: prev[key] === '' ? '0' : prev[key] }));
  };

  const handleSave = async () => {
    if (!user || !formResult.input) {
      return;
    }

    if (!canEditSelectedDate) {
      showToast('未来日の記録は保存できません', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await saveProductionPackRecord(user.uid, formResult.input);
      showToast('記録を保存しました', 'success');
    } catch (error) {
      console.error('Failed to save production pack record:', error);
      showToast(error instanceof Error ? error.message : '記録の保存に失敗しました', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!user || !currentRecord) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteProductionPackRecord(user.uid, currentRecord.workDate);
      showToast('記録を削除しました', 'success');
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete production pack record:', error);
      showToast(error instanceof Error ? error.message : '記録の削除に失敗しました', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading) {
    return <Loading />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-page pt-24 pb-4 px-4 sm:px-6 lg:px-8 transition-colors duration-1000">
      <FloatingNav backHref="/" />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted">
              <MdInventory2 className="h-5 w-5" />
              <span>パッケージ数の記録</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink">パッケージ数記録</h1>
            <p className="mt-1 text-sm text-ink-sub">日付を選び、A班・B班の成功数と失敗数を保存します。</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Link
              href="/production-packs/monthly"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-edge bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-ground"
            >
              月次集計
            </Link>
            <Input
              type="date"
              label="作業日"
              value={selectedDate}
              max={todayDate}
              onChange={(event) => setSelectedDate(event.target.value || todayDate)}
              className="sm:w-[190px] !py-2 !text-base"
            />
          </div>
        </header>

        <main className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <Card className="space-y-5 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">{formatProductionPackDateLabel(selectedDate)}</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {isTodaySelected
                    ? '当日分は保存・修正・削除できます。'
                    : '過去日の追加・修正ができます。削除は当日分のみです。'}
                </p>
              </div>
              <Badge variant={saveStateVariant(currentRecord)} size="md">
                {saveStateLabel(currentRecord)}
              </Badge>
            </div>

            {isCurrentLoading ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-ink-muted">読み込み中...</div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <section className="rounded-xl border border-edge bg-surface p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-ink">A班</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <NumberInput
                        label="成功"
                        value={form.teamASuccess}
                        min={0}
                        step={1}
                        inputMode="numeric"
                        disabled={isReadOnly}
                        onChange={(event) => handleCountChange('teamASuccess', event.target.value)}
                        onBlur={() => handleCountBlur('teamASuccess')}
                        className="min-h-[58px] !py-1.5 text-2xl font-bold"
                      />
                      <NumberInput
                        label="失敗"
                        value={form.teamAFailure}
                        min={0}
                        step={1}
                        inputMode="numeric"
                        disabled={isReadOnly}
                        onChange={(event) => handleCountChange('teamAFailure', event.target.value)}
                        onBlur={() => handleCountBlur('teamAFailure')}
                        className="min-h-[58px] !py-1.5 text-2xl font-bold"
                      />
                    </div>
                  </section>

                  <section className="rounded-xl border border-edge bg-surface p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-ink">B班</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <NumberInput
                        label="成功"
                        value={form.teamBSuccess}
                        min={0}
                        step={1}
                        inputMode="numeric"
                        disabled={isReadOnly}
                        onChange={(event) => handleCountChange('teamBSuccess', event.target.value)}
                        onBlur={() => handleCountBlur('teamBSuccess')}
                        className="min-h-[58px] !py-1.5 text-2xl font-bold"
                      />
                      <NumberInput
                        label="失敗"
                        value={form.teamBFailure}
                        min={0}
                        step={1}
                        inputMode="numeric"
                        disabled={isReadOnly}
                        onChange={(event) => handleCountChange('teamBFailure', event.target.value)}
                        onBlur={() => handleCountBlur('teamBFailure')}
                        className="min-h-[58px] !py-1.5 text-2xl font-bold"
                      />
                    </div>
                  </section>
                </div>

                {formResult.error && <p className="text-sm font-medium text-error">{formResult.error}</p>}

                <div className="grid gap-3 sm:grid-cols-3">
                  <TotalTile label="成功合計" value={formResult.totals.successTotal} />
                  <TotalTile label="失敗合計" value={formResult.totals.failureTotal} />
                  <TotalTile label="総数" value={formResult.totals.total} />
                </div>

                <div className="flex flex-col gap-3 border-t border-edge pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant={canDelete ? 'danger' : 'surface'}
                    size="sm"
                    type="button"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={!canDelete}
                    loading={isDeleting}
                    className={`w-full sm:w-28 ${canDelete ? '' : '!border-edge !bg-surface !text-ink-muted !shadow-none'}`}
                  >
                    削除
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleSave}
                    disabled={!canSave}
                    loading={isSaving}
                    className="w-full sm:w-32"
                  >
                    保存
                  </Button>
                </div>
              </>
            )}
          </Card>

          <Card className="space-y-4 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">過去の記録</h2>
                <p className="mt-1 text-sm text-ink-muted">最新30件を表示します。</p>
              </div>
            </div>

            {isListLoading ? (
              <div className="flex min-h-[180px] items-center justify-center text-sm text-ink-muted">読み込み中...</div>
            ) : records.length === 0 ? (
              <EmptyState
                title="記録がありません"
                description="今日のパッケージ数を保存すると、ここに表示されます。"
                icon={<MdInventory2 className="h-8 w-8" />}
                size="sm"
              />
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <article
                    key={record.workDate}
                    className="rounded-xl border border-edge bg-surface p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDate(record.workDate)}
                        className="!min-h-0 !justify-start !px-0 !py-0 text-left text-base font-bold !text-ink hover:!text-ink-sub"
                      >
                        {formatProductionPackDateLabel(record.workDate)}
                      </Button>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-edge bg-surface p-2.5">
                        <div className="text-xs font-medium text-ink-muted">成功</div>
                        <div className="mt-1 text-lg font-bold tabular-nums text-ink">{record.successTotal}</div>
                      </div>
                      <div className="rounded-lg border border-edge bg-surface p-2.5">
                        <div className="text-xs font-medium text-ink-muted">失敗</div>
                        <div className="mt-1 text-lg font-bold tabular-nums text-ink">{record.failureTotal}</div>
                      </div>
                      <div className="rounded-lg border border-edge bg-surface p-2.5">
                        <div className="text-xs font-medium text-ink-muted">総数</div>
                        <div className="mt-1 text-lg font-bold tabular-nums text-ink">{record.total}</div>
                      </div>
                    </div>
                    <details className="mt-3 text-sm text-ink-sub">
                      <summary className="cursor-pointer font-medium text-ink-sub hover:text-ink">内訳を見る</summary>
                      <div className="mt-2 space-y-1">
                        <p>
                          A班 成功 {record.teamA.successCount} / 失敗 {record.teamA.failureCount}
                        </p>
                        <p>
                          B班 成功 {record.teamB.successCount} / 失敗 {record.teamB.failureCount}
                        </p>
                      </div>
                    </details>
                  </article>
                ))}
              </div>
            )}
          </Card>
        </main>
      </div>

      <Dialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="記録を削除しますか？"
        description="この日の記録を消します。消すと入力は0に戻り、一覧からも消えます。"
        confirmText="削除する"
        cancelText="戻る"
        onConfirm={handleDeleteRecord}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
