import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  forbidOnly: !!process.env.CI,
  fullyParallel: true,

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  reporter: "list",
  retries: process.env.CI ? 2 : 0,
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts$/,
  timeout: 60_000,
  use: {
    actionTimeout: 15_000,
    baseURL: "http://localhost:3003",
    navigationTimeout: 15_000,
    trace: "on-first-retry",
  },

  webServer: {
    command: "bunx next dev -p 3003",
    reuseExistingServer: true,
    stderr: "pipe",
    stdout: "pipe",
    timeout: 120_000,
    url: "http://localhost:3003",
  },
  workers: process.env.CI ? 1 : 2,
});
