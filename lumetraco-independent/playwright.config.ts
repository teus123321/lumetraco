import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "e2e.spec.ts",
  timeout: 30000,
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure", ...devices["Desktop Chrome"] },
  webServer: { command: "npm run dev -- --hostname 127.0.0.1", url: "http://127.0.0.1:3000", reuseExistingServer: !process.env.CI, timeout: 120000 },
});
