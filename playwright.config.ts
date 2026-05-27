import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.E2E_PORT ?? '3100';

if (!/^\d+$/.test(e2ePort)) {
  throw new Error(`E2E_PORT must be a numeric port, received: ${e2ePort}`);
}

const e2eBaseURL = `http://localhost:${e2ePort}`;
const skipWebServer = process.env.E2E_SKIP_WEB_SERVER === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: e2eBaseURL,
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
  webServer: skipWebServer
    ? undefined
    : {
        command: `npm run generate:sound-list && node ./node_modules/next/dist/bin/next dev --port ${e2ePort}`,
        url: e2eBaseURL,
        reuseExistingServer: !process.env.CI,
        stdout: 'ignore',
        stderr: 'pipe',
        timeout: 120_000,
      },
});
