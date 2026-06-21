import { defineConfig, devices } from '@playwright/test';
import { e2eGuestAppUrl, loadE2eConfig } from './e2e/fixtures';

const config = loadE2eConfig();
const guestOrigin = e2eGuestAppUrl(config, '/').replace(/\/en\/?$/, '');

export default defineConfig({
  testDir: './e2e/smoke',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  globalSetup: './e2e/global-setup.ts',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: guestOrigin,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev:next',
    url: guestOrigin,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
