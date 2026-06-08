import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  HandpickEntry,
  HandpickEntryInput,
  PackageEntry,
  PackageEntryInput,
  ProductionRecordMonth,
  ProductionRecordMonthInput,
  RoastEntry,
  RoastEntryInput,
} from '@/types';

// hoisted な共有状態。フック戻り値・購読月・Firestore保存スパイ・モーダルへ渡るpropsをテストごとに差し替える
const mocks = vi.hoisted(() => ({
  showToast: vi.fn(),
  saveProductionRecordMonth: vi.fn(async () => {}),
  saveHandpickEntry: vi.fn(async () => 'hp-id'),
  saveRoastEntry: vi.fn(async () => 'r-id'),
  savePackageEntry: vi.fn(async () => 'p-id'),
  subscribeRecentProductionMonths: vi.fn(),
  productionRecordMonthExists: vi.fn(async () => false),
  months: [] as ProductionRecordMonth[],
  hookState: {
    monthDoc: null as ProductionRecordMonth | null,
    handpickEntries: [] as HandpickEntry[],
    roastEntries: [] as RoastEntry[],
    packageEntries: [] as PackageEntry[],
    isLoading: false,
  },
  monthProps: null as { initial: ProductionRecordMonth | null; month: string } | null,
  handpickProps: null as { beanNames: string[]; initial: HandpickEntry | null; defaultWorkDate: string } | null,
  roastProps: null as { powderPerPackGram: number; initial: RoastEntry | null } | null,
  packageProps: null as { initial: PackageEntry | null } | null,
}));

// 認証フックをモック（テストごとに戻り値を差し替える）
const mockUseAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Toast コンテキストをモック（showToast は安定参照にして effect の再実行を避ける）
vi.mock('@/components/Toast', () => ({
  useToastContext: () => ({ showToast: mocks.showToast }),
}));

// 購読フックをモック（hoisted の hookState を返す）
vi.mock('@/hooks/useProductionRecord', () => ({
  useProductionRecord: () => mocks.hookState,
}));

// Firestore 関数をモック
vi.mock('@/lib/firestore/productionRecords', () => ({
  subscribeRecentProductionMonths: mocks.subscribeRecentProductionMonths,
  saveProductionRecordMonth: mocks.saveProductionRecordMonth,
  saveHandpickEntry: mocks.saveHandpickEntry,
  saveRoastEntry: mocks.saveRoastEntry,
  savePackageEntry: mocks.savePackageEntry,
  productionRecordMonthExists: mocks.productionRecordMonthExists,
}));

// ログインページをモック（識別用テキストのみ）
vi.mock('@/app/login/page', () => ({
  default: () => <div>ログイン画面</div>,
}));

// Loading をモック
vi.mock('@/components/Loading', () => ({
  Loading: () => <div>読み込み中</div>,
}));

