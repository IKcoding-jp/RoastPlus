import { expect, test } from '@playwright/test';

test.describe('パッケージ数記録 E2E', () => {
  test('ホームにパッケージ数記録への導線が表示される', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('button', { name: 'パッケージ数記録' })).toBeVisible({ timeout: 20_000 });
  });
});
