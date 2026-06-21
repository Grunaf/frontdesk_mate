import { test, expect } from '@playwright/test';
import { loadE2eConfig, e2eAdminUrl } from '../fixtures';
import { loginAsAdmin } from '../helpers/auth';

const config = loadE2eConfig();

test.describe('admin smoke', () => {
  test('logs in and opens tenants list', async ({ page }) => {
    await loginAsAdmin(page, config);
    await expect(page.getByRole('heading', { name: 'Tenants' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'New tenant' })).toBeVisible();
  });

  test('opens tenant edit form for configured slug', async ({ page }) => {
    await loginAsAdmin(page, config);
    await page.goto(e2eAdminUrl(config, `/admin/tenants/${config.tenantSlug}`));
    await expect(page.getByRole('heading', { name: `Edit: ${config.tenantSlug}` })).toBeVisible();
    await expect(page.locator('input[name="cityPackId"]')).toHaveValue(config.cityPackId);
  });
});