// モーダルは onSave を発火できる軽量モックにする（配線検証のため）。props は hoisted に控える
vi.mock('@/components/production-record/MonthSettingsModal', () => ({
  MonthSettingsModal: (props: {
    month: string;
    initial: ProductionRecordMonth | null;
    onSave: (input: ProductionRecordMonthInput) => Promise<void>;
    onClose: () => void;
  }) => {
    mocks.monthProps = { initial: props.initial, month: props.month };
    return (
      <div data-testid="month-modal">
        {/* eslint-disable-next-line local/no-raw-button -- テスト用モックの最小ボタン */}
        <button
          type="button"
          onClick={() =>
            props.onSave({
              month: '2026-06',
              greenBeanTotalGram: 30000,
              powderPerPackGram: 8.5,
              blendItems: [{ beanName: 'モカ', ratioPercent: 100 }],
            })
          }
        >
          save-month
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/production-record/HandpickEntryModal', () => ({
  HandpickEntryModal: (props: {
    beanNames: string[];
    initial: HandpickEntry | null;
    defaultWorkDate: string;
    onSave: (input: HandpickEntryInput) => Promise<void>;
    onClose: () => void;
  }) => {
    mocks.handpickProps = {
      beanNames: props.beanNames,
      initial: props.initial,
      defaultWorkDate: props.defaultWorkDate,
    };
    return (
      <div data-testid="handpick-modal">
        {/* eslint-disable-next-line local/no-raw-button -- テスト用モックの最小ボタン */}
        <button
          type="button"
          onClick={() =>
            props.onSave({
              workDate: '2026-05-15',
              beanName: 'モカ',
              segment: 'first',
              greenBeanWeightGram: 8000,
              defectBeanWeightGram: 120,
            })
          }
        >
          save-handpick
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/production-record/RoastEntryModal', () => ({
  RoastEntryModal: (props: {
    powderPerPackGram: number;
    initial: RoastEntry | null;
    defaultWorkDate: string;
    onSave: (input: RoastEntryInput) => Promise<void>;
    onClose: () => void;
  }) => {
    mocks.roastProps = { powderPerPackGram: props.powderPerPackGram, initial: props.initial };
    return (
      <div data-testid="roast-modal">
        {/* eslint-disable-next-line local/no-raw-button -- テスト用モックの最小ボタン */}
        <button
          type="button"
          onClick={() =>
            props.onSave({ workDate: '2026-05-15', beforeRoastWeightGram: 8000, afterRoastWeightGram: 6500 })
          }
        >
          save-roast
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/production-record/PackageEntryModal', () => ({
  PackageEntryModal: (props: {
    initial: PackageEntry | null;
    defaultWorkDate: string;
    onSave: (input: PackageEntryInput) => Promise<void>;
    onClose: () => void;
  }) => {
    mocks.packageProps = { initial: props.initial };
    return (
      <div data-testid="package-modal">
        {/* eslint-disable-next-line local/no-raw-button -- テスト用モックの最小ボタン */}
        <button
          type="button"
          onClick={() =>
            props.onSave({
              workDate: '2026-05-15',
              teamA: { goodCount: 50, defectiveCount: 2 },
              teamB: { goodCount: 40, defectiveCount: 3 },
            })
          }
        >
          save-package
        </button>
      </div>
    );
  },
}));

import ProductionRecordPage from './page';

// 「データあり」シナリオの月設定（2026-05、配合モカ70/ブラジル30、1袋8.5g）
const MONTH_DOC: ProductionRecordMonth = {
  month: '2026-05',
  greenBeanTotalGram: 30000,
  powderPerPackGram: 8.5,
  blendItems: [
    { beanName: 'モカ', ratioPercent: 70 },
    { beanName: 'ブラジル', ratioPercent: 30 },
  ],
};

const HANDPICK_ENTRIES: HandpickEntry[] = [
  {
    id: 'hp1',
    workDate: '2026-05-10',
    beanName: 'モカ',
    segment: 'first',
    greenBeanWeightGram: 10000,
    defectBeanWeightGram: 200,
  },
  {
    id: 'hp2',
    workDate: '2026-05-11',
    beanName: 'ブラジル',
    segment: 'second',
    greenBeanWeightGram: 5000,
    defectBeanWeightGram: 100,
  },
];

const ROAST_ENTRIES: RoastEntry[] = [
  { id: 'r1', workDate: '2026-05-12', beforeRoastWeightGram: 14000, afterRoastWeightGram: 11000 },
];

const PACKAGE_ENTRIES: PackageEntry[] = [
  {
    id: 'p1',
    workDate: '2026-05-13',
    teamA: { goodCount: 100, defectiveCount: 5 },
    teamB: { goodCount: 90, defectiveCount: 10 },
  },
];

// 月docと3種entriesを与え、購読が 2026-05 を選択中にする
function setupWithData() {
  mocks.months = [MONTH_DOC];
  mocks.hookState.monthDoc = MONTH_DOC;
  mocks.hookState.handpickEntries = HANDPICK_ENTRIES;
  mocks.hookState.roastEntries = ROAST_ENTRIES;
  mocks.hookState.packageEntries = PACKAGE_ENTRIES;
}

beforeEach(() => {
  vi.clearAllMocks();
  // 月リストキャッシュ(localStorage)がテスト間で残ると空状態テストを汚染するためクリア
  localStorage.clear();
  mocks.months = [];
  mocks.hookState.monthDoc = null;
  mocks.hookState.handpickEntries = [];
  mocks.hookState.roastEntries = [];
  mocks.hookState.packageEntries = [];
  mocks.hookState.isLoading = false;
  mocks.monthProps = null;
  mocks.handpickProps = null;
  mocks.roastProps = null;
  mocks.packageProps = null;
  // 購読は成功コールバックを同期的に呼び、最新月を選択中に初期化する
  mocks.subscribeRecentProductionMonths.mockImplementation(
    (_uid: string, onData: (months: ProductionRecordMonth[]) => void) => {
      onData(mocks.months);
      return () => {};
    }
  );
  mockUseAuth.mockReturnValue({ user: { uid: 'test-uid' }, loading: false });
});

describe('ProductionRecordPage 認証状態', () => {
  it('認証ロード中はLoadingを表示する', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<ProductionRecordPage />);
    expect(screen.getByText('読み込み中')).toBeInTheDocument();
  });

  it('未ログイン時はLoginPageを表示する', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<ProductionRecordPage />);
    expect(screen.getByText('ログイン画面')).toBeInTheDocument();
  });

  it('ログイン済みなら見出し「生産記録」を表示する', () => {
    render(<ProductionRecordPage />);
    expect(screen.getByRole('heading', { name: '生産記録' })).toBeInTheDocument();
  });
});

describe('ProductionRecordPage 空状態と新規作成', () => {
  it('対象月が無く未選択なら空状態を表示する', () => {
    render(<ProductionRecordPage />);
    expect(screen.getByText('生産記録がまだありません')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '生豆ハンドピック' })).not.toBeInTheDocument();
  });

  it('「対象月を作成」で月設定モーダルを開くが、保存前は3列へ遷移しない', async () => {
    render(<ProductionRecordPage />);
    // 空状態ではヘッダーとEmptyStateの両方に「対象月を作成」がある。先頭(ヘッダー)を押す
    fireEvent.click(screen.getAllByRole('button', { name: '対象月を作成' })[0]);

    expect(await screen.findByTestId('month-modal')).toBeInTheDocument();
    // selectedMonth は変わらないので空状態のまま・3列見出しは出ない
    expect(screen.getByText('生産記録がまだありません')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '生豆ハンドピック' })).not.toBeInTheDocument();
    expect(mocks.saveProductionRecordMonth).not.toHaveBeenCalled();
  });
});

