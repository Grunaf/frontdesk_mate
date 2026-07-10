import { test, expect } from '@playwright/test';
import { loadE2eConfig, e2eGuestAppUrl } from '../fixtures';
import { checkInWithPin, openConcierge } from '../helpers/guest';

const config = loadE2eConfig();

test.describe.configure({ mode: 'serial' });

test.describe('guest tourism deep links', () => {
  test.skip(
    !config.tourismSmoke,
    'Set E2E_TOURISM_SMOKE=1 in e2e/env.local and enable tourism registration on E2E_TENANT_SLUG'
  );

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await checkInWithPin(page, config);
    await openConcierge(page, config);
  });

  test('welcome register deep link opens arrival register tab', async ({ page }) => {
    await page.goto(`${e2eGuestAppUrl(config, '/welcome')}?step=register`);

    await expect(page).toHaveURL(/\/welcome\?.*step=register/, { timeout: config.navTimeoutMs });
    await expect(
      page.getByRole('tab', { name: /Tourist registration|Туристическая регистрация|Guest registration/i })
    ).toBeVisible();
  });
});
