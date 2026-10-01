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

const JWT_SECRET =
  process.env.JWT_SECRET ?? "e2e-only-secret-value-thirty-two-characters-min";

// Database used by the foundation (DB-backed) test server and its specs.
export const FOUNDATION_DB_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/deepshine_deploy?schema=public";

export default defineConfig({
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    {
      // The zero-config demo, exactly as a fresh clone runs it.
      name: "demo",
      testDir: "./e2e",
      use: { baseURL: "http://localhost:3000" },
    },
    {
      // The database-backed foundation (concurrency, isolation, auth).
      name: "foundation",
      testDir: "./e2e-foundation",
      use: { baseURL: "http://localhost:3003" },
    },
  ],
  webServer: [
    {
      command: "npm run start",
      url: "http://localhost:3000",
      // Never reuse: a server started against an older .next serves stale
      // chunks after a rebuild and fails tests for reasons unrelated to the
      // code under test (observed during M1 as a spurious 20x500 race
      // failure). Tests must exercise the artifact just built.
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        JWT_SECRET,
        // Force demo mode: empty is "set" for Next's env loading (so a local
        // .env can't leak a database in), but falsy for the middleware gate.
        DATABASE_URL: "",
      },
    },
    {
      command: "npx next start -p 3003",
      // Readiness probe must not depend on the database: /api/health returns
      // 503 when Postgres is down, which would block even demo-only runs.
      // The DB-dependent specs assert health themselves.
      url: "http://localhost:3003/",
      // Never reuse: a server started against an older .next serves stale
      // chunks after a rebuild and fails tests for reasons unrelated to the
      // code under test (observed during M1 as a spurious 20x500 race
      // failure). Tests must exercise the artifact just built.
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        JWT_SECRET,
        DATABASE_URL: FOUNDATION_DB_URL,
      },
    },
  ],
});
