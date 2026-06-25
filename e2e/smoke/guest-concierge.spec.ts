import { test, expect } from '@playwright/test';
import { loadE2eConfig, e2eGuestAppUrl } from '../fixtures';
import { checkInWithPin, openConcierge } from '../helpers/guest';

const config = loadE2eConfig();

test.describe.configure({ mode: 'serial' });

test.describe('guest concierge stay chip', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await checkInWithPin(page, config);
    await openConcierge(page, config);
  });

  test('shows stay chip, stay essentials bridges, and reception strip', async ({ page }) => {
    await expect(page.getByRole('button', { name: /My stay|Проживание/ })).toBeVisible();
    await expect(page.getByTestId('stay-bridge-wifi')).toBeVisible();
    const strip = page.locator('[data-slot="concierge-reception-strip"]');
    await expect(strip).toBeVisible();
    await expect(
      strip.getByRole('link', {
        name: /Message .* reception|Call reception|Написать ресепшену|Позвонить на ресепшен/i,
      })
    ).toBeVisible();
  });

  test('opens stay sheet with reception ref block', async ({ page }) => {
    await page.getByRole('button', { name: /My stay|Проживание/ }).click();
    await expect(page.getByText(/For reception|Для ресепшена/i)).toBeVisible();
    await expect(page.getByText(/Ref #/)).toBeVisible();
    await expect(page.getByRole('link', { name: /Request to extend stay|Написать о продлении/i })).toBeVisible();
  });

  test('hides reception strip while stay sheet is open', async ({ page }) => {
    const strip = page.locator('[data-slot="concierge-reception-strip"]');
    await expect(strip).toBeVisible();
    await page.getByRole('button', { name: /My stay|Проживание/ }).click();
    await expect(page.getByText(/For reception|Для ресепшена/i)).toBeVisible();
    await expect(strip).toBeHidden();
  });

  test('hides reception strip while stay essentials sheet is open', async ({ page }) => {
    const strip = page.locator('[data-slot="concierge-reception-strip"]');
    await expect(strip).toBeVisible();
    await page.getByTestId('stay-bridge-wifi').click();
    await expect(page.getByText(/Network|Сеть/i)).toBeVisible();
    await expect(strip).toBeHidden();
  });

  test('room map link opens settlement tab in arrival guide', async ({ page }) => {
    await page.getByRole('button', { name: /My stay|Проживание/ }).click();
    await expect(page.getByText(/For reception|Для ресепшена/i)).toBeVisible();

    const roomMapLink = page.locator('a[href*="step=settlement"]');
    await roomMapLink.scrollIntoViewIfNeeded();
    await roomMapLink.click();

    await expect(page).toHaveURL(/\/welcome\?.*step=settlement/);
    await expect(page.getByRole('tab', { name: /Settlement|Заселение/i })).toBeVisible();
  });

  test('hides stay chip on arrival guide', async ({ page }) => {
    await page.goto(`${e2eGuestAppUrl(config, '/welcome')}?step=route`);
    await expect(page.getByRole('button', { name: /My stay|Проживание/ })).toBeHidden();
  });
});
