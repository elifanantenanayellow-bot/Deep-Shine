import { test, expect } from "@playwright/test";
import { waitForHydration } from "./helpers";

// Demo data seeded on a previous day decays (the "today" window drifts), so
// the store must detect a stale envelope and reseed automatically.
test("stale persisted demo data is reseeded on load", async ({ page }) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const staleEnvelope = {
    seededAt: yesterday.toISOString().slice(0, 10),
    // Deliberately empty dataset: if the app trusted it, no doctors would
    // render anywhere.
    data: {
      specialties: [],
      clinics: [],
      doctors: [],
      patients: [],
      appointments: [],
      schedules: [],
      notifications: [],
      records: [],
      prescriptions: [],
      invoices: [],
    },
  };

  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    ["deepshine-demo-v5", JSON.stringify(staleEnvelope)] as const,
  );

  await page.goto("/patient/doctors", { waitUntil: "networkidle" });
  await waitForHydration(page);

  // A fresh seed has 20 doctors; the stale empty payload had none.
  await expect(page.getByText(/20 doctors across/)).toBeVisible();

  // And the persisted envelope is now stamped today.
  const stamp = await page.evaluate(() => {
    const raw = localStorage.getItem("deepshine-demo-v5");
    return raw ? (JSON.parse(raw) as { seededAt: string }).seededAt : null;
  });
  expect(stamp).toBe(new Date().toISOString().slice(0, 10));
});
