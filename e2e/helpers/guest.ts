import type { Page } from '@playwright/test';
import type { E2eConfig } from '../fixtures';
import { e2eGuestAppUrl, e2eGuestCheckInUrl } from '../fixtures';

export async function checkInWithPin(page: Page, config: E2eConfig): Promise<void> {
  await page.goto(e2eGuestCheckInUrl(config));
  await page.getByLabel('Check-in PIN').fill(config.guestPin);
  await page.waitForURL(/\/welcome/, { timeout: config.navTimeoutMs * 2 });
}

export async function openGuestRouteStep(page: Page, config: E2eConfig): Promise<void> {
  await page.goto(`${e2eGuestAppUrl(config, '/welcome')}?step=route`);
  await page.getByText('From which location are you arriving?', { timeout: config.navTimeoutMs }).waitFor();
}

export async function openConcierge(page: Page, config: E2eConfig): Promise<void> {
  await page.goto(e2eGuestAppUrl(config, '/'));
}
