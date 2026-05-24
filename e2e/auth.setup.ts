import { expect, test as setup } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const AUTH_FILE = path.join(process.cwd(), 'playwright/.auth/e2e-user.json');
const E2E_EMAIL = 'e2e@example.com';
const E2E_PASSWORD = 'password123';

setup('ログインできる状態を作る', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('roastplus_e2e_auth');
    localStorage.removeItem('roastplus_e2e_app_data');
  });
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(E2E_EMAIL);
  await page.getByRole('textbox', { name: 'パスワード' }).fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'ログイン' }).click();

  await expect(page.getByRole('button', { name: 'スケジュール' })).toBeVisible({ timeout: 20_000 });

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE, indexedDB: true });
});
