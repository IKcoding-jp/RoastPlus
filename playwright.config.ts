import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3100',
    timezoneId: 'Asia/Tokyo',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      testMatch: [/essential\.spec\.ts/, /production-packs\.spec\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/e2e-user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'a11y',
      testMatch: /accessibility\/a11y\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: {
    command: 'env-cmd -f e2e/e2e.env npm run dev -- --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
