'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { HiDownload } from 'react-icons/hi';
import { MdInventory2 } from 'react-icons/md';
import LoginPage from '@/app/login/page';
import { Loading } from '@/components/Loading';
import { useToastContext } from '@/components/Toast';
import { Button, Card, EmptyState, FloatingNav, Input } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { getProductionPackRecordsByMonth } from '@/lib/firestore/productionPackRecords';
import {
  buildProductionPackMonthlyCsv,
  buildProductionPackMonthlySummary,
  formatProductionPackFailureRate,
  formatProductionPackMonthLabel,
  getProductionPackMonthlyCsvFileName,
  getTodayProductionPackDate,
} from '@/lib/productionPackRecords';
import type { ProductionPackRecord } from '@/types';

function getCurrentProductionPackMonth(): string {
  return getTodayProductionPackDate().slice(0, 7);
}

interface SummaryTileProps {
  label: string;
  value: ReactNode;
  description: string;
}

function SummaryTile({ label, value, description }: SummaryTileProps) {
  return (
    <div className="min-h-[106px] rounded-xl border border-edge bg-surface p-3">
      <div className="text-xs font-semibold text-ink-muted">{label}</div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-sub">{description}</p>
    </div>
  );
}

export default function ProductionPackMonthlyPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToastContext();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentProductionPackMonth);
  const [records, setRecords] = useState<ProductionPackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;

    getProductionPackRecordsByMonth(user.uid, selectedMonth)
      .then((monthlyRecords) => {
        if (!isMounted) {
          return;
        }

        setRecords(monthlyRecords);
      })
      .catch((error) => {
        console.error('Failed to load monthly production pack records:', error);
        if (isMounted) {
          showToast('月次集計の読み込みに失敗しました', 'error');
          setRecords([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedMonth, showToast, user]);

  const summary = useMemo(() => buildProductionPackMonthlySummary(selectedMonth, records), [records, selectedMonth]);

  const handleMonthChange = (value: string) => {
    const nextMonth = value || getCurrentProductionPackMonth();
    if (nextMonth === selectedMonth) {
      return;
    }

    setIsLoading(true);
    setSelectedMonth(nextMonth);
  };

  const handleExportCsv = () => {
    const csv = buildProductionPackMonthlyCsv(summary);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = getProductionPackMonthlyCsvFileName(selectedMonth);
    link.click();
    window.URL.revokeObjectURL(url);
    showToast('CSVを出力しました', 'success');
  };

  if (authLoading) {
    return <Loading />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-page pt-24 pb-4 px-4 sm:px-6 lg:px-8 transition-colors duration-1000">
      <FloatingNav backHref="/production-packs" />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted">
              <MdInventory2 className="h-5 w-5" />
              <span>パッケージ数の月次集計</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink">パッケージ数 月次集計</h1>
            <p className="mt-1 text-sm text-ink-sub">本社報告用に、月ごとの成功数と失敗数を確認します。</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              type="month"
              label="対象年月"
              value={selectedMonth}
              onChange={(event) => handleMonthChange(event.target.value)}
              className="sm:w-[190px] !py-2 !text-base"
            />
            <Button type="button" size="sm" onClick={handleExportCsv} disabled={isLoading} className="w-full sm:w-auto">
              <HiDownload className="h-5 w-5" />
              CSV出力
            </Button>
          </div>
        </header>

        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">{formatProductionPackMonthLabel(selectedMonth)}</h2>
              <p className="mt-1 text-sm text-ink-muted">日別記録から月合計を計算します。</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile label="成功数" value={summary.totals.successTotal} description="商品用の個数" />
            <SummaryTile label="失敗数" value={summary.totals.failureTotal} description="社内用の個数" />
            <SummaryTile label="総数" value={summary.totals.total} description="成功数 + 失敗数" />
            <SummaryTile
              label="失敗率"
              value={formatProductionPackFailureRate(summary.failureRate)}
              description="失敗数 ÷ 総数"
            />
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">日別明細</h2>
            <p className="mt-1 text-sm text-ink-muted">日付の昇順で表示します。</p>
          </div>

          {isLoading ? (
            <div className="flex min-h-[180px] items-center justify-center text-sm text-ink-muted">読み込み中...</div>
          ) : summary.dailyRecords.length === 0 ? (
            <EmptyState
              title="記録がありません"
              description="選択した月に集計対象のパッケージ数記録はありません。"
              icon={<MdInventory2 className="h-8 w-8" />}
              size="sm"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="text-ink-muted">
                    <th className="rounded-l-xl border-y border-l border-edge bg-spot-surface px-3 py-2.5 font-semibold">
                      作業日
                    </th>
                    <th className="border-y border-edge bg-spot-surface px-3 py-2.5 text-right font-semibold">成功数</th>
                    <th className="border-y border-edge bg-spot-surface px-3 py-2.5 text-right font-semibold">失敗数</th>
                    <th className="border-y border-edge bg-spot-surface px-3 py-2.5 text-right font-semibold">
                      総数
                    </th>
                    <th className="rounded-r-xl border-y border-r border-edge bg-spot-surface px-3 py-2.5 text-right font-semibold">
                      失敗率
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.dailyRecords.map((record) => (
                    <tr key={record.workDate} className="text-ink">
                      <td className="border-b border-edge px-3 py-3 font-semibold">{record.workDate}</td>
                      <td className="border-b border-edge px-3 py-3 text-right font-bold tabular-nums">
                        {record.successTotal}
                      </td>
                      <td className="border-b border-edge px-3 py-3 text-right font-bold tabular-nums">
                        {record.failureTotal}
                      </td>
                      <td className="border-b border-edge px-3 py-3 text-right font-bold tabular-nums">
                        {record.total}
                      </td>
                      <td className="border-b border-edge px-3 py-3 text-right font-bold tabular-nums">
                        {formatProductionPackFailureRate(record.failureRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
