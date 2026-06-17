import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Headless Chromium is unstable under this sandbox's CPU emulation (intermittent
  // launch-time core dumps). Retries absorb those environmental crashes; they are not
  // masking real assertion failures. On a native host this can drop back to 0.
  retries: 2,
  workers: process.env.CI ? '50%' : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--no-sandbox', '--disable-gpu', '--single-process', '--no-zygote', '--in-process-gpu'],
        },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 14'],
        defaultBrowserType: 'chromium',
        launchOptions: {
          args: ['--no-sandbox', '--disable-gpu', '--single-process', '--no-zygote', '--in-process-gpu'],
        },
      },
    },
  ],
  webServer: {
    command: `pnpm dev --host 0.0.0.0 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
