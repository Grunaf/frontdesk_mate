import { test, expect } from '@playwright/test';
import { loadE2eConfig } from '../fixtures';
import { hasReceptionSmokeCredentials, loginToReceptionDesk } from '../helpers/reception';

const config = loadE2eConfig();

async function openIssueGuestAccessOverlay(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'New booking' }).click();
  await expect(page.getByRole('heading', { name: 'Issue guest access' })).toBeVisible({
    timeout: config.navTimeoutMs,
  });
}

test.describe('reception desk smoke', () => {
  test.beforeEach(() => {
    test.skip(
      !hasReceptionSmokeCredentials(config),
      'Set E2E_RECEPTION_LOGIN + E2E_RECEPTION_PIN in e2e/env.local'
    );
  });

  test('signs in and shows issue access form', async ({ page }) => {
    await loginToReceptionDesk(page, config);

    const primaryNav = page.getByRole('navigation', { name: 'Reception primary' });
    await expect(primaryNav.getByRole('button', { name: 'Today' })).toBeVisible();
    await expect(primaryNav.getByRole('button', { name: 'Bookings' })).toBeVisible();
    await expect(primaryNav.getByRole('button', { name: /More/ })).toBeVisible();
    await expect(page.getByText('Operational day ·')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Plan' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Issues' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'New booking' })).toBeVisible();

    await primaryNav.getByRole('button', { name: 'Bookings' }).click();
    await expect(page.getByRole('tab', { name: 'Plan' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Access' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Cash' })).toBeVisible();

    await openIssueGuestAccessOverlay(page);
  });

  test('issues tonight access and shows PIN once', async ({ page }) => {
    await loginToReceptionDesk(page, config);
    await openIssueGuestAccessOverlay(page);

    const issueButton = page.getByRole('button', { name: 'Issue access' });
    await expect(issueButton).toBeEnabled({ timeout: config.navTimeoutMs });
    await issueButton.click();

    await expect(page.getByText('Paper PIN')).toBeVisible({ timeout: config.navTimeoutMs });
    await expect(page.getByText(/\d{3}\s\d{3}/)).toBeVisible();
    await expect(page.getByText('Shown once')).toBeVisible();
  });

  test('finds issued stay by guest ref on access tab', async ({ page }) => {
    await loginToReceptionDesk(page, config);
    await openIssueGuestAccessOverlay(page);

    const issueButton = page.getByRole('button', { name: 'Issue access' });
    await expect(issueButton).toBeEnabled({ timeout: config.navTimeoutMs });
    await issueButton.click();
    await expect(page.getByText('Paper PIN')).toBeVisible({ timeout: config.navTimeoutMs });

    await page.getByRole('navigation', { name: 'Reception primary' }).getByRole('button', { name: 'Bookings' }).click();
    await page.getByRole('tab', { name: 'Access' }).click();
    const refLine = page.locator('li[id^="stay-"]').first().getByText(/#\w{6}/);
    await expect(refLine).toBeVisible({ timeout: config.navTimeoutMs });
    const refText = (await refLine.textContent())?.match(/#([A-Z0-9]{6})/)?.[1];
    expect(refText).toBeTruthy();

    await page.getByRole('textbox', { name: 'Search bookings' }).fill(refText!);
    const option = page.getByRole('option').filter({ hasText: `#${refText}` }).first();
    await expect(option).toBeVisible({ timeout: config.navTimeoutMs });
    await option.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: config.navTimeoutMs });
    await expect(page.getByText('Paper PIN')).toBeVisible();
  });

  test('opens guest detail from desk without switching to access tab', async ({ page }) => {
    await loginToReceptionDesk(page, config);
    await openIssueGuestAccessOverlay(page);

    const issueButton = page.getByRole('button', { name: 'Issue access' });
    await expect(issueButton).toBeEnabled({ timeout: config.navTimeoutMs });
    await issueButton.click();

    await expect(
      page.getByRole('navigation', { name: 'Reception primary' }).getByRole('button', { name: 'Today' })
    ).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: config.navTimeoutMs });
    await expect(page.getByText('Paper PIN')).toBeVisible();
  });

  test('admits guest to check-in from stay detail', async ({ page }) => {
    await loginToReceptionDesk(page, config);
    await openIssueGuestAccessOverlay(page);

    const issueButton = page.getByRole('button', { name: 'Issue access' });
    await expect(issueButton).toBeEnabled({ timeout: config.navTimeoutMs });
    await issueButton.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: config.navTimeoutMs });

    await page.getByRole('button', { name: 'Check in' }).click();
    await expect(page.getByText(/^Admitted · /)).toBeVisible({ timeout: config.navTimeoutMs });
    await expect(page.getByRole('button', { name: 'Check in' })).toHaveCount(0);
  });

  test('moves guest to another bed in place', async ({ page }) => {
    await loginToReceptionDesk(page, config);
    await openIssueGuestAccessOverlay(page);

    const bedSelect = page.locator('#bed-id');
    const options = bedSelect.locator('option');
    const optionCount = await options.count();
    test.skip(optionCount < 2, 'Need at least two beds configured for move-bed smoke');

    const secondBedValue = await options.nth(1).getAttribute('value');
    const secondBedLabel = (await options.nth(1).textContent())?.trim();
    expect(secondBedValue).toBeTruthy();
    expect(secondBedLabel).toBeTruthy();

    const issueButton = page.getByRole('button', { name: 'Issue access' });
    await expect(issueButton).toBeEnabled({ timeout: config.navTimeoutMs });
    await issueButton.click();
    await expect(page.getByText('Paper PIN')).toBeVisible({ timeout: config.navTimeoutMs });

    await page.getByRole('button', { name: 'Move bed' }).click();
    await expect(page.getByText('PIN and link stay the same')).toBeVisible({
      timeout: config.navTimeoutMs,
    });

    await bedSelect.selectOption(secondBedValue!);
    await page.getByRole('button', { name: 'Save reservation' }).click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: config.navTimeoutMs });
    await expect(page.getByText('Paper PIN')).toBeVisible();
    await expect(page.getByRole('dialog').getByText(secondBedLabel!)).toBeVisible();
  });
});
