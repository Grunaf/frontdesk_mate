import { test, expect } from '@playwright/test';
import { loadE2eConfig } from '../fixtures';
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

  test('room map link opens register step when tourism registration is incomplete', async ({ page }) => {
    await page.getByRole('button', { name: /My stay|Проживание/ }).click();
    await expect(page.getByText(/For reception|Для ресепшена/i)).toBeVisible();

    const roomMapLink = page.getByRole('link', {
      name: /Show room map|room map|Карта комнаты|направления/i,
    });
    await roomMapLink.scrollIntoViewIfNeeded();
    await expect(roomMapLink).toHaveAttribute('href', /step=register/, {
      timeout: config.navTimeoutMs,
    });
    await roomMapLink.click();

    await expect(page).toHaveURL(/\/welcome\?.*step=register/, { timeout: config.navTimeoutMs });
    await expect(
      page.getByRole('tab', { name: /Tourist registration|Туристическая регистрация/i })
    ).toBeVisible();
  });
});