describe('ProductionRecordPage 月設定の保存', () => {
  it('月設定保存で saveProductionRecordMonth を呼び、3列表示へ切り替わる', async () => {
    render(<ProductionRecordPage />);
    fireEvent.click(screen.getAllByRole('button', { name: '対象月を作成' })[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'save-month' }));

    await waitFor(() => {
      expect(mocks.saveProductionRecordMonth).toHaveBeenCalledWith('test-uid', {
        month: '2026-06',
        greenBeanTotalGram: 30000,
        powderPerPackGram: 8.5,
        blendItems: [{ beanName: 'モカ', ratioPercent: 100 }],
      });
    });
    // selectedMonth が設定され、空状態ではなく3列表示になる
    expect(await screen.findByRole('heading', { name: '生豆ハンドピック' })).toBeInTheDocument();
    expect(mocks.showToast).toHaveBeenCalledWith('保存しました', 'success');
  });
});

describe('ProductionRecordPage データ表示と集計', () => {
  beforeEach(() => {
    setupWithData();
  });

  it('各列の集計（kg・件数・プレミックス袋数・パッケージ合計）を表示する', () => {
    render(<ProductionRecordPage />);

    // 各列カード（heading → 行div → Card）に絞って集計値を検証する（月合計サマリーと値が重複するため）
    const handpickCard = screen.getByRole('heading', { name: '生豆ハンドピック' }).parentElement!
      .parentElement as HTMLElement;
    // ハンドピック済み 15000g = 15.00kg、欠点率 300/15000 = 2.0%
    expect(within(handpickCard).getByText('15.00')).toBeInTheDocument();
    expect(within(handpickCard).getByText('2.0%')).toBeInTheDocument();

    // 焙煎: 使用可能生豆 14700g → プレミックス 29袋、歩留まり 11000/14000 = 78.6%
    const roastCard = screen.getByRole('heading', { name: '焙煎' }).parentElement!.parentElement as HTMLElement;
    expect(within(roastCard).getByText('29')).toBeInTheDocument();
    expect(within(roastCard).getByText('78.6%')).toBeInTheDocument();

    // パッケージ: 良190 / 不良15 / 生産205
    const packageCard = screen.getByRole('heading', { name: 'パッケージ' }).parentElement!.parentElement as HTMLElement;
    expect(within(packageCard).getByText('190')).toBeInTheDocument();
    expect(within(packageCard).getByText('15')).toBeInTheDocument();
    expect(within(packageCard).getByText('205')).toBeInTheDocument();
  });

  it('月合計サマリーとCSVプレビューを表示する', () => {
    render(<ProductionRecordPage />);
    // 月合計は普段隠れており、下部バーのタップでモーダルとして開く
    fireEvent.click(screen.getByRole('button', { name: /月合計・CSV出力/ }));

    expect(screen.getByRole('heading', { name: '月合計サマリー' })).toBeInTheDocument();
    // 配合ラベル
    expect(screen.getByText('モカ 70% / ブラジル 30%')).toBeInTheDocument();
    // CSVプレビューにヘッダーと対象月が含まれる
    const pre = document.querySelector('pre');
    expect(pre?.textContent).toContain('対象月');
    expect(pre?.textContent).toContain('2026年5月分');
    expect(pre?.textContent).toContain('モカ 70% / ブラジル 30%');
  });

  it('「設定を編集」で月設定モーダルを既存値入り（initial=monthDoc）で開く', () => {
    render(<ProductionRecordPage />);
    // 設定編集は「月の設定」メニュー内に集約された
    fireEvent.click(screen.getByRole('button', { name: '月の設定' }));
    fireEvent.click(screen.getByRole('button', { name: /設定を編集/ }));

    expect(screen.getByTestId('month-modal')).toBeInTheDocument();
    // 編集モードでは選択中の月とその設定が初期値として渡る
    expect(mocks.monthProps?.month).toBe('2026-05');
    expect(mocks.monthProps?.initial).toEqual(MONTH_DOC);
  });

  it('新規作成時は月設定モーダルが空（initial=null）で開く', async () => {
    render(<ProductionRecordPage />);
    // 新規作成は「月の設定」メニュー内の「新しい月を作る」に移動した
    fireEvent.click(screen.getByRole('button', { name: '月の設定' }));
    const createSection = screen.getByText('新しい月を作る').parentElement as HTMLElement;
    // 既存月(2026-05)と重複しない月を指定する（重複月は作成がブロックされるため、当月の日付に依存させない）
    fireEvent.change(within(createSection).getByLabelText('対象月'), { target: { value: '2026-07' } });
    fireEvent.click(within(createSection).getByRole('button', { name: '作成' }));

    expect(await screen.findByTestId('month-modal')).toBeInTheDocument();
    expect(mocks.monthProps?.initial).toBeNull();
  });
});

