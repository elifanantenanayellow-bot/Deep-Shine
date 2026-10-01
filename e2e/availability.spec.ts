import { test, expect } from "@playwright/test";
import { collectErrors, waitForHydration } from "./helpers";

// Proves the doctor's availability settings actually drive what patients can
// book: Monday offers slots → doctor closes Monday → Monday offers none.
test("closing a weekday removes its booking slots for patients", async ({
  page,
}) => {
  const errors = collectErrors(page);

  // dr-1's booking flow is reached via their profile (wizard opens at the
  // date step with the doctor preset). fr-FR short weekday for Monday: "lun."
  const openMonday = async () => {
    await page.goto("/patient/doctors/dr-1", { waitUntil: "networkidle" });
    await waitForHydration(page);
    await page.getByRole("button", { name: /book appointment/i }).click();
    await expect(page.getByText("Pick a date")).toBeVisible();
    await page
      .locator("text=Pick a date")
      .locator("xpath=following-sibling::div//button", { hasText: /lun\./ })
      .first()
      .click();
    await expect(page.getByText(/Available times/)).toBeVisible();
  };

  // 1. Monday initially offers slots. Scope to the wizard dialog so the
  // profile page's availability preview behind the modal is not counted.
  await openMonday();
  const slotButtons = page
    .locator('div[role="dialog"]')
    .locator("button", { hasText: /^\d{2}:\d{2}$/ });
  expect(await slotButtons.count()).toBeGreaterThan(0);

  // 2. Doctor closes Monday (same browser context → same demo store).
  await page.goto("/doctor/availability", { waitUntil: "networkidle" });
  await waitForHydration(page);
  await page.locator('button[aria-label="Monday open"]').click();
  await expect(page.locator('button[aria-label="Monday closed"]')).toBeVisible();

  // 3. Monday now offers no slots and explains why.
  await openMonday();
  expect(await slotButtons.count()).toBe(0);
  await expect(page.getByText(/isn't working this day/)).toBeVisible();

  expect(errors).toEqual([]);
});

// Time off blocks booking for the covered period.
test("adding time off blocks those days for patients", async ({ page }) => {
  const errors = collectErrors(page);

  // Add time off covering the next 14 days (the wizard's whole date range).
  await page.goto("/doctor/availability", { waitUntil: "networkidle" });
  await waitForHydration(page);
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 14);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  await page.getByPlaceholder("Reason (e.g. vacation)").fill("E2E vacation");
  const dateInputs = page.locator('input[type="date"]');
  await dateInputs.nth(0).fill(iso(from));
  await dateInputs.nth(1).fill(iso(to));
  await page.getByRole("button", { name: /add time off/i }).click();
  await expect(page.getByText("E2E vacation")).toBeVisible();

  // Every selectable day in dr-1's wizard now has zero slots.
  await page.goto("/patient/doctors/dr-1", { waitUntil: "networkidle" });
  await waitForHydration(page);
  await page.getByRole("button", { name: /book appointment/i }).click();
  await expect(page.getByText("Pick a date")).toBeVisible();
  const dayButtons = page
    .locator("text=Pick a date")
    .locator("xpath=following-sibling::div//button");
  await dayButtons.nth(2).click();
  await expect(page.getByText(/Available times/)).toBeVisible();
  expect(
    await page
      .locator('div[role="dialog"]')
      .locator("button", { hasText: /^\d{2}:\d{2}$/ })
      .count(),
  ).toBe(0);

  expect(errors).toEqual([]);
});
