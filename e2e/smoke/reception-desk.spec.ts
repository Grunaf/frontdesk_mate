import { test, expect } from '@playwright/test';
import { loadE2eConfig } from '../fixtures';
import { loginToReceptionDesk } from '../helpers/reception';

const config = loadE2eConfig();

test.describe('reception desk smoke', () => {
  test.beforeEach(() => {
    test.skip(!config.receptionDeskPin, 'Set E2E_RECEPTION_DESK_PIN in e2e/env.local');
  });

  test('signs in and shows issue access form', async ({ page }) => {
    await loginToReceptionDesk(page, config);
    await expect(page.getByRole('heading', { name: 'Issue guest access' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Now' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Plan' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Access' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Issues' })).toBeVisible();
  });

  test('issues tonight access and shows PIN once', async ({ page }) => {
    await loginToReceptionDesk(page, config);

    const issueButton = page.getByRole('button', { name: 'Issue access' });
    await expect(issueButton).toBeEnabled({ timeout: config.navTimeoutMs });
    await issueButton.click();

    await expect(page.getByText('Paper PIN')).toBeVisible({ timeout: config.navTimeoutMs });
    await expect(page.getByText(/\d{3}\s\d{3}/)).toBeVisible();
    await expect(page.getByText('Shown once')).toBeVisible();
  });

  test('finds issued stay by guest ref on access tab', async ({ page }) => {
    await loginToReceptionDesk(page, config);

    const issueButton = page.getByRole('button', { name: 'Issue access' });
    await expect(issueButton).toBeEnabled({ timeout: config.navTimeoutMs });
    await issueButton.click();
    await expect(page.getByText('Paper PIN')).toBeVisible({ timeout: config.navTimeoutMs });

    await page.getByRole('tab', { name: 'Access' }).click();
    const refLine = page.locator('li[id^="stay-"]').first().getByText(/#\w{6}/);
    await expect(refLine).toBeVisible({ timeout: config.navTimeoutMs });
    const refText = (await refLine.textContent())?.match(/#([A-Z0-9]{6})/)?.[1];
    expect(refText).toBeTruthy();

    await page.getByRole('textbox', { name: 'Find stay by ref' }).fill(refText!);
    await page.getByRole('button', { name: 'Find' }).click();
    await expect(page.locator(`#stay-`)).toBeVisible();
  });
});
