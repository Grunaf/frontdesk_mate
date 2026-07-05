import { test, expect } from '@playwright/test';
import { loadE2eConfig, e2eGuestCheckInUrl } from '../fixtures';
import {
  checkInWithPin,
  openConcierge,
  openGuestRouteStep,
} from '../helpers/guest';

const config = loadE2eConfig();

test.describe.configure({ mode: 'serial' });

test.describe('guest journey smoke', () => {
  test('check-in with PIN opens welcome flow', async ({ page }) => {
    await page.context().clearCookies();
    await checkInWithPin(page, config);
    await expect(page).toHaveURL(/\/welcome\?.*step=info/);
  });

  test('arrival guide shows route picker', async ({ page }) => {
    await checkInWithPin(page, config);
    await openGuestRouteStep(page, config);
    await expect(page.getByText('From which location are you arriving?')).toBeVisible();
    await expect(page.getByRole('tab').first()).toBeVisible();
  });

  test('concierge shows local guide essentials', async ({ page }) => {
    await checkInWithPin(page, config);
    await openConcierge(page, config);
    const localGuideHeading = page.getByRole('heading', {
      name: /Local guide|Городской гид/,
    });
    await localGuideHeading.scrollIntoViewIfNeeded();
    await expect(localGuideHeading).toBeVisible();
    const essentialChip = page
      .getByText(/^(ATM|Shop|Pharmacy|Late food|Банкомат|Магазин|Аптека)$/i)
      .first();
    await essentialChip.scrollIntoViewIfNeeded();
    await expect(essentialChip).toBeVisible();
  });

  test('wrong PIN shows error', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(e2eGuestCheckInUrl(config));
    await page.getByLabel('Check-in PIN').fill('000000');
    await expect(page.getByText('PIN not recognized')).toBeVisible({
      timeout: config.navTimeoutMs * 2,
    });
  });
});
