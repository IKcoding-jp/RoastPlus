import { expect, test, type Locator, type Page } from '@playwright/test';

// firebase.e2e.json と e2e/e2e.env に一致させる（オープンルールのエミュレータ）
const FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
const E2E_PROJECT_ID = 'demo-roastplus-e2e';
const CLEAR_URL = `http://${FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${E2E_PROJECT_ID}/databases/(default)/documents`;

// 3列カード（Card=rounded-2xl のdiv）を見出しで特定する
function column(page: Page, heading: string): Locator {
  return page.locator('div.rounded-2xl').filter({ has: page.getByRole('heading', { name: heading }) });
}

// 「月の設定」メニューから対象月を指定して作成し、月設定モーダルで配合まで保存する（配合は1件・100%）
async function createMonth(
  page: Page,
  { month, greenKg, beanName }: { month: string; greenKg: string; beanName: string }
) {
  // 月の作成は「月の設定」メニューに集約されている（Layout A）
  await page.getByRole('button', { name: '月の設定' }).click();
  await page.getByLabel('対象月').fill(month);
  // 空状態の「対象月を作成」と部分一致するため exact でメニューの「作成」に限定
  await page.getByRole('button', { name: '作成', exact: true }).click();

  const modal = page.getByRole('heading', { name: /月設定/ });
  await expect(modal).toBeVisible();

  await page.getByLabel('生豆総量').fill(greenKg);
  await page.getByLabel('豆 1').fill(beanName);
  await page.getByLabel('比率').fill('100');
  await page.getByRole('button', { name: '保存' }).click();
}

test.describe('生産記録 E2E（実Firestoreエミュレータ）', () => {
  test.beforeEach(async ({ page }) => {
    // エミュレータのデータを毎回クリアしてテスト間を独立させる
    await fetch(CLEAR_URL, { method: 'DELETE' });
    // E2Eモードの認証バイパス（localStorage偽装）
    await page.addInitScript(() => {
      localStorage.setItem('roastplus_e2e_auth', 'e2e-user');
    });
  });

  test('対象月作成→各入力→3列集計→月合計→CSVまで通しで動く', async ({ page }) => {
    await page.goto('/production-record');

    // 初期は空状態
    await expect(page.getByText('生産記録がまだありません')).toBeVisible({ timeout: 15_000 });

    // 月設定（生豆30kg / 配合モカ100%）
    await createMonth(page, { month: '2026-08', greenKg: '30', beanName: 'モカ' });

    // 3列表示に切り替わる
    await expect(page.getByRole('heading', { name: '生豆ハンドピック' })).toBeVisible({ timeout: 15_000 });

    // ハンドピック入力（生豆10kg / 欠点200g）
    await page.getByRole('button', { name: '欠点豆を入力' }).click();
    await expect(page.getByRole('heading', { name: 'ハンドピック記録' })).toBeVisible();
    await page.getByLabel('今回生豆重量').fill('10');
    await page.getByLabel('欠点豆重量').fill('200');
    await page.getByRole('button', { name: '保存' }).click();

    const handpickCard = column(page, '生豆ハンドピック');
    await expect(handpickCard.getByText('1件')).toBeVisible({ timeout: 15_000 });
    // 保存した記録カードが読み戻されている（Firestore往復の確認）
    await expect(handpickCard.getByRole('button', { name: /生豆 10\.00 kg/ })).toBeVisible();

    // 焙煎入力（焙煎前10kg / 焙煎後8000g → 歩留まり80.0%）
    await page.getByRole('button', { name: '焙煎を入力' }).click();
    await expect(page.getByRole('heading', { name: '焙煎記録' })).toBeVisible();
    await page.getByLabel('焙煎前重量').fill('10');
    await page.getByLabel('焙煎後重量').fill('8000');
    await page.getByRole('button', { name: '保存' }).click();

    const roastCard = column(page, '焙煎');
    await expect(roastCard.getByText('80.0%')).toBeVisible({ timeout: 15_000 });

    // パッケージ入力（A班 良100/不5・B班 良90/不10 → 良190/不15/生産205）
    await page.getByRole('button', { name: 'パッケージを入力' }).click();
    await expect(page.getByRole('heading', { name: 'パッケージ記録' })).toBeVisible();
    const packageModal = column(page, 'パッケージ記録'); // モーダルもrounded-2xl
    // 「良品数」は「不良品数」に部分一致するため exact 指定で厳密一致させる
    await packageModal.getByLabel('良品数', { exact: true }).first().fill('100');
    await packageModal.getByLabel('不良品数', { exact: true }).first().fill('5');
    await packageModal.getByLabel('良品数', { exact: true }).nth(1).fill('90');
    await packageModal.getByLabel('不良品数', { exact: true }).nth(1).fill('10');
    await page.getByRole('button', { name: '保存' }).click();

    const packageCard = column(page, 'パッケージ');
    await expect(packageCard.getByText('190')).toBeVisible({ timeout: 15_000 });
    await expect(packageCard.getByText('205')).toBeVisible();

    // 月合計サマリーは下部バーから開く（Layout A）
    await page.getByRole('button', { name: /月合計・CSV出力/ }).click();
    await expect(page.getByRole('heading', { name: '月合計サマリー' })).toBeVisible();
    const pre = page.locator('pre');
    await expect(pre).toContainText('2026年8月分');
    await expect(pre).toContainText('モカ 100%');

    // CSV出力でダウンロードが発火する（「月合計・CSV出力」と部分一致するため exact）
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'CSV出力', exact: true }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('production-record-2026-08.csv');
  });

  test('同じ日付・区分・豆名のハンドピックは重複せず上書き（upsert）される', async ({ page }) => {
    await page.goto('/production-record');
    await createMonth(page, { month: '2026-09', greenKg: '30', beanName: 'モカ' });
    await expect(page.getByRole('heading', { name: '生豆ハンドピック' })).toBeVisible({ timeout: 15_000 });

    const handpickCard = column(page, '生豆ハンドピック');

    // 1回目（生豆10kg）
    await page.getByRole('button', { name: '欠点豆を入力' }).click();
    await page.getByLabel('今回生豆重量').fill('10');
    await page.getByLabel('欠点豆重量').fill('200');
    await page.getByRole('button', { name: '保存' }).click();
    await expect(handpickCard.getByText('1件')).toBeVisible({ timeout: 15_000 });

    // 2回目：同じ日付・区分・豆名で生豆12kgに上書き
    await page.getByRole('button', { name: '欠点豆を入力' }).click();
    await page.getByLabel('今回生豆重量').fill('12');
    await page.getByLabel('欠点豆重量').fill('300');
    await page.getByRole('button', { name: '保存' }).click();

    // 件数は1件のまま（重複しない）、値は上書きされ12.00kg
    await expect(handpickCard.getByText('1件')).toBeVisible({ timeout: 15_000 });
    await expect(handpickCard.getByRole('button', { name: /生豆 12\.00 kg/ })).toBeVisible();
    await expect(handpickCard.getByText('2件')).toHaveCount(0);
  });

  test('「対象月を作成」を開いてキャンセルしても3列へ遷移しない', async ({ page }) => {
    await page.goto('/production-record');
    await expect(page.getByText('生産記録がまだありません')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: '対象月を作成' }).first().click();
    await expect(page.getByRole('heading', { name: /月設定/ })).toBeVisible();

    await page.getByRole('button', { name: 'キャンセル' }).click();

    // 空状態のまま・3列見出しは出ない
    await expect(page.getByText('生産記録がまだありません')).toBeVisible();
    await expect(page.getByRole('heading', { name: '生豆ハンドピック' })).toHaveCount(0);
  });
});
