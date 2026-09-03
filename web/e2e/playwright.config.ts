import { defineConfig, devices } from "@playwright/test";

// Numbered spec files, fixtures/ for auth helpers, webServer auto-start —
// this app's session is a real httpOnly cookie, so Playwright's native
// storageState mechanism applies cleanly — see fixtures/auth.ts.
export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  // Tests run against one shared local dev server + Docker Postgres/SeaweedFS
  // (not a per-test sandbox), and several specs create/edit real rows (users,
  // scenarios, runs) — serialize instead of racing against a single backend.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "./playwright-report" }]],
  globalSetup: "./global-setup.ts",

  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev:all",
    cwd: "..",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
