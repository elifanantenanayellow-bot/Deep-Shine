import { test, expect } from "@playwright/test";
import { collectErrors, waitForHydration } from "./helpers";

// Clicking a concrete free slot on the doctor profile must carry that slot
// into the booking wizard (review step), not restart the flow.
test("profile slot click preselects day and time in the wizard", async ({
  page,
}) => {
  const errors = collectErrors(page);

  await page.goto("/patient/doctors/dr-1", { waitUntil: "networkidle" });
  await waitForHydration(page);

  const freeSlots = page.locator(
    "button:not([disabled])",
    { hasText: /^\d{2}:\d{2}$/ },
  );
  const count = await freeSlots.count();
  // The preview only lists today's slots; outside working hours (late
  // evening / Sunday) there is nothing clickable — skip rather than flake.
  test.skip(count === 0, "no free slots left today on this doctor's preview");

  const time = (await freeSlots.first().textContent())?.trim() ?? "";
  await freeSlots.first().click();

  // Wizard must open directly at the review step with the clicked time.
  const dialog = page.locator('div[role="dialog"]');
  await expect(dialog.getByText("Reason for visit")).toBeVisible();
  await expect(dialog.getByText(time)).toBeVisible();

  expect(errors).toEqual([]);
});
