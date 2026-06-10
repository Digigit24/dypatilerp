import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E config for the DY Patil ERP frontend.
 *
 * Requires the backend API (http://localhost:5000) and a seeded database to be
 * running for the authenticated journeys to pass. The frontend dev server is
 * started automatically via `webServer` below.
 *
 * Set credentials via env: E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD
 * (and E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: process.env.E2E_BASE_URL || 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
