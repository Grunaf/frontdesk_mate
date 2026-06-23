import { test, expect } from '@playwright/test';
import { loadE2eConfig } from '../fixtures';
import { checkInWithPin, openConcierge } from '../helpers/guest';

const config = loadE2eConfig();

test.describe('guest services', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await checkInWithPin(page, config);
    await openConcierge(page, config);
  });

  test('shows laundry service card with whatsapp link', async ({ page }) => {
    await expect(page.getByText(/^Services$|^Услуги$/i)).toBeVisible();
    await expect(page.getByText(/^Laundry$|^Прачка$/i)).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Request laundry|Заказать прачку/i })
    ).toBeVisible();
  });
});
