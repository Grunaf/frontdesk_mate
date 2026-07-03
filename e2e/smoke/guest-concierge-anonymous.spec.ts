import { test, expect } from '@playwright/test';
import { loadE2eConfig } from '../fixtures';
import { openAnonymousConcierge } from '../helpers/guest';

const config = loadE2eConfig();

test.describe.configure({ mode: 'serial' });

test.describe('guest concierge anonymous', () => {
  test.beforeEach(async ({ page }) => {
    await openAnonymousConcierge(page, config);
  });

  test('shows check-in chip and arrival guide without registration hero', async ({ page }) => {
    const checkInChip = page.getByTestId('guest-check-in-chip');
    await checkInChip.scrollIntoViewIfNeeded();
    await expect(checkInChip).toBeVisible();
    await expect(page.getByRole('button', { name: /My stay|Проживание/ })).toBeHidden();

    const arrivalGuide = page.getByTestId('stay-bridge-arrivalGuide');
    await arrivalGuide.scrollIntoViewIfNeeded();
    await expect(arrivalGuide).toBeVisible();
    await expect(arrivalGuide).toHaveAttribute('data-read', 'unread');

    await expect(page.getByRole('button', { name: /View arrival guide|Посмотреть Welcome/i })).toHaveCount(0);
  });

  test('opens check-in sheet from header chip', async ({ page }) => {
    await page.getByTestId('guest-check-in-chip').click();
    await expect(page.getByRole('heading', { name: /Get your check-in link|Как получить ссылку для check-in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sign in|Войти/i })).toBeVisible();
  });

  test('marks arrival guide read after visit and return to concierge', async ({ page }) => {
    const arrivalGuide = page.getByTestId('stay-bridge-arrivalGuide');
    await arrivalGuide.scrollIntoViewIfNeeded();
    await arrivalGuide.click();

    await expect(page).toHaveURL(/\/welcome/, { timeout: config.navTimeoutMs * 2 });
    await expect(page.getByTestId('guest-check-in-chip')).toBeHidden();

    await page.getByRole('button', { name: /Concierge|Консьерж/i }).click();
    await expect(page).toHaveURL(new RegExp(`${config.locale}/?$`), { timeout: config.navTimeoutMs });

    const arrivalAfterReturn = page.getByTestId('stay-bridge-arrivalGuide');
    await arrivalAfterReturn.scrollIntoViewIfNeeded();
    await expect(arrivalAfterReturn).toHaveAttribute('data-read', 'read');
  });
});
