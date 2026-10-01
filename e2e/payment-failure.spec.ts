import { test, expect } from "@playwright/test";
import { collectErrors, waitForHydration } from "./helpers";

// Force the payment simulation onto its failure branch by stubbing
// Math.random, then verify the honest recovery path: the user can book
// anyway and pay at the clinic (appointment carries a pending payment).
test("failed payment offers book-and-pay-at-clinic", async ({ page }) => {
  const errors = collectErrors(page);
  await page.addInitScript(() => {
    Math.random = () => 0.99; // simulatePayment: r >= 0.94 → "failed"
  });

  await page.goto("/patient", { waitUntil: "networkidle" });
  await waitForHydration(page);
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
  await page.getByRole("button", { name: /^Pay / }).click();

  await expect(page.getByText("Payment failed")).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/pay at the clinic/)).toBeVisible();

  await page.getByRole("button", { name: /book & pay at clinic/i }).click();
  await expect(page.getByText("Appointment booked!")).toBeVisible();
  await expect(
    page.getByText(/Payment pending — you can pay at the clinic/),
  ).toBeVisible();

  expect(errors).toEqual([]);
});
