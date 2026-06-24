import { test, expect } from '@playwright/test';
import { loadE2eConfig } from '../fixtures';
import { checkInWithPin, openConcierge } from '../helpers/guest';

const config = loadE2eConfig();

test.describe('guest extras', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await checkInWithPin(page, config);
    await openConcierge(page, config);
  });

  test('opens laundry extra sheet from bento tile', async ({ page }) => {
    await expect(page.getByText(/^Extras$|^Дополнительно$/i)).toBeVisible();
    await page.getByTestId('guest-extra-tile-laundry').click();
    await expect(page.getByText(/^Laundry$|^Прачка$/i).first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Come to reception|Подойти на ресепшен/i })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Message reception|Написать на ресепшен/i })
    ).toBeVisible();
  });
});
