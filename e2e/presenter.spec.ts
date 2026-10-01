import { test, expect } from "@playwright/test";
import { collectErrors, waitForHydration } from "./helpers";

// Presenter mode (?presenter=1) makes payments deterministic so a live
// pitch can never randomly hit the failure screen.
test("presenter mode forces payment success", async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto("/patient?presenter=1", { waitUntil: "networkidle" });
  await waitForHydration(page);
  await expect(page.getByText("Presenter", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /book appointment/i }).first().click();
  await page.getByRole("button", { name: /dentistry/i }).click();
  await page
    .locator("text=Choose a doctor")
    .locator("xpath=following-sibling::div//button")
    .first()
    .click();
  await page
    .locator("text=Pick a date")
    .locator("xpath=following-sibling::div//button")
    .nth(1)
    .click();
  await page
    .locator('div[role="dialog"]')
    .locator("button:not([disabled])", { hasText: /^\d{2}:\d{2}$/ })
    .first()
    .click();
  await page.getByRole("button", { name: /continue to payment/i }).click();
  await expect(page.getByText("Presenter mode — payment will succeed.")).toBeVisible();
  await page.getByRole("button", { name: /^Pay / }).click();

  // Deterministic outcome: always success, never pending/failed.
  await expect(page.getByText("Payment successful")).toBeVisible({
    timeout: 8000,
  });
  await page.getByRole("button", { name: /^Continue$/ }).click();
  await expect(page.getByText("Appointment booked!")).toBeVisible();

  expect(errors).toEqual([]);
});

test("?presenter=0 disarms presenter mode", async ({ page }) => {
  await page.goto("/patient?presenter=1", { waitUntil: "networkidle" });
  await waitForHydration(page);
  await expect(page.getByText("Presenter", { exact: true })).toBeVisible();

  await page.goto("/patient?presenter=0", { waitUntil: "networkidle" });
  await waitForHydration(page);
  await expect(page.getByText("Presenter", { exact: true })).toHaveCount(0);
});