describe('ProductionRecordPage エントリ保存の配線', () => {
  beforeEach(() => {
    setupWithData();
  });

  it('新規ハンドピックは previousId 無しで saveHandpickEntry を呼ぶ', async () => {
    render(<ProductionRecordPage />);
    fireEvent.click(screen.getByRole('button', { name: '欠点豆を入力' }));
    fireEvent.click(screen.getByRole('button', { name: 'save-handpick' }));

    await waitFor(() => {
      expect(mocks.saveHandpickEntry).toHaveBeenCalledWith(
        'test-uid',
        '2026-05',
        expect.objectContaining({ beanName: 'モカ', segment: 'first' }),
        undefined
      );
    });
  });

  it('既存ハンドピックの編集は previousId 付きで saveHandpickEntry を呼ぶ', async () => {
    render(<ProductionRecordPage />);
    // モカの記録カード（ボタン）をクリック → editingHandpick がセットされる
    fireEvent.click(screen.getByRole('button', { name: /モカ/ }));
    fireEvent.click(screen.getByRole('button', { name: 'save-handpick' }));

    await waitFor(() => {
      expect(mocks.saveHandpickEntry).toHaveBeenCalledWith(
        'test-uid',
        '2026-05',
        expect.objectContaining({ beanName: 'モカ' }),
        'hp1'
      );
    });
  });

  it('焙煎入力は saveRoastEntry を呼ぶ', async () => {
    render(<ProductionRecordPage />);
    fireEvent.click(screen.getByRole('button', { name: '焙煎を入力' }));
    fireEvent.click(screen.getByRole('button', { name: 'save-roast' }));

    await waitFor(() => {
      expect(mocks.saveRoastEntry).toHaveBeenCalledWith(
        'test-uid',
        '2026-05',
        expect.objectContaining({ beforeRoastWeightGram: 8000, afterRoastWeightGram: 6500 }),
        undefined
      );
    });
  });

  it('パッケージ入力は savePackageEntry を呼ぶ', async () => {
    render(<ProductionRecordPage />);
    fireEvent.click(screen.getByRole('button', { name: 'パッケージを入力' }));
    fireEvent.click(screen.getByRole('button', { name: 'save-package' }));

    await waitFor(() => {
      expect(mocks.savePackageEntry).toHaveBeenCalledWith(
        'test-uid',
        '2026-05',
        expect.objectContaining({ teamA: { goodCount: 50, defectiveCount: 2 } }),
        undefined
      );
    });
  });

  it('ハンドピック/焙煎モーダルへ月設定の派生値を渡す', () => {
    render(<ProductionRecordPage />);
    fireEvent.click(screen.getByRole('button', { name: '欠点豆を入力' }));
    expect(mocks.handpickProps?.beanNames).toEqual(['モカ', 'ブラジル']);
    expect(mocks.handpickProps?.defaultWorkDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // ハンドピックを閉じてから焙煎を開く（条件レンダリングのため別操作）
    fireEvent.click(screen.getByRole('button', { name: '焙煎を入力' }));
    expect(mocks.roastProps?.powderPerPackGram).toBe(8.5);
  });
});

describe('ProductionRecordPage CSV出力', () => {
  beforeEach(() => {
    setupWithData();
  });

  it('CSV出力ボタンで Blob を生成しダウンロードリンクを起動する', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    // jsdom には createObjectURL が無いので差し込む
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;

    render(<ProductionRecordPage />);
    // CSV出力ボタンは月合計モーダル内にあるため、先に下部バーから開く
    fireEvent.click(screen.getByRole('button', { name: /月合計・CSV出力/ }));

    // 生成された <a> を捕捉する（最後の1つが CSV ダウンロード用）
    const realCreateElement = document.createElement.bind(document);
    const createdAnchors: HTMLAnchorElement[] = [];
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = realCreateElement(tag);
      if (tag === 'a') {
        createdAnchors.push(element as HTMLAnchorElement);
      }
      return element;
    });

    fireEvent.click(screen.getByRole('button', { name: 'CSV出力' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(createdAnchors.at(-1)?.download).toBe('production-record-2026-05.csv');
    expect(mocks.showToast).toHaveBeenCalledWith('CSVを出力しました', 'success');

    clickSpy.mockRestore();
    createElementSpy.mockRestore();
  });
});

describe('ProductionRecordPage 月切替ローディング中のガード', () => {
  beforeEach(() => {
    setupWithData();
  });

  // 入力可否は「設定済みの月があるか」(monthDoc) で判定する。
  // 月切替時は useProductionRecord が monthDoc を新しい月のキャッシュ(無ければnull)へ
  // 描画中に差し替えるため、前月設定での誤入力は monthDoc 判定だけで防げる。
  it('対象月の設定が無い（monthDoc=null）ときは入力3ボタンを無効化する', () => {
    mocks.hookState.monthDoc = null;
    render(<ProductionRecordPage />);

    expect(screen.getByRole('button', { name: '欠点豆を入力' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '焙煎を入力' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'パッケージを入力' })).toBeDisabled();
  });

  it('対象月の設定があれば、読み込み中でも入力3ボタンを有効化する（キャッシュ即表示でちらつかせない）', () => {
    mocks.hookState.isLoading = true;
    render(<ProductionRecordPage />);

    expect(screen.getByRole('button', { name: '欠点豆を入力' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '焙煎を入力' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'パッケージを入力' })).toBeEnabled();
  });

  it('読み込み中は「設定を編集」ボタンを表示しない（前月設定での誤編集を防ぐ）', () => {
    mocks.hookState.isLoading = true;
    render(<ProductionRecordPage />);

    expect(screen.queryByRole('button', { name: '設定を編集' })).not.toBeInTheDocument();
  });
});

describe('ProductionRecordPage 重複月の作成防止', () => {
  beforeEach(() => {
    // 既存月 2026-05 が存在する状態
    setupWithData();
  });

  it('既存月を指定して「対象月を作成」を押すと、作成せず既存である旨を通知する', () => {
    render(<ProductionRecordPage />);
    // 新規作成は「月の設定」メニュー内へ。既存月(2026-05)を指定する
    fireEvent.click(screen.getByRole('button', { name: '月の設定' }));
    const createSection = screen.getByText('新しい月を作る').parentElement as HTMLElement;
    fireEvent.change(within(createSection).getByLabelText('対象月'), { target: { value: '2026-05' } });
    fireEvent.click(within(createSection).getByRole('button', { name: '作成' }));

    // 月設定モーダルは開かず（無警告の上書きを防ぐ）、既存月である旨を通知する
    expect(screen.queryByTestId('month-modal')).not.toBeInTheDocument();
    expect(mocks.showToast).toHaveBeenCalledWith(expect.stringContaining('既に存在'), 'error');
  });

  it('recentMonths(最新24件)に無くてもFirestoreに存在する月の作成はブロックする', async () => {
    // months には 2026-05 のみ。2026-01 はセレクタ外だが Firestore には存在する想定
    mocks.productionRecordMonthExists.mockResolvedValue(true);
    render(<ProductionRecordPage />);
    // 新規作成は「月の設定」メニュー内へ。recentMonths窓外の2026-01を指定する
    fireEvent.click(screen.getByRole('button', { name: '月の設定' }));
    const createSection = screen.getByText('新しい月を作る').parentElement as HTMLElement;
    fireEvent.change(within(createSection).getByLabelText('対象月'), { target: { value: '2026-01' } });
    fireEvent.click(within(createSection).getByRole('button', { name: '作成' }));

    await waitFor(() => {
      expect(mocks.showToast).toHaveBeenCalledWith(expect.stringContaining('既に存在'), 'error');
    });
    expect(screen.queryByTestId('month-modal')).not.toBeInTheDocument();
  });
});
