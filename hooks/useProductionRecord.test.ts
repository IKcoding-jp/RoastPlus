import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProductionRecord } from './useProductionRecord';
import { readProductionRecordCache, writeProductionRecordCache } from '@/lib/productionRecordCache';
import type { ProductionRecordMonth, HandpickEntry, RoastEntry, PackageEntry } from '@/types';

// Firestore層の購読関数をモックする（firebase/firestoreは直接モックしない）
const mockSubscribeProductionRecordMonth = vi.fn();
const mockSubscribeHandpickEntries = vi.fn();
const mockSubscribeRoastEntries = vi.fn();
const mockSubscribePackageEntries = vi.fn();

vi.mock('@/lib/firestore', () => ({
  subscribeProductionRecordMonth: (...args: unknown[]) => mockSubscribeProductionRecordMonth(...args),
  subscribeHandpickEntries: (...args: unknown[]) => mockSubscribeHandpickEntries(...args),
  subscribeRoastEntries: (...args: unknown[]) => mockSubscribeRoastEntries(...args),
  subscribePackageEntries: (...args: unknown[]) => mockSubscribePackageEntries(...args),
}));

// テストフィクスチャ
const MONTH = '2026-08';
const USER_ID = 'test-user-id';

const MONTH_DOC: ProductionRecordMonth = {
  month: '2026-08',
  greenBeanTotalGram: 30000,
  powderPerPackGram: 8.5,
  blendItems: [
    { beanName: 'ブラジル', ratioPercent: 80 },
    { beanName: 'グアテマラ', ratioPercent: 20 },
  ],
};

const HANDPICK_ENTRY: HandpickEntry = {
  id: 'handpick_1',
  workDate: '2026-08-01',
  beanName: 'ブラジル',
  segment: 'first',
  greenBeanWeightGram: 10000,
  defectBeanWeightGram: 300,
};

const ROAST_ENTRY: RoastEntry = {
  id: 'roast_1',
  workDate: '2026-08-01',
  beforeRoastWeightGram: 10000,
  afterRoastWeightGram: 8500,
};

const PACKAGE_ENTRY: PackageEntry = {
  id: 'package_1',
  workDate: '2026-08-01',
  teamA: { goodCount: 100, defectiveCount: 2 },
  teamB: { goodCount: 120, defectiveCount: 3 },
};

// ヘルパー: 各購読が「即時にcallbackを呼びunsubscribeを返す」ようにモックする
function setupSubscriptions(options: {
  monthDoc?: ProductionRecordMonth | null;
  handpickEntries?: HandpickEntry[];
  roastEntries?: RoastEntry[];
  packageEntries?: PackageEntry[];
}) {
  const unsubMonth = vi.fn();
  const unsubHandpick = vi.fn();
  const unsubRoast = vi.fn();
  const unsubPackage = vi.fn();

  mockSubscribeProductionRecordMonth.mockImplementation(
    (_userId: string, _month: string, cb: (m: ProductionRecordMonth | null) => void) => {
      cb(options.monthDoc ?? null);
      return unsubMonth;
    }
  );
  mockSubscribeHandpickEntries.mockImplementation(
    (_userId: string, _month: string, cb: (e: HandpickEntry[]) => void) => {
      cb(options.handpickEntries ?? []);
      return unsubHandpick;
    }
  );
  mockSubscribeRoastEntries.mockImplementation((_userId: string, _month: string, cb: (e: RoastEntry[]) => void) => {
    cb(options.roastEntries ?? []);
    return unsubRoast;
  });
  mockSubscribePackageEntries.mockImplementation((_userId: string, _month: string, cb: (e: PackageEntry[]) => void) => {
    cb(options.packageEntries ?? []);
    return unsubPackage;
  });

  return { unsubMonth, unsubHandpick, unsubRoast, unsubPackage };
}

