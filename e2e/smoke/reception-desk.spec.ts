import { test, expect } from '@playwright/test';
import { loadE2eConfig } from '../fixtures';
import { loginToReceptionDesk } from '../helpers/reception';

const config = loadE2eConfig();

async function openIssueGuestAccessOverlay(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Issue guest access' }).click();
  await expect(page.getByRole('heading', { name: 'Issue guest access' })).toBeVisible({
    timeout: config.navTimeoutMs,
  });
}

test.describe('reception desk smoke', () => {
  test.beforeEach(() => {
    test.skip(!config.receptionDeskPin, 'Set E2E_RECEPTION_DESK_PIN in e2e/env.local');
  });

  test('signs in and shows issue access form', async ({ page }) => {
    await loginToReceptionDesk(page, config);
    await expect(page.getByRole('tab', { name: 'Desk' })).toBeVisible();
    await expect(page.getByText('Operational day ·')).toBeVisible();
    await expect(page.getByText('Free beds', { exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Today ·/ })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Plan' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Access' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Issues' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Issue guest access' })).toBeVisible();

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

    await page.getByRole('tab', { name: 'Access' }).click();
    const refLine = page.locator('li[id^="stay-"]').first().getByText(/#\w{6}/);
    await expect(refLine).toBeVisible({ timeout: config.navTimeoutMs });
    const refText = (await refLine.textContent())?.match(/#([A-Z0-9]{6})/)?.[1];
    expect(refText).toBeTruthy();

    await page.getByRole('textbox', { name: 'Find stay by ref' }).fill(refText!);
    await page.getByRole('button', { name: 'Find' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: config.navTimeoutMs });
    await expect(page.getByText('Paper PIN')).toBeVisible();
  });

  test('opens guest detail from desk without switching to access tab', async ({ page }) => {
    await loginToReceptionDesk(page, config);
    await openIssueGuestAccessOverlay(page);

    const issueButton = page.getByRole('button', { name: 'Issue access' });
    await expect(issueButton).toBeEnabled({ timeout: config.navTimeoutMs });
    await issueButton.click();

    await expect(page.getByRole('tab', { name: 'Desk' })).toHaveAttribute('data-active', '');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: config.navTimeoutMs });
    await expect(page.getByText('Paper PIN')).toBeVisible();
  });

  test('marks guest arrived from stay detail', async ({ page }) => {
    await loginToReceptionDesk(page, config);
    await openIssueGuestAccessOverlay(page);

    const issueButton = page.getByRole('button', { name: 'Issue access' });
    await expect(issueButton).toBeEnabled({ timeout: config.navTimeoutMs });
    await issueButton.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: config.navTimeoutMs });

    await page.getByRole('button', { name: 'Mark arrived' }).click();
    await expect(page.getByText(/^Arrived · /)).toBeVisible({ timeout: config.navTimeoutMs });
    await expect(page.getByRole('button', { name: 'Mark arrived' })).toHaveCount(0);
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
