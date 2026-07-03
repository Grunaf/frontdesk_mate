import type { Page } from '@playwright/test';
import type { E2eConfig } from '../fixtures';
import { e2eGuestAppUrl, e2eGuestCheckInUrl } from '../fixtures';

export async function completeGuestIntentIfShown(page: Page, config: E2eConfig): Promise<void> {
  const intentTitle = page.getByRole('heading', { name: 'Where are you now?' });
  const isIntentVisible = await intentTitle
    .waitFor({ state: 'visible', timeout: 2_000 })
    .then(() => true)
    .catch(() => false);

  if (!isIntentVisible) return;

  await page.getByRole('button', { name: /Still traveling|Ещё в пути/i }).click();
  await page.waitForURL(/\/welcome\?.*step=info/, { timeout: config.navTimeoutMs * 2 });
}

export async function checkInWithPin(page: Page, config: E2eConfig): Promise<void> {
  if (!config.guestPin) {
    throw new Error('Guest PIN is missing. global-setup should provision a smoke stay before tests run.');
  }

  await page.goto(e2eGuestCheckInUrl(config));
  await page.getByLabel('Check-in PIN').fill(config.guestPin);
  await page.waitForURL(/\/(check-in\/intent|welcome)/, { timeout: config.navTimeoutMs * 2 });
  await completeGuestIntentIfShown(page, config);
  await page.waitForURL(/\/welcome\?.*step=info/, { timeout: config.navTimeoutMs * 2 });
}

export async function openGuestRouteStep(page: Page, config: E2eConfig): Promise<void> {
  await page.goto(`${e2eGuestAppUrl(config, '/welcome')}?step=route`);
  await page.getByText('From which location are you arriving?').waitFor({
    timeout: config.navTimeoutMs,
  });
}

export async function openConcierge(page: Page, config: E2eConfig): Promise<void> {
  await page.goto(e2eGuestAppUrl(config, '/'));
}

export async function openAnonymousConcierge(page: Page, config: E2eConfig): Promise<void> {
  await page.context().clearCookies();
  await openConcierge(page, config);
}
