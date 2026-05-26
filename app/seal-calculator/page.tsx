'use client';

import { useState } from 'react';
import { MdCalendarMonth, MdInfoOutline, MdLocalOffer } from 'react-icons/md';

import LoginPage from '@/app/login/page';
import { Loading } from '@/components/Loading';
import { Card, FloatingNav, Input, NumberInput } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import {
  SEAL_CALCULATOR_RULES,
  calculateBestBeforeYearMonth,
  calculateRequiredSealSheets,
  formatYearMonthLabel,
  parsePremixBagCount,
} from '@/lib/sealCalculator';

export default function SealCalculatorPage() {
  const { user, loading } = useAuth();
  const [premixBagInput, setPremixBagInput] = useState('');
  const [manufacturingYearMonth, setManufacturingYearMonth] = useState('');

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <LoginPage />;
  }

  const premixBagCount = parsePremixBagCount(premixBagInput);
  const hasPremixBagInput = premixBagInput.trim() !== '';
  const premixBagError =
    hasPremixBagInput && premixBagCount === null ? '1より大きい袋数を入力してください' : undefined;
  const requiredSheets = premixBagCount === null ? null : calculateRequiredSealSheets(premixBagCount);
  const bestBeforeYearMonth = calculateBestBeforeYearMonth(manufacturingYearMonth);
  const bestBeforeLabel = bestBeforeYearMonth ? formatYearMonthLabel(bestBeforeYearMonth) : null;

  return (
    <div className="min-h-screen bg-page px-4 pt-24 pb-10 sm:px-6 lg:px-8 transition-colors">
      <FloatingNav backHref="/" />

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <MdLocalOffer className="h-6 w-6 text-spot" aria-hidden="true" />
            <h1 className="text-xl font-bold text-ink sm:text-2xl">シール計算</h1>
          </div>
          <p className="text-sm leading-6 text-ink-sub">
            プレミックス袋数と製造月から、必要な賞味期限シールシート数と賞味期限年月を確認します。
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <Card variant="default" className="p-5 sm:p-6">
            <div className="flex flex-col gap-5">
              <NumberInput
                label="プレミックス袋数"
                value={premixBagInput}
                onChange={(event) => setPremixBagInput(event.target.value)}
                min="0"
                step="0.1"
                inputMode="decimal"
                placeholder="例: 10"
                suffix="袋"
                error={premixBagError}
                className="w-full sm:w-48"
              />

              <Input
                label="製造月"
                type="month"
                value={manufacturingYearMonth}
                onChange={(event) => setManufacturingYearMonth(event.target.value)}
                className="sm:max-w-xs"
              />
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Card variant="default" className="p-5">
              <p className="text-sm font-medium text-ink-sub">必要シールシート数</p>
              <p className="mt-2 text-3xl font-bold text-ink" aria-live="polite">
                {requiredSheets === null ? '入力待ち' : `${requiredSheets}シート`}
              </p>
            </Card>

            <Card variant="default" className="p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-ink-sub">
                <MdCalendarMonth className="h-5 w-5 text-spot" aria-hidden="true" />
                賞味期限年月
              </p>
              <p className="mt-2 text-3xl font-bold text-ink" aria-live="polite">
                {bestBeforeLabel ?? '製造月を選択'}
              </p>
            </Card>
          </div>
        </section>

        <Card variant="guide" className="p-4 text-left sm:p-5">
          <div className="flex gap-3">
            <MdInfoOutline className="mt-0.5 h-5 w-5 flex-none text-spot" aria-hidden="true" />
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-ink">計算根拠</h2>
              <p className="text-sm leading-6 text-ink-sub">
                ceil(プレミックス袋数 × {SEAL_CALCULATOR_RULES.premixBagGrams}g ×{' '}
                {SEAL_CALCULATOR_RULES.roastedYieldRate * 100}% ÷ {SEAL_CALCULATOR_RULES.gramsPerPack}g ÷{' '}
                {SEAL_CALCULATOR_RULES.labelsPerSheet}枚) + {SEAL_CALCULATOR_RULES.extraSheets}シート
              </p>
              <p className="text-xs leading-5 text-ink-muted">
                賞味期限は製造月の{SEAL_CALCULATOR_RULES.shelfLifeMonths}か月後です。日は表示しません。
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
