import { test, expect } from "@playwright/test";
import { collectErrors, waitForHydration } from "./helpers";

// The clinic portal is a tenant view: it must only surface Clinique
// Sourire's own doctors, appointments and finances.
test("clinic portal is scoped to its own clinic", async ({ page }) => {
  const errors = collectErrors(page);

  // Roster page shows only this clinic's practitioners.
  await page.goto("/clinic/doctors", { waitUntil: "networkidle" });
  await waitForHydration(page);
  await expect(
    page.getByText(/\d+ practitioners at Clinique Sourire/),
  ).toBeVisible();

  // Revenue page must not chart other clinics.
  await page.goto("/clinic/revenue", { waitUntil: "networkidle" });
  await waitForHydration(page);
  await expect(page.getByText("Revenue by doctor")).toBeVisible();
  await expect(page.getByText("Revenue by clinic")).toHaveCount(0);

  // Data-level check: every appointment in the store rendered by the clinic
  // list belongs to cl-1 (compare against the persisted demo store).
  await page.goto("/clinic/appointments", { waitUntil: "networkidle" });
  await waitForHydration(page);
  const foreignDoctorShown = await page.evaluate(() => {
    const raw = localStorage.getItem("deepshine-demo-v3");
    if (!raw) return "no-store";
    const data = JSON.parse(raw);
    const foreign = new Set(
      data.doctors
        .filter((d: { clinicId: string }) => d.clinicId !== "cl-1")
        .map((d: { name: string }) => d.name),
    );
    const cells = Array.from(document.querySelectorAll("td"));
    return cells.some((td) => foreign.has(td.textContent?.trim() ?? ""));
  });
  expect(foreignDoctorShown).toBe(false);

  expect(errors).toEqual([]);
});
