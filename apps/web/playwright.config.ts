import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // CI runners are slower than a laptop: one retry, with a trace kept for the failing attempt so a flake can be read, not guessed.
  retries: process.env.CI ? 1 : 0,
  use: {
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    // Locally use the installed Chrome (no browser download); CI installs Playwright's Chromium.
    channel: process.env.CI ? undefined : "chrome",
    baseURL: "http://127.0.0.1:3100",
  },
  webServer: [
    {
      command: "cd ../api && uv run uvicorn app.main:app --host 127.0.0.1 --port 8000",
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: !process.env.CI,
      // The tests expect an API without an LLM key, so a key in the local .env must not leak in.
      env: { OPENROUTER_API_KEY: "" },
      timeout: 120_000,
    },
    {
      command: "npm run build && npx next start -p 3100 -H 127.0.0.1",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: !process.env.CI,
      // The production build is served over plain http here, so the cookies cannot be Secure.
      env: {
        API_URL: "http://127.0.0.1:8000",
        COOKIE_INSECURE: "1",
        // Public and baked in at build time. Shows the Google button; the tests replace Google's script.
        NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID: "e2e-client.apps.googleusercontent.com",
      },
      timeout: 240_000,
    },
  ],
});
