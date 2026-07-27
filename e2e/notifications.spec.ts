import { test, expect } from "@playwright/test";
import { waitForHydration } from "./helpers";

// Seeded notifications must reference people who actually exist in the
// generated dataset — no phantom doctors or patients.
test("seeded notifications reference real dataset entities", async ({
  page,
}) => {
  await page.goto("/patient", { waitUntil: "networkidle" });
  await waitForHydration(page);

  const phantom = await page.evaluate(() => {
    const raw = localStorage.getItem("deepshine-demo-v5");
    if (!raw) return "no-store";
    const data = JSON.parse(raw).data as {
      doctors: { name: string }[];
      patients: { name: string }[];
      notifications: { body: string }[];
    };
    const known = new Set([
      ...data.doctors.map((d) => d.name),
      ...data.patients.map((p) => p.name),
    ]);
    // Any "Dr. First Last" or bare "First Last" mention in seeded bodies
    // must exist. Extract candidate names conservatively: Dr.-prefixed.
    const missing: string[] = [];
    for (const n of data.notifications) {
      const matches = n.body.match(/Dr\.\s[A-ZÀ-Ý][\wà-ÿ'-]+(?:\s[A-ZÀ-Ý][\wà-ÿ'-]+)+/g) ?? [];
      for (const m of matches) {
        if (!known.has(m)) missing.push(m);
      }
    }
    return missing;
  });

  expect(phantom).toEqual([]);

  // The bell renders them.
  await page.locator('button[aria-label=Notifications]').click();
  await expect(page.getByText("Appointment reminder")).toBeVisible();
});
