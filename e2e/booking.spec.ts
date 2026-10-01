import { test, expect } from "@playwright/test";
import { collectErrors, waitForHydration } from "./helpers";

test("full booking lifecycle: book → pay → confirm → reschedule → cancel", async ({
  page,
}) => {
  const errors = collectErrors(page);

  // --- Book from the patient dashboard ---
  await page.goto("/patient", { waitUntil: "networkidle" });
  await waitForHydration(page);
  await page.getByRole("button", { name: /book appointment/i }).first().click();
  await expect(page.getByText("What do you need?")).toBeVisible();

  await page.getByRole("button", { name: /dentistry/i }).click();
  await expect(page.getByText("Choose a doctor")).toBeVisible();
  await page
    .locator("text=Choose a doctor")
    .locator("xpath=following-sibling::div//button")
    .first()
    .click();

  await expect(page.getByText("Pick a date")).toBeVisible();
  await page
    .locator("text=Pick a date")
    .locator("xpath=following-sibling::div//button")
    .nth(1)
    .click();

  await expect(page.getByText(/Available times/)).toBeVisible();
  const slot = page
    .locator("button:not([disabled])", { hasText: /^\d{2}:\d{2}$/ })
    .first();
  await slot.click();
  await expect(page.getByText("Reason for visit")).toBeVisible();

  await page.getByRole("button", { name: /continue to payment/i }).click();
  await expect(page.getByText("Choose a payment method")).toBeVisible();
  await page.getByRole("button", { name: /^Pay / }).click();

  // Outcome is simulated (paid/pending/failed) — handle every branch.
  await page.waitForSelector("text=/Payment (successful|pending|failed)/", {
    timeout: 10_000,
  });
  const continueAnyway = page.getByRole("button", { name: /continue anyway/i });
  if (await continueAnyway.isVisible().catch(() => false)) {
    await continueAnyway.click();
  } else {
    await page.getByRole("button", { name: /^Continue$/ }).click();
  }
  await expect(page.getByText("Appointment booked!")).toBeVisible();
  await page.getByRole("button", { name: /^Done$/ }).click();

  // --- Appears in the appointments list ---
  await page.goto("/patient/appointments", { waitUntil: "networkidle" });
  await waitForHydration(page);
  const upcomingTab = await page
    .getByRole("button", { name: /Upcoming \(\d+\)/ })
    .textContent();
  expect(upcomingTab).toMatch(/\((?!0\))\d+\)/);

  // --- Reschedule ---
  await page.getByRole("button", { name: /reschedule/i }).first().click();
  await expect(page.getByText("Pick a new date")).toBeVisible();
  await page
    .locator("text=Pick a new date")
    .locator("xpath=following-sibling::div//button")
    .nth(2)
    .click();
  await expect(page.getByText("New time")).toBeVisible();
  await page
    .locator("button:not([disabled])", { hasText: /^\d{2}:\d{2}$/ })
    .first()
    .click();
  await expect(page.getByText("Appointment rescheduled")).toBeVisible();

  // --- Cancel ---
  await page.getByRole("button", { name: /^Cancel$/ }).first().click();
  await expect(page.getByText("Cancel appointment?")).toBeVisible();
  await page.getByRole("button", { name: /^Cancel appointment$/ }).click();
  await expect(page.getByText("Appointment cancelled")).toBeVisible();

  expect(errors, "console errors during booking lifecycle").toEqual([]);
});
