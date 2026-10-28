import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices["Desktop Chrome"],
    // Locally use the installed Chrome (no browser download); CI installs Playwright's Chromium.
    channel: process.env.CI ? undefined : "chrome",
    baseURL: "http://127.0.0.1:3100",
  },
  webServer: {
    command: "npm run build && npx next start -p 3100 -H 127.0.0.1",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
