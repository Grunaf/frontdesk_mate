import { test, expect } from '@playwright/test';
import { loadE2eConfig, e2eAdminUrl } from '../fixtures';
import { loginAsAdmin } from '../helpers/auth';

const config = loadE2eConfig();

test.describe('city packs smoke', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page, config);
  });

  test('lists sarajevo pack as ready', async ({ page }) => {
    await page.goto(e2eAdminUrl(config, '/admin/city-packs'));
    await expect(page.getByRole('heading', { name: 'City packs' })).toBeVisible();

    const sarajevoRow = page.getByRole('link').filter({ hasText: config.cityPackId });
    await expect(sarajevoRow).toBeVisible();
    await expect(sarajevoRow).toContainText('Ready');
    await expect(sarajevoRow).toContainText('Ready ✓');
  });
});
