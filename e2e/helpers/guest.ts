import type { Page } from '@playwright/test';
import type { E2eConfig } from '../fixtures';
import { e2eGuestAppUrl, e2eGuestCheckInUrl } from '../fixtures';
import { readSmokeSession } from '../lib/smokeRuntime';

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
  // Prefer live session file — module-level config can be stale if provision re-ran.
  const guestPin = readSmokeSession()?.guestPin?.trim() || config.guestPin?.trim();
  if (!guestPin) {
    throw new Error('Guest PIN is missing. global-setup should provision a smoke stay before tests run.');
  }

  await page.goto(e2eGuestCheckInUrl(config));
  await page.getByLabel('Check-in PIN').fill(guestPin);

  const outcomeTimeoutMs = config.navTimeoutMs * 2;
  const pinError = page.getByText(/PIN not recognized|Access revoked|Too many tries/i);
  const activating = page.getByText(/Checking PIN/i);

  const navigated = page.waitForURL(/\/(check-in\/intent|welcome)/, {
    timeout: outcomeTimeoutMs,
  });
  const rejected = pinError.waitFor({ state: 'visible', timeout: outcomeTimeoutMs }).then(async () => {
    const message = (await pinError.first().textContent())?.trim() || 'PIN check-in rejected';
    throw new Error(`Guest PIN check-in failed: ${message}`);
  });
  // Outcome-based race: spinner is only a stuck signal, never success.
  const stuck = (async () => {
    const shown = await activating
      .waitFor({ state: 'visible', timeout: outcomeTimeoutMs })
      .then(() => true)
      .catch(() => false);
    if (!shown) {
      await new Promise(() => {});
      return;
    }
    try {
      await activating.waitFor({ state: 'hidden', timeout: config.navTimeoutMs });
    } catch {
      throw new Error(
        'PIN activation stuck (server action pending). Restart next dev after HMR, then re-run smoke.'
      );
    }
    await new Promise(() => {});
  })();

  await Promise.race([navigated, rejected, stuck]);

  await completeGuestIntentIfShown(page, config);
  await page.waitForURL(/\/welcome\?.*step=info/, { timeout: outcomeTimeoutMs });
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
