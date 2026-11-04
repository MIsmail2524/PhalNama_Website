import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end journey tests. They run against a production build on port 3100
 * with its own database (phalnama_test) so real data is never touched.
 *   npm run test:e2e
 */
const PORT = 3100;
// Local runs use installed Google Chrome; CI sets PW_CHANNEL=bundled to use Playwright's Chromium.
const channel = process.env.PW_CHANNEL === "bundled" ? undefined : process.env.PW_CHANNEL || "chrome";
const TEST_DB = process.env.E2E_DATABASE_URL ?? "postgresql://phalnama:phalnama@localhost:5432/phalnama_test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    channel,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { RATE_LIMIT_SCALE: "50", DATABASE_URL: TEST_DB, NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`, AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-secret-e2e-secret-e2e-secret-e2e-secret", NODE_ENV: "production" },
  },
});
