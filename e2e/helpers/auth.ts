import type { Page } from '@playwright/test';
import type { E2eConfig } from '../fixtures';
import { e2eAdminUrl } from '../fixtures';

export async function loginAsAdmin(page: Page, config: E2eConfig): Promise<void> {
  await page.goto(e2eAdminUrl(config, '/admin/login'));
  await page.getByLabel('Admin password').fill(config.adminPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/admin\/tenants/, { timeout: config.navTimeoutMs });
}
