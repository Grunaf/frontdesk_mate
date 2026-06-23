import { test, expect } from '@playwright/test';
import { loadE2eConfig } from '../fixtures';
import { loginToReceptionDesk } from '../helpers/reception';
import { checkInWithPin, openConcierge } from '../helpers/guest';

const config = loadE2eConfig();

test.describe.configure({ mode: 'serial' });

test.describe('guest issue report', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await checkInWithPin(page, config);
    await openConcierge(page, config);
  });

  test('shows report card and sends shower issue', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Report issue|Сообщить о поломке/i })).toBeVisible();
    await page.getByRole('button', { name: /Report issue|Сообщить о поломке/i }).first().click();

    await expect(page.getByText(/Only reception sees this|Видит только ресепшен/i)).toBeVisible();
    await page.getByRole('tab', { name: /Shower|Душ/i }).click();
    await page.locator('#guest-issue-note').fill('No hot water');
    await page.getByRole('button', { name: /Send report|Отправить/i }).click();

    await expect(page.getByText(/Sent to reception|Отправлено ресепшену/i)).toBeVisible();
    await expect(page.getByText(/Ref #/)).toBeVisible();
  });

  test('opens same form from my stay link', async ({ page }) => {
    await page.getByRole('button', { name: /My stay|Проживание/ }).click();
    const staySheet = page
      .locator('[data-slot="bottom-sheet-content"]')
      .filter({ hasText: /For reception|Для ресепшена/i });
    await expect(staySheet).toBeVisible();
    await staySheet.getByRole('button', { name: /Report issue|Сообщить о поломке/i }).click();
    await expect(page.getByText(/Only reception sees this|Видит только ресепшен/i)).toBeVisible();
  });
});

test.describe('reception issues tab', () => {
  test.beforeEach(() => {
    test.skip(!config.receptionDeskPin, 'Set E2E_RECEPTION_DESK_PIN in e2e/env.local');
  });

  test('shows open issue after guest report', async ({ page, browser }) => {
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();

    await checkInWithPin(guestPage, config);
    await openConcierge(guestPage, config);
    await guestPage.getByRole('button', { name: /Report issue|Сообщить о поломке/i }).first().click();
    await guestPage.getByRole('tab', { name: /Toilet|Туалет/i }).click();
    await guestPage.getByRole('button', { name: /Send report|Отправить/i }).click();
    await expect(guestPage.getByText(/Sent to reception|Отправлено ресепшену/i)).toBeVisible();

    await loginToReceptionDesk(page, config);
    await page.getByRole('tab', { name: /Issues/i }).click();
    const issueRow = page.getByRole('listitem').filter({ hasText: /Toilet ·/ });
    await expect(issueRow).toBeVisible({ timeout: config.navTimeoutMs });
    await issueRow.getByRole('button', { name: 'Mark done' }).click();
    await expect(issueRow).toBeHidden({ timeout: config.navTimeoutMs });

    await guestContext.close();
  });
});
