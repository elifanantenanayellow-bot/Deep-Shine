import { test, expect } from "@playwright/test";

// In demo mode (no DATABASE_URL — forced by playwright.config webServer env)
// the database-backed surface must redirect to the demo landing instead of
// rendering pages whose actions would crash without Postgres.
// Auth intents land on the demo role picker; the rest on the landing page.
const LEGACY_ROUTES: [string, string][] = [
  ["/login", "/signin"],
  ["/register", "/signin"],
  ["/onboarding", "/"],
  ["/app", "/"],
  ["/app/calendar", "/"],
  ["/admin", "/"],
  ["/book/sourire", "/"],
];

for (const [route, target] of LEGACY_ROUTES) {
  test(`demo mode redirects ${route} to ${target}`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(target);
    if (target === "/") {
      await expect(
        page.getByRole("heading", { name: /booking platform/i }),
      ).toBeVisible();
    } else {
      await expect(page.getByText("Explore the demo")).toBeVisible();
    }
  });
}

test("demo mode redirects legacy API routes away", async ({ request }) => {
  const resp = await request.get("/api/public/sourire/availability", {
    maxRedirects: 0,
  });
  expect([301, 302, 307, 308]).toContain(resp.status());
});