describe('useProductionRecord', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('userId が undefined のときは購読せず空の初期値を返す', async () => {
    setupSubscriptions({});

    const { result } = renderHook(() => useProductionRecord(undefined, MONTH));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockSubscribeProductionRecordMonth).not.toHaveBeenCalled();
    expect(mockSubscribeHandpickEntries).not.toHaveBeenCalled();
    expect(mockSubscribeRoastEntries).not.toHaveBeenCalled();
    expect(mockSubscribePackageEntries).not.toHaveBeenCalled();
    expect(result.current.monthDoc).toBeNull();
    expect(result.current.handpickEntries).toEqual([]);
    expect(result.current.roastEntries).toEqual([]);
    expect(result.current.packageEntries).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('month が undefined のときは購読しない', async () => {
    setupSubscriptions({});

    const { result } = renderHook(() => useProductionRecord(USER_ID, undefined));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockSubscribeProductionRecordMonth).not.toHaveBeenCalled();
    expect(mockSubscribeHandpickEntries).not.toHaveBeenCalled();
    expect(mockSubscribeRoastEntries).not.toHaveBeenCalled();
    expect(mockSubscribePackageEntries).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('userId と month が揃うと4購読を張り、正しい引数で呼び出す', async () => {
    setupSubscriptions({
      monthDoc: MONTH_DOC,
      handpickEntries: [HANDPICK_ENTRY],
      roastEntries: [ROAST_ENTRY],
      packageEntries: [PACKAGE_ENTRY],
    });

    renderHook(() => useProductionRecord(USER_ID, MONTH));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockSubscribeProductionRecordMonth).toHaveBeenCalledTimes(1);
    expect(mockSubscribeProductionRecordMonth).toHaveBeenCalledWith(
      USER_ID,
      MONTH,
      expect.any(Function),
      expect.any(Function)
    );
    expect(mockSubscribeHandpickEntries).toHaveBeenCalledWith(
      USER_ID,
      MONTH,
      expect.any(Function),
      expect.any(Function)
    );
    expect(mockSubscribeRoastEntries).toHaveBeenCalledWith(USER_ID, MONTH, expect.any(Function), expect.any(Function));
    expect(mockSubscribePackageEntries).toHaveBeenCalledWith(
      USER_ID,
      MONTH,
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('購読の callback で受け取ったデータを返す', async () => {
    setupSubscriptions({
      monthDoc: MONTH_DOC,
      handpickEntries: [HANDPICK_ENTRY],
      roastEntries: [ROAST_ENTRY],
      packageEntries: [PACKAGE_ENTRY],
    });

    const { result } = renderHook(() => useProductionRecord(USER_ID, MONTH));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.monthDoc).toEqual(MONTH_DOC);
    expect(result.current.handpickEntries).toEqual([HANDPICK_ENTRY]);
    expect(result.current.roastEntries).toEqual([ROAST_ENTRY]);
    expect(result.current.packageEntries).toEqual([PACKAGE_ENTRY]);
  });

  it('4購読すべての初回callbackが返ると isLoading = false になる', async () => {
    setupSubscriptions({
      monthDoc: MONTH_DOC,
      handpickEntries: [HANDPICK_ENTRY],
      roastEntries: [ROAST_ENTRY],
      packageEntries: [PACKAGE_ENTRY],
    });

    const { result } = renderHook(() => useProductionRecord(USER_ID, MONTH));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('月docが存在しない(null)場合でも購読は成立し isLoading = false になる', async () => {
    setupSubscriptions({ monthDoc: null });

    const { result } = renderHook(() => useProductionRecord(USER_ID, MONTH));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.monthDoc).toBeNull();
    expect(result.current.handpickEntries).toEqual([]);
    expect(result.current.roastEntries).toEqual([]);
    expect(result.current.packageEntries).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('アンマウント時にすべての unsubscribe を呼ぶ', async () => {
    const { unsubMonth, unsubHandpick, unsubRoast, unsubPackage } = setupSubscriptions({
      monthDoc: MONTH_DOC,
    });

    const { unmount } = renderHook(() => useProductionRecord(USER_ID, MONTH));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    unmount();

    expect(unsubMonth).toHaveBeenCalledTimes(1);
    expect(unsubHandpick).toHaveBeenCalledTimes(1);
    expect(unsubRoast).toHaveBeenCalledTimes(1);
    expect(unsubPackage).toHaveBeenCalledTimes(1);
  });

  it('month が変わると旧購読を解除して新しい month で再購読する', async () => {
    const first = setupSubscriptions({ monthDoc: MONTH_DOC });

    const { rerender } = renderHook(({ month }) => useProductionRecord(USER_ID, month), {
      initialProps: { month: MONTH },
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockSubscribeProductionRecordMonth).toHaveBeenCalledTimes(1);

    // monthを変更
    const second = setupSubscriptions({ monthDoc: { ...MONTH_DOC, month: '2026-09' } });
    rerender({ month: '2026-09' });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // 旧購読が解除される
    expect(first.unsubMonth).toHaveBeenCalledTimes(1);
    expect(first.unsubHandpick).toHaveBeenCalledTimes(1);
    expect(first.unsubRoast).toHaveBeenCalledTimes(1);
    expect(first.unsubPackage).toHaveBeenCalledTimes(1);

    // 新しいmonthで再購読
    expect(mockSubscribeProductionRecordMonth).toHaveBeenLastCalledWith(
      USER_ID,
      '2026-09',
      expect.any(Function),
      expect.any(Function)
    );
    expect(second.unsubMonth).not.toHaveBeenCalled();
  });

  it('購読データを受け取るとキャッシュへ保存する', async () => {
    setupSubscriptions({
      monthDoc: MONTH_DOC,
      handpickEntries: [HANDPICK_ENTRY],
      roastEntries: [ROAST_ENTRY],
      packageEntries: [PACKAGE_ENTRY],
    });

    renderHook(() => useProductionRecord(USER_ID, MONTH));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(readProductionRecordCache(USER_ID, MONTH)).toEqual({
      monthDoc: MONTH_DOC,
      handpickEntries: [HANDPICK_ENTRY],
      roastEntries: [ROAST_ENTRY],
      packageEntries: [PACKAGE_ENTRY],
    });
  });

  it('Firestore応答前でもキャッシュ値を即返す（0/空のちらつき防止）', async () => {
    // 事前にキャッシュを仕込む
    writeProductionRecordCache(USER_ID, MONTH, {
      monthDoc: MONTH_DOC,
      handpickEntries: [HANDPICK_ENTRY],
      roastEntries: [ROAST_ENTRY],
      packageEntries: [PACKAGE_ENTRY],
    });

    // 購読は張るが callback はまだ返さない（=Firestore応答前の状態を再現）
    mockSubscribeProductionRecordMonth.mockImplementation(() => vi.fn());
    mockSubscribeHandpickEntries.mockImplementation(() => vi.fn());
    mockSubscribeRoastEntries.mockImplementation(() => vi.fn());
    mockSubscribePackageEntries.mockImplementation(() => vi.fn());

    const { result } = renderHook(() => useProductionRecord(USER_ID, MONTH));

    // タイマーを進めず（=応答前）に、キャッシュ由来の値が出ていること
    expect(result.current.monthDoc).toEqual(MONTH_DOC);
    expect(result.current.handpickEntries).toEqual([HANDPICK_ENTRY]);
    expect(result.current.roastEntries).toEqual([ROAST_ENTRY]);
    expect(result.current.packageEntries).toEqual([PACKAGE_ENTRY]);
  });
});
