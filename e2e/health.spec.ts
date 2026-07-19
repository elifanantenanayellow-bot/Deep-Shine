import { test, expect } from "@playwright/test";

// Uptime monitors point at /api/health. In the e2e environment DATABASE_URL
// is forced empty, so the endpoint must report demo mode without touching a
// database. Full-mode (db round-trip) verification is part of the M0 runtime
// check against a real Postgres (see docs/runbooks/deploy.md).
test("health endpoint reports ok in demo mode", async ({ request }) => {
  const resp = await request.get("/api/health");
  expect(resp.status()).toBe(200);
  const body = await resp.json();
  expect(body.ok).toBe(true);
  expect(body.mode).toBe("demo");
  expect(body.db).toBe("not-configured");
});
