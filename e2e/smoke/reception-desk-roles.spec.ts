import { test, expect } from '@playwright/test';
import { e2eReceptionUrl, loadE2eConfig } from '../fixtures';
import { hasReceptionSmokeCredentials, loginToReceptionDesk } from '../helpers/reception';

const config = loadE2eConfig();

function hasCleaningSmokeCredentials(): boolean {
  return Boolean(
    process.env.E2E_RECEPTION_CLEANING_LOGIN?.trim() &&
      process.env.E2E_RECEPTION_CLEANING_PIN?.trim()
  );
}

async function loginAsCleaningStaff(page: import('@playwright/test').Page): Promise<void> {
  const login = process.env.E2E_RECEPTION_CLEANING_LOGIN!.trim();
  const pin = process.env.E2E_RECEPTION_CLEANING_PIN!.trim();

  await page.goto(e2eReceptionUrl(config, '/login'));
  await page.getByLabel('Login').fill(login);
  await page.getByLabel('PIN').fill(pin);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
    timeout: config.navTimeoutMs,
  });
}

test.describe('reception desk roles smoke', () => {
  test('check-in staff sees Today / Bookings / More shell', async ({ page }) => {
    test.skip(
      !hasReceptionSmokeCredentials(config),
      'Set E2E_RECEPTION_LOGIN + E2E_RECEPTION_PIN in e2e/env.local'
    );

    await loginToReceptionDesk(page, config);

    const primaryNav = page.getByRole('navigation', { name: 'Reception primary' });
    await expect(primaryNav.getByRole('button', { name: 'Today' })).toBeVisible();
    await expect(primaryNav.getByRole('button', { name: 'Bookings' })).toBeVisible();
    await expect(primaryNav.getByRole('button', { name: /More/ })).toBeVisible();

    await primaryNav.getByRole('button', { name: 'Bookings' }).click();
    await expect(page.getByRole('tab', { name: 'Plan' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Access' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Cash' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Archive' })).toHaveCount(0);

    await primaryNav.getByRole('button', { name: /More/ }).click();
    await expect(page.getByRole('heading', { name: 'More' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Issues/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Archive/ })).toBeVisible();

    await expect(page.getByRole('button', { name: 'New booking' })).toBeVisible();
  });

  test('cleaning staff sees Cleaning and not check-in shell', async ({ page }) => {
    test.skip(
      !hasCleaningSmokeCredentials(),
      'Set E2E_RECEPTION_CLEANING_LOGIN + E2E_RECEPTION_CLEANING_PIN (permissions: desk.cleaning only)'
    );

    await loginAsCleaningStaff(page);

    const primaryNav = page.getByRole('navigation', { name: 'Reception primary' });
    await expect(primaryNav.getByRole('button', { name: 'Cleaning' })).toBeVisible();
    await expect(primaryNav.getByRole('button', { name: 'Today' })).toHaveCount(0);
    await expect(primaryNav.getByRole('button', { name: 'Bookings' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Cleaning' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Plan' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Cash' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'New booking' })).toHaveCount(0);

    await page.goto(e2eReceptionUrl(config, '/?tab=plan'));
    await expect(primaryNav.getByRole('button', { name: 'Cleaning' })).toBeVisible({
      timeout: config.navTimeoutMs,
    });
    await expect(page.getByRole('tab', { name: 'Plan' })).toHaveCount(0);
  });
});
