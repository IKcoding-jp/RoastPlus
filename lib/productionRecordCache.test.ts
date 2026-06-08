import { describe, it, expect, beforeEach } from 'vitest';
import {
  readProductionRecordCache,
  writeProductionRecordCache,
  readMonthListCache,
  writeMonthListCache,
} from './productionRecordCache';
import type { ProductionRecordCacheData } from './productionRecordCache';
import type { ProductionRecordMonth } from '@/types';

const USER_ID = 'user-1';
const MONTH = '2026-08';

const SAMPLE: ProductionRecordCacheData = {
  monthDoc: {
    month: '2026-08',
    greenBeanTotalGram: 30000,
    powderPerPackGram: 8.5,
    blendItems: [{ beanName: 'ブラジル', ratioPercent: 100 }],
  },
  handpickEntries: [
    {
      id: 'h1',
      workDate: '2026-08-01',
      beanName: 'ブラジル',
      segment: 'first',
      greenBeanWeightGram: 10000,
      defectBeanWeightGram: 300,
    },
  ],
  roastEntries: [{ id: 'r1', workDate: '2026-08-01', beforeRoastWeightGram: 10000, afterRoastWeightGram: 8500 }],
  packageEntries: [
    {
      id: 'p1',
      workDate: '2026-08-01',
      teamA: { goodCount: 100, defectiveCount: 2 },
      teamB: { goodCount: 120, defectiveCount: 3 },
    },
  ],
};

describe('productionRecordCache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('書き込んだ値をそのまま読み戻せる', () => {
    writeProductionRecordCache(USER_ID, MONTH, SAMPLE);
    expect(readProductionRecordCache(USER_ID, MONTH)).toEqual(SAMPLE);
  });

  it('未保存なら null を返す', () => {
    expect(readProductionRecordCache(USER_ID, MONTH)).toBeNull();
  });

  it('userId が違えば読み出せない（アカウント分離）', () => {
    writeProductionRecordCache(USER_ID, MONTH, SAMPLE);
    expect(readProductionRecordCache('other-user', MONTH)).toBeNull();
  });

  it('month が違えば読み出せない', () => {
    writeProductionRecordCache(USER_ID, MONTH, SAMPLE);
    expect(readProductionRecordCache(USER_ID, '2026-09')).toBeNull();
  });

  it('userId / month が未指定なら読み書きしない', () => {
    writeProductionRecordCache(undefined, MONTH, SAMPLE);
    writeProductionRecordCache(USER_ID, undefined, SAMPLE);
    expect(readProductionRecordCache(undefined, MONTH)).toBeNull();
    expect(readProductionRecordCache(USER_ID, undefined)).toBeNull();
  });

  it('壊れたJSONが入っていても null を返す（描画を落とさない）', () => {
    localStorage.setItem(`roastplus_prodrec_cache:v1:${USER_ID}:${MONTH}`, '{壊れた');
    expect(readProductionRecordCache(USER_ID, MONTH)).toBeNull();
  });
});

describe('productionRecordCache 月リスト', () => {
  const MONTHS: ProductionRecordMonth[] = [
    { month: '2026-08', greenBeanTotalGram: 30000, powderPerPackGram: 8.5, blendItems: [] },
    { month: '2026-07', greenBeanTotalGram: 28000, powderPerPackGram: 8.5, blendItems: [] },
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  it('書き込んだ月リストをそのまま読み戻せる', () => {
    writeMonthListCache(USER_ID, MONTHS);
    expect(readMonthListCache(USER_ID)).toEqual(MONTHS);
  });

  it('未保存なら null を返す', () => {
    expect(readMonthListCache(USER_ID)).toBeNull();
  });

  it('userId が違えば読み出せない（アカウント分離）', () => {
    writeMonthListCache(USER_ID, MONTHS);
    expect(readMonthListCache('other-user')).toBeNull();
  });

  it('userId が未指定なら読み書きしない', () => {
    writeMonthListCache(undefined, MONTHS);
    expect(readMonthListCache(undefined)).toBeNull();
  });

  it('壊れたJSONが入っていても null を返す', () => {
    localStorage.setItem(`roastplus_prodrec_months:v1:${USER_ID}`, '[壊れた');
    expect(readMonthListCache(USER_ID)).toBeNull();
  });
});
