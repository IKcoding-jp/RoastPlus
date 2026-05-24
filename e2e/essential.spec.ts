import { expect, test, type Page } from '@playwright/test';

const CLOCK_URL = '/clock';

async function freezeTime(page: Page, iso: string) {
  await page.addInitScript((fixedIso) => {
    const RealDate = Date;
    const fixedTime = new RealDate(fixedIso).getTime();

    type DateConstructorArgs =
      | []
      | [value: string | number | Date]
      | [
          year: number,
          monthIndex: number,
          date?: number,
          hours?: number,
          minutes?: number,
          seconds?: number,
          ms?: number,
        ];

    class MockDate extends RealDate {
      constructor(...args: DateConstructorArgs) {
        if (args.length === 0) {
          super(fixedTime);
          return;
        }

        if (args.length === 1) {
          super(args[0]);
          return;
        }

        super(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
      }

      static now() {
        return fixedTime;
      }
    }

    MockDate.UTC = RealDate.UTC;
    MockDate.parse = RealDate.parse;
    window.Date = MockDate as DateConstructor;
    localStorage.removeItem('roastplus_work_chime_settings');
  }, iso);
}

test.describe('RoastPlus essential E2E', () => {
  test('未ログインで保護ページを開くとログイン画面が表示される', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('roastplus_e2e_auth');
    });
    await page.goto('/schedule');

    await expect(page.getByLabel('メールアドレス')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
  });

  test('ホームから主要機能へ遷移できる', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'スケジュール' })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'スケジュール' }).click();
    await expect(page).toHaveURL(/\/schedule\/?$/);
    await expect(page.getByRole('button', { name: '日付を選択' }).first()).toBeVisible({ timeout: 15_000 });

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'ローストタイマー' })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'ローストタイマー' }).click();
    await expect(page).toHaveURL(/\/roast-timer\/?$/);
    await expect(page.getByRole('button', { name: 'スタート' })).toBeVisible({ timeout: 15_000 });
  });

  test('時計で現在の時間帯と次の区切りが分かる', async ({ page }) => {
    await freezeTime(page, '2026-05-17T10:40:00+09:00');

    await page.goto(CLOCK_URL);

    await expect(page.getByText('現在')).toBeVisible();
    await expect(page.getByText('10:00-10:45 作業中')).toBeVisible();
    await expect(page.getByText('次')).toBeVisible();
    await expect(page.getByText('10:45 休憩開始')).toBeVisible();
    await expect(page.getByText('5分')).toBeVisible();
  });

  test('時計のチャイム表示が出て自動で閉じる', async ({ page }) => {
    await page.goto(`${CLOCK_URL}?previewChime=cleanup`);

    await expect(page.getByText('16:35 掃除開始')).toBeVisible();
    await expect(page.getByText('掃除開始です')).toBeVisible();
    await expect(page.getByText('掃除開始です')).toBeHidden({ timeout: 6_500 });
  });

  test('ローストタイマーを開始し、一時停止、再開、終了できる', async ({ page }) => {
    await page.goto('/roast-timer');

    await page.getByRole('button', { name: '200g 8分' }).click();
    await page.getByRole('button', { name: 'スタート' }).click();

    await expect(page.getByRole('button', { name: '一時停止' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: '一時停止' }).click();

    await expect(page.getByRole('button', { name: '再開' })).toBeVisible();
    await page.getByRole('button', { name: '再開' }).click();

    await expect(page.getByRole('button', { name: '一時停止' })).toBeVisible();
    await page.getByRole('button', { name: 'スキップ' }).click();

    await expect(page.getByRole('button', { name: 'リセット' })).toBeVisible({ timeout: 10_000 });
  });

  test('スケジュールの日付移動とモバイルタブ切り替えが動く', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/schedule');

    const dateButton = page.getByRole('button', { name: '日付を選択' }).first();
    await expect(dateButton).toBeVisible({ timeout: 15_000 });
    const initialDate = await dateButton.textContent();

    await page.getByRole('button', { name: '前日' }).first().click();
    await expect(dateButton).not.toHaveText(initialDate ?? '');

    await page.getByRole('tab', { name: 'ローストスケジュール' }).click();
    await expect(page.getByText('ローストスケジュール').first()).toBeVisible();

    await page.getByRole('tab', { name: '本日のスケジュール' }).click();
    await expect(page.getByText('本日のスケジュール').first()).toBeVisible();
  });

  test('テイスティングセッションを作成できる', async ({ page }) => {
    const beanName = `E2Eテスト豆 ${Date.now()}`;

    await page.goto('/tasting/sessions/new');
    await page.getByPlaceholder('例: コロンビア・エチオピアなど').fill(beanName);
    await page.getByRole('button', { name: '試飲感想を追加' }).click();

    await expect(page).toHaveURL(/\/tasting\/?$/);
    await expect(page.getByRole('heading', { name: beanName }).first()).toBeVisible({ timeout: 15_000 });
  });
});
