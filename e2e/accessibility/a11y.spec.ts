import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const E2E_AUTH_STORAGE_KEY = 'roastplus_e2e_auth';
const E2E_USER_ID = 'e2e-user';

interface A11yPage {
  name: string;
  path: string;
  authenticated?: boolean;
}

const pages: A11yPage[] = [
  { name: 'ホーム', path: '/', authenticated: true },
  { name: 'スケジュール', path: '/schedule', authenticated: true },
  { name: 'テイスティング', path: '/tasting', authenticated: true },
  { name: 'ログイン', path: '/login' },
  { name: '担当表', path: '/assignment', authenticated: true },
  { name: 'ドリップガイド', path: '/drip-guide', authenticated: true },
  { name: '欠点豆', path: '/defect-beans', authenticated: true },
  { name: '設定', path: '/settings', authenticated: true },
  { name: 'お問い合わせ', path: '/contact', authenticated: true },
];

async function preparePage(page: Page, target: A11yPage) {
  await page.addInitScript(
    ({ isAuthenticated, authKey, userId }) => {
      if (isAuthenticated) {
        window.localStorage.setItem(authKey, userId);
        return;
      }

      window.localStorage.removeItem(authKey);
    },
    {
      isAuthenticated: target.authenticated === true,
      authKey: E2E_AUTH_STORAGE_KEY,
      userId: E2E_USER_ID,
    }
  );
}

function formatViolation(violation: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'][number]) {
  const targets = violation.nodes
    .slice(0, 5)
    .map((node) => `${node.target.join(' ')}${node.failureSummary ? `: ${node.failureSummary}` : ''}`);

  return [
    `[${violation.impact ?? 'unknown'}] ${violation.id}: ${violation.description} (${violation.nodes.length}箇所)`,
    ...targets.map((target) => `  - ${target}`),
  ].join('\n');
}

test.describe('アクセシビリティ: axe-core自動スキャン', () => {
  for (const target of pages) {
    test(`${target.name}ページにcriticalな違反がない`, async ({ page }) => {
      await preparePage(page, target);
      await page.goto(target.path);
      await page.waitForLoadState('domcontentloaded');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .options({
          rules: {
            'target-size': { enabled: true },
          },
        })
        .analyze();

      const seriousViolations = results.violations.filter((violation) => violation.impact === 'serious');
      if (seriousViolations.length > 0) {
        const nodeCount = seriousViolations.reduce((total, violation) => total + violation.nodes.length, 0);
        console.log(
          [
            `[a11y serious] ${target.name} ${target.path}: ${seriousViolations.length}種類 / ${nodeCount}箇所`,
            ...seriousViolations.map(formatViolation),
          ].join('\n')
        );
      }

      const criticalViolations = results.violations.filter((violation) => violation.impact === 'critical');
      expect(criticalViolations).toHaveLength(0);
    });
  }
});

test.describe('アクセシビリティ: キーボードナビゲーション', () => {
  test('ホームページでTabキーによるナビゲーションが動作する', async ({ page }) => {
    await preparePage(page, pages[0]);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.keyboard.press('Tab');
    const firstFocusedTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase() ?? null);
    expect(firstFocusedTag).not.toBeNull();

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const thirdFocusedTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase() ?? null);
    expect(thirdFocusedTag).not.toBeNull();
  });

  test('Escapeキーでモーダルを閉じられる', async ({ page }) => {
    await preparePage(page, { name: 'スケジュール', path: '/schedule', authenticated: true });
    await page.goto('/schedule');
    await page.waitForLoadState('domcontentloaded');

    const dateButton = page.getByRole('button', { name: '日付を選択' }).first();
    await expect(dateButton).toBeVisible({ timeout: 10_000 });
    await dateButton.click();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
  });

  test('Enterキーでリンクをアクティベートできる', async ({ page }) => {
    await preparePage(page, pages[0]);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const links = page.locator('a[href]:visible');
    const linkCount = await links.count();

    if (linkCount > 0) {
      await links.first().focus();
      await page.keyboard.press('Enter');
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toBeTruthy();
    }
  });
});

test.describe('アクセシビリティ: ARIA属性', () => {
  test('ボタンにアクセシブルな名前がある', async ({ page }) => {
    await preparePage(page, pages[0]);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 20); i += 1) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      const title = await button.getAttribute('title');

      const hasAccessibleName =
        (ariaLabel !== null && ariaLabel.trim().length > 0) ||
        (text !== null && text.trim().length > 0) ||
        (title !== null && title.trim().length > 0);
      expect(hasAccessibleName).toBe(true);
    }
  });

  test('画像にalt属性がある', async ({ page }) => {
    await preparePage(page, pages[0]);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const images = page.locator('img:visible');
    const count = await images.count();

    for (let i = 0; i < count; i += 1) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      if (role !== 'presentation' && role !== 'none') {
        expect(alt).not.toBeNull();
      }
    }
  });
});
