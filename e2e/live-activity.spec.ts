import { test, expect } from "@playwright/test";
import { collectErrors, waitForHydration } from "./helpers";

// The clinic dashboard simulates online bookings arriving live: the first
// one fires ~8s after the dashboard opens.
test("an online booking arrives on the clinic dashboard by itself", async ({
  page,
}) => {
  const errors = collectErrors(page);

  await page.goto("/clinic", { waitUntil: "networkidle" });
  await waitForHydration(page);

  const countAppointments = () =>
    page.evaluate(() => {
      const raw = localStorage.getItem("deepshine-demo-v4");
      if (!raw) return -1;
      return (JSON.parse(raw) as { data: { appointments: unknown[] } }).data
        .appointments.length;
    });
  const before = await countAppointments();
  expect(before).toBeGreaterThan(0);

  // Toast announces the arrival (fires ~8s in; allow slack).
  await expect(page.getByText(/New online booking/).first()).toBeVisible({
    timeout: 15000,
  });

  await expect
    .poll(countAppointments, { timeout: 5000 })
    .toBeGreaterThan(before);

  expect(errors).toEqual([]);
});
