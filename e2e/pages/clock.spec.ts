import { expect, test, type Page } from '@playwright/test';

const CLOCK_URL = `${process.env.E2E_BASE_URL ?? 'http://localhost:3000'}/clock`;

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

test.describe('時計 作業チャイム', () => {
  test('職場スケジュールに基づいて現在時間帯と次の区切りを表示する', async ({ page }) => {
    await freezeTime(page, '2026-05-17T10:40:00+09:00');

    await page.goto(CLOCK_URL);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('現在')).toBeVisible();
    await expect(page.getByText('10:00-10:45 作業中')).toBeVisible();
    await expect(page.getByText('次')).toBeVisible();
    await expect(page.getByText('10:45 休憩開始')).toBeVisible();
    await expect(page.getByText('あと')).toBeVisible();
    await expect(page.getByText('5分')).toBeVisible();
  });

  test('チャイム時刻設定で職場スケジュールと掃除開始を確認できる', async ({ page }) => {
    await freezeTime(page, '2026-05-17T10:40:00+09:00');

    await page.goto(CLOCK_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'チャイム時刻設定' }).click();

    await expect(page.getByRole('heading', { name: 'チャイム時刻設定' })).toBeVisible();
    await expect(page.locator('input[value="10:00"]')).toBeVisible();
    await expect(page.locator('input[value="10:45"]').first()).toBeVisible();
    await expect(page.locator('input[value="11:50"]').first()).toBeVisible();
    await expect(page.locator('input[value="13:00"]').first()).toBeVisible();
    await expect(page.locator('input[value="16:35"]')).toHaveCount(2);
    await expect(page.locator('input[value="17:00"]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: '掃除' })).toHaveCount(12);
    await expect(page.getByRole('button', { name: '時間帯を追加' })).toBeVisible();
  });

  test('16:35に掃除開始の中央表示を出す', async ({ page }) => {
    await freezeTime(page, '2026-05-17T16:35:00+09:00');

    await page.goto(CLOCK_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: '時計の設定' }).click();
    await page.getByRole('button', { name: '音を有効化' }).click();

    await expect(page.getByText('16:35 掃除開始')).toBeVisible();
    await expect(page.getByText('掃除開始です')).toBeVisible();
  });

  test('previewChimeクエリで中央表示を確認できる', async ({ page }) => {
    await page.goto(`${CLOCK_URL}?previewChime=break`);
    const breakLabel = page.getByText('10:45 休憩開始');
    await expect(breakLabel).toBeVisible();
    await expect(page.getByText('休憩時間です')).toBeVisible();
    await expect(breakLabel).toHaveCSS('color', 'rgb(22, 163, 74)');

    await page.goto(`${CLOCK_URL}?previewChime=work`);
    const workLabel = page.getByText('10:00 作業開始');
    await expect(workLabel).toBeVisible();
    await expect(page.getByText('作業開始です')).toBeVisible();
    await expect(workLabel).toHaveCSS('color', 'rgb(217, 119, 6)');

    await page.goto(`${CLOCK_URL}?previewChime=cleanup`);
    await expect(page.getByText('16:35 掃除開始')).toBeVisible();
    await expect(page.getByText('掃除開始です')).toBeVisible();
  });

  test('previewChimeの中央表示は約5秒で自動的に閉じる', async ({ page }) => {
    await freezeTime(page, '2026-05-17T10:40:00+09:00');
    await page.goto(`${CLOCK_URL}?previewChime=break`);

    await expect(page.getByText('休憩時間です')).toBeVisible();
    await expect(page.getByText('休憩時間です')).toBeHidden({ timeout: 6500 });
    await expect(page.getByText('10:45 休憩開始')).toBeVisible();
  });
});
