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
    await expect(wifiBridge).toBeEnabled();
    await wifiBridge.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Network|Сеть/i)).toBeVisible();
    await expect(strip).toBeHidden();
  });

  // Requires post–check-in smoke stay (see resolveSmokeCheckInDate in provisionGuestStay).
  // Before policy check-in time the bed card is locked (no link), not a selector flake.
  test('room map link opens stay-setup registration when prerequisites are incomplete', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /My stay|Проживание/ }).click();
    await expect(page.getByText(/For reception|Для ресепшена/i)).toBeVisible();

    const roomMapLink = page.getByRole('link', {
      name: /Show room map|room map|Карта комнаты|направления/i,
    });
    await roomMapLink.scrollIntoViewIfNeeded();
    await expect(roomMapLink).toHaveAttribute('href', /\/stay-setup\?.*step=registration/, {
      timeout: config.navTimeoutMs,
    });
    await roomMapLink.click();

    await expect(page).toHaveURL(/\/stay-setup\?.*step=registration/, {
      timeout: config.navTimeoutMs,
    });
    await expect(page.getByLabel('Stay setup steps')).toBeVisible();
  });

  // Provision uses check-in calendar night today (or yesterday before policy hour) → settlement
  // banner (not pre-check-in registration). Incomplete contact/tourism still routes to registration.
  test('check-in day settlement banner opens stay-setup registration', async ({ page }) => {
    const banner = page.getByTestId('stay-banner-settlement');
    const registrationBanner = page.getByTestId('stay-banner-registration');
    await banner.scrollIntoViewIfNeeded();
    await expect(banner).toBeVisible({ timeout: config.navTimeoutMs });
    await expect(registrationBanner).toHaveCount(0);
    await expect(page.getByTestId('stay-bridge-staySetup')).toHaveCount(0);

    await banner.click();
    await expect(page).toHaveURL(/\/stay-setup\?.*step=registration/, {
      timeout: config.navTimeoutMs,
    });
    await expect(page.getByLabel('Stay setup steps')).toBeVisible();
    // Registration wizard exposes sections as tabs (not buttons).
    await expect(
      page
        .getByRole('tab', {
          name: /Passport details|Паспортные данные|Podaci iz pasoša|Contact|Контакт/i,
        })
        .first()
    ).toBeVisible({ timeout: config.navTimeoutMs });
  });

  test('hides stay chip on arrival guide', async ({ page }) => {
    await page.goto(`${e2eGuestAppUrl(config, '/welcome')}?step=route`);
    await expect(page.getByRole('button', { name: /My stay|Проживание/ })).toBeHidden();
  });
});
