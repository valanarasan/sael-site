import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  ...(process.env.CI ? { workers: 2 } : {}),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    // Functional and accessibility checks run on the finished, static page.
    // tests/e2e/motion.spec.ts turns motion back on to test the animations themselves.
    reducedMotion: 'reduce',
  },
  // The two widths CLAUDE.md asks us to check against v5.
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  // Test the production build. Skipped when PLAYWRIGHT_BASE_URL points at a preview deploy.
  ...(process.env.PLAYWRIGHT_BASE_URL
    ? {}
    : {
        webServer: {
          // The real production server, so the tests see the same headers visitors will.
          command: 'npm run build && npm start',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          // The enquiry endpoint runs with in-memory stand-ins: nothing is emailed or written to
          // the real sheet. The rate limit is raised so tests don't trip it (it's unit-tested).
          env: { PORT: String(PORT), LEADS_DRIVER: 'memory', ENQUIRY_RATE_LIMIT_MAX: '1000' },
        },
      }),
});
