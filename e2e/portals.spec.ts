import { test, expect } from "@playwright/test";
import { collectErrors, waitForHydration } from "./helpers";

test("doctor dashboard renders charts and today's schedule", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/doctor", { waitUntil: "networkidle" });
  await waitForHydration(page);
  expect(await page.locator("svg.recharts-surface").count()).toBeGreaterThan(0);
  await expect(page.getByText("Today's schedule")).toBeVisible();
  expect(errors).toEqual([]);
});

test("clinic admin can add a doctor and the roster updates", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/clinic/doctors", { waitUntil: "networkidle" });
  await waitForHydration(page);

  const before = await page.locator("text=/practitioners at/").textContent();
  await page.getByRole("button", { name: /add doctor/i }).first().click();
  await expect(page.getByText("Add a doctor")).toBeVisible();
  await page.getByPlaceholder("Dr. Naina Rakoto").fill("Dr. E2E Test");
  await page
    .locator("div[role=dialog] button", { hasText: "Add doctor" })
    .click();
  await expect(page.getByText("Dr. E2E Test").first()).toBeVisible();
  const after = await page.locator("text=/practitioners at/").textContent();
  expect(before).not.toEqual(after);
  expect(errors).toEqual([]);
});

test("clinic appointments actions and notification bell work", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/clinic/appointments", { waitUntil: "networkidle" });
  await waitForHydration(page);

  const completeBtn = page.getByRole("button", { name: /^Complete$/ }).first();
  if (await completeBtn.isVisible().catch(() => false)) {
    await completeBtn.click();
  }

  await page.locator("button[aria-label=Notifications]").first().click();
  await expect(page.getByText("Notifications").first()).toBeVisible();
  expect(errors).toEqual([]);
});
