import { expect, test } from '@playwright/test';

test.describe('パッケージ記録 E2E', () => {
  test('ホームにパッケージ記録への導線が表示される', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('button', { name: 'パッケージ記録' })).toBeVisible({ timeout: 20_000 });
  });
});
