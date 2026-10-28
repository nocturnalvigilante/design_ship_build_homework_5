import { defineConfig, devices } from "@playwright/test";

// The test process loads the Clerk keys from .env.local so it can sign in the
// two test users. The keys never appear in the test code or its output.
try {
  process.loadEnvFile(".env.local");
} catch {
  // On CI the keys come from real environment variables instead.
}

const PORT = 3000;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global.setup.ts",
  timeout: 120_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    // Point BASE_URL at the live site (or a running dev server) to test that instead.
    baseURL: process.env.BASE_URL ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `npx next dev -p ${PORT}`,
        url: `http://localhost:${PORT}/sign-in`,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
