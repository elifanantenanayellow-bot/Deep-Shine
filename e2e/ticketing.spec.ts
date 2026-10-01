import { test, expect } from "@playwright/test";
import { collectErrors, waitForHydration } from "./helpers";
import { STORAGE_KEY } from "../src/demo/storage-key";

// Walk-in ticketing is the new front-desk flow: the receptionist issues a
// ticket, the platform routes it to whoever is free soonest, books the slot
// and notifies that provider. These tests assert the whole chain, not just
// that a toast appeared.

async function firstPatientName(page: import("@playwright/test").Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw).data as { patients: { name: string }[] };
    return data.patients[0]?.name ?? null;
  }, STORAGE_KEY);
}

test("issuing a walk-in ticket routes it, books a slot and notifies the provider", async ({
  page,
}) => {
  const errors = collectErrors(page);

  await page.goto("/clinic/reception", { waitUntil: "networkidle" });
  await waitForHydration(page);

  // The desk sees the routing decision before committing to it.
  const preview = page.getByTestId("routing-preview");
  await expect(preview).toContainText(/Will route to/);
  const previewText = (await preview.textContent()) ?? "";
  const routedDoctor = previewText.match(/Will route to\s*(Dr\.[^\n]*?)\s*(today|lun|mar|mer|jeu|ven|sam|dim)/)?.[1];
  expect(routedDoctor, "preview names a provider").toBeTruthy();

  const before = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    const data = JSON.parse(raw!).data as {
      appointments: unknown[];
      tickets: unknown[];
    };
    return { appointments: data.appointments.length, tickets: data.tickets.length };
  }, STORAGE_KEY);

  const patient = await firstPatientName(page);
  expect(patient).toBeTruthy();

  await page.getByLabel("Patient").fill(patient!);
  await page.getByRole("button", { name: /Issue ticket & notify provider/ }).click();

  // A ticket appears in the queue, with the email receipt visible.
  await expect(page.getByText(/^T-\d{3}$/).first()).toBeVisible();
  await expect(page.getByText(/Emailed .+@.+ at \d{2}:\d{2}/).first()).toBeVisible();

  // And the store really gained both a ticket and the booking behind it.
  const after = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    const data = JSON.parse(raw!).data as {
      appointments: { id: string; doctorId: string }[];
      tickets: {
        appointmentId: string;
        doctorId: string;
        notifiedAt: string | null;
        status: string;
      }[];
      doctors: { id: string; name: string; clinicId: string }[];
    };
    const ticket = data.tickets[0];
    const appt = data.appointments.find((a) => a.id === ticket.appointmentId);
    const doctor = data.doctors.find((d) => d.id === ticket.doctorId);
    return {
      appointments: data.appointments.length,
      tickets: data.tickets.length,
      hasBooking: Boolean(appt),
      sameProvider: appt?.doctorId === ticket.doctorId,
      notified: Boolean(ticket.notifiedAt),
      status: ticket.status,
      doctorName: doctor?.name,
      doctorClinic: doctor?.clinicId,
    };
  }, STORAGE_KEY);

  expect(after.tickets).toBe(before.tickets + 1);
  expect(after.appointments).toBe(before.appointments + 1);
  expect(after.hasBooking).toBe(true);
  expect(after.sameProvider).toBe(true);
  expect(after.notified).toBe(true);
  expect(after.status).toBe("routed");
  // Routing never leaves the tenant.
  expect(after.doctorClinic).toBe("cl-1");
  // …and it honoured the preview it showed the receptionist.
  expect(routedDoctor).toContain(after.doctorName!);

  expect(errors).toEqual([]);
});

test("a routed ticket lands on the shared team calendar", async ({ page }) => {
  await page.goto("/clinic/reception", { waitUntil: "networkidle" });
  await waitForHydration(page);

  const patient = await firstPatientName(page);
  await page.getByLabel("Patient").fill(patient!);
  await page.getByRole("button", { name: /Issue ticket & notify provider/ }).click();
  await expect(page.getByText(/^T-\d{3}$/).first()).toBeVisible();

  const routed = await page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key)!).data as {
      tickets: { number: string; appointmentId: string }[];
      appointments: { id: string; start: string }[];
    };
    const t = data.tickets[0];
    const a = data.appointments.find((x) => x.id === t.appointmentId)!;
    return { number: t.number, sameDay: new Date(a.start).toDateString() === new Date().toDateString() };
  }, STORAGE_KEY);

  await page.goto("/clinic/calendar", { waitUntil: "networkidle" });
  await waitForHydration(page);

  if (routed.sameDay) {
    await expect(page.getByText(`${routed.number} walk-in`).first()).toBeVisible();
  } else {
    // Routed to a later day — step forward until the block shows up.
    let found = false;
    for (let i = 0; i < 7 && !found; i++) {
      await page.getByRole("button", { name: "Next day" }).click();
      await page.waitForTimeout(250);
      found = await page.getByText(`${routed.number} walk-in`).first().isVisible();
    }
    expect(found, "walk-in block appears on its routed day").toBe(true);
  }
});

test("cancelling a ticket frees the appointment again", async ({ page }) => {
  await page.goto("/clinic/reception", { waitUntil: "networkidle" });
  await waitForHydration(page);

  const patient = await firstPatientName(page);
  await page.getByLabel("Patient").fill(patient!);
  await page.getByRole("button", { name: /Issue ticket & notify provider/ }).click();
  await expect(page.getByText(/^T-\d{3}$/).first()).toBeVisible();

  await page.getByRole("button", { name: "Cancel", exact: true }).first().click();

  await expect
    .poll(
      () =>
        page.evaluate((key) => {
          const data = JSON.parse(localStorage.getItem(key)!).data as {
            tickets: { status: string; appointmentId: string }[];
            appointments: { id: string; status: string }[];
          };
          const t = data.tickets[0];
          const a = data.appointments.find((x) => x.id === t.appointmentId);
          return `${t.status}/${a?.status}`;
        }, STORAGE_KEY),
      { timeout: 5000 },
    )
    .toBe("cancelled/cancelled");
});
