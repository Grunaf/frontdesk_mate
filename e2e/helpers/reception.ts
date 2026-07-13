import { expect, type Page } from '@playwright/test';
import { e2eReceptionUrl, type E2eConfig } from '../fixtures';

export function hasReceptionSmokeCredentials(config: E2eConfig): boolean {
  return Boolean(config.receptionLogin && config.receptionPin);
}

export async function loginToReceptionDesk(page: Page, config: E2eConfig): Promise<void> {
  if (!config.receptionLogin || !config.receptionPin) {
    throw new Error('Set E2E_RECEPTION_LOGIN and E2E_RECEPTION_PIN in e2e/env.local for reception smoke.');
  }

  await page.goto(e2eReceptionUrl(config, '/login'));
  await page.getByLabel('Login').fill(config.receptionLogin);
  await page.getByLabel('PIN').fill(config.receptionPin);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
    timeout: config.navTimeoutMs,
  });
}
