import { test, expect } from "@playwright/test";
import { waitForHydration } from "./helpers";

// Modals must trap keyboard focus: tabbing repeatedly never escapes the
// dialog into the page behind the overlay.
test("booking wizard traps focus while open", async ({ page }) => {
  await page.goto("/patient", { waitUntil: "networkidle" });
  await waitForHydration(page);
  await page.getByRole("button", { name: /book appointment/i }).first().click();
  await expect(page.getByText("What do you need?")).toBeVisible();

  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      return dialog ? dialog.contains(document.activeElement) : false;
    });
    expect(inside, `focus escaped the dialog on Tab #${i + 1}`).toBe(true);
  }

  // Escape closes and focus returns to the page.
  await page.keyboard.press("Escape");
  await expect(page.getByText("What do you need?")).toHaveCount(0);
});

// Toggles expose their state to assistive tech.
test("settings toggles expose aria-pressed", async ({ page }) => {
  await page.goto("/clinic/settings", { waitUntil: "networkidle" });
  await waitForHydration(page);
  const toggle = page.locator('button[aria-pressed]').first();
  await expect(toggle).toBeVisible();
  const before = await toggle.getAttribute("aria-pressed");
  await toggle.click();
  await expect(toggle).toHaveAttribute(
    "aria-pressed",
    before === "true" ? "false" : "true",
  );
});
