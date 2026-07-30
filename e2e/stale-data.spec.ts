import { test, expect } from "@playwright/test";
import { waitForHydration } from "./helpers";
import { STORAGE_KEY } from "../src/demo/storage-key";

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
      tickets: [],
      threads: [],
      messages: [],
      costs: [],
      notes: [],
    },
  };

  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify(staleEnvelope)] as const,
  );

  await page.goto("/patient/doctors", { waitUntil: "networkidle" });
  await waitForHydration(page);

  // A fresh seed has 20 doctors; the stale empty payload had none.
  await expect(page.getByText(/20 doctors across/)).toBeVisible();

  // And the persisted envelope is now stamped today.
  const stamp = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { seededAt: string }).seededAt : null;
  }, STORAGE_KEY);
  expect(stamp).toBe(new Date().toISOString().slice(0, 10));
});
