import { expect, type Page } from '@playwright/test';
import { e2eReceptionUrl, type E2eConfig } from '../fixtures';

export async function loginToReceptionDesk(page: Page, config: E2eConfig): Promise<void> {
  if (!config.receptionDeskPin) {
    throw new Error('E2E_RECEPTION_DESK_PIN is required for reception desk tests');
  }

  await page.goto(e2eReceptionUrl(config, '/login'));
  await page.getByLabel('Desk PIN').fill(config.receptionDeskPin);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
    timeout: config.navTimeoutMs,
  });
}
