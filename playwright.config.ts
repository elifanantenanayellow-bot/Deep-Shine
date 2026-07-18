import { defineConfig, devices } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Resolve a Chromium binary in environments that pre-install browsers at a
// custom path (PLAYWRIGHT_BROWSERS_PATH) with a build number that may not
// match this Playwright version. Falls back to Playwright's own resolution.
function resolveChromium(): string | undefined {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return undefined;
  const candidates = readdirSync(root)
    .filter((d) => d.startsWith("chromium") && !d.includes("headless"))
    .map((d) => join(root, d, "chrome-linux", "chrome"))
    .filter((p) => existsSync(p));
  return candidates[0];
}

const executablePath = resolveChromium();

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      JWT_SECRET:
        process.env.JWT_SECRET ??
        "e2e-only-secret-value-thirty-two-characters-min",
    },
  },
});
