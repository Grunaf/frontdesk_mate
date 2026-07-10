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
    const wifiBridge = page.getByTestId('stay-bridge-wifi');
    await wifiBridge.scrollIntoViewIfNeeded();
    await expect(wifiBridge).toBeVisible();
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
    await expect(
      page.getByRole('link', { name: /Message reception|Написать ресепшену/i })
    ).toBeVisible();
  });

  test('hides reception strip while stay sheet is open', async ({ page }) => {
    const strip = page.locator('[data-slot="concierge-reception-strip"]');
    await expect(strip).toBeVisible();
    const myStay = page.getByRole('button', { name: /My stay|Проживание/ });
    await myStay.scrollIntoViewIfNeeded();
    await myStay.click();
    await expect(page.getByText(/For reception|Для ресепшена/i)).toBeVisible();
    await expect(strip).toBeHidden();
  });

  test('hides reception strip while stay essentials sheet is open', async ({ page }) => {
    const strip = page.locator('[data-slot="concierge-reception-strip"]');
    await expect(strip).toBeVisible();
    const wifiBridge = page.getByTestId('stay-bridge-wifi');
    await wifiBridge.scrollIntoViewIfNeeded();
    await wifiBridge.click();
    await expect(page.getByText(/Network|Сеть/i)).toBeVisible();
    await expect(strip).toBeHidden();
  });

  test('room map link opens registration when prerequisites are incomplete', async ({ page }) => {
    await page.getByRole('button', { name: /My stay|Проживание/ }).click();
    await expect(page.getByText(/For reception|Для ресепшена/i)).toBeVisible();

    const roomMapLink = page.getByRole('link', {
      name: /Show room map|room map|Карта комнаты|направления/i,
    });
    await roomMapLink.scrollIntoViewIfNeeded();
    await expect(roomMapLink).toHaveAttribute('href', /\/registration(?:\?|$)/, {
      timeout: config.navTimeoutMs,
    });
    await roomMapLink.click();

    await expect(page).toHaveURL(/\/registration(?:\?|$)/, {
      timeout: config.navTimeoutMs,
    });
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Guest registration|Tourist registration|Туристическая регистрация|Регистрация гост/i,
      })
    ).toBeVisible();
  });

  // Fresh e2e provisioned stays have incomplete contact (and tourism when enabled on E2E_TENANT_SLUG).
  test('pre-check-in registration banner navigates to registration', async ({ page }) => {
    const banner = page.getByTestId('stay-banner-registration');
    await banner.scrollIntoViewIfNeeded();
    await expect(banner).toBeVisible({ timeout: config.navTimeoutMs });
    await expect(page.getByTestId('stay-bridge-staySetup')).toHaveCount(0);

    await banner.click();
    await expect(page).toHaveURL(/\/registration(?:\?|$)/, {
      timeout: config.navTimeoutMs,
    });
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Guest registration|Tourist registration|Туристическая регистрация|Регистрация гост/i,
      })
    ).toBeVisible();
  });

  test('hides stay chip on arrival guide', async ({ page }) => {
    await page.goto(`${e2eGuestAppUrl(config, '/welcome')}?step=route`);
    await expect(page.getByRole('button', { name: /My stay|Проживание/ })).toBeHidden();
  });
});
