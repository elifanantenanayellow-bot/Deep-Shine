import { test, expect } from "@playwright/test";
import { collectErrors, waitForHydration, expectNoHorizontalOverflow } from "./helpers";
import { STORAGE_KEY } from "../src/demo/storage-key";

// Cost tracking, manual payment entry and the customer card additions.

test("recording a cost moves profit and the ledger", async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto("/clinic/costs", { waitUntil: "networkidle" });
  await waitForHydration(page);

  const readProfit = () =>
    page.evaluate((key) => {
      const data = JSON.parse(localStorage.getItem(key)!).data as {
        costs: { amount: number; date: string }[];
      };
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return data.costs
        .filter((c) => new Date(c.date) >= from)
        .reduce((s, c) => s + c.amount, 0);
    }, STORAGE_KEY);

  const before = await readProfit();

  await page.getByLabel("Description").fill("Playwright test supplies");
  await page.getByLabel("Amount (MGA)").fill("250000");
  await page.getByRole("button", { name: "Add cost" }).click();

  await expect(page.getByText("Playwright test supplies")).toBeVisible();
  await expect.poll(readProfit, { timeout: 5000 }).toBe(before + 250000);

  expect(errors).toEqual([]);
});

test("recording a payment settles the invoice and its appointment", async ({ page }) => {
  await page.goto("/clinic/billing", { waitUntil: "networkidle" });
  await waitForHydration(page);

  // Work on the unpaid ledger so there is definitely something to settle.
  await page.getByRole("button", { name: "Unpaid", exact: true }).click();
  await page.waitForTimeout(300);

  const rows = page.getByRole("button", { name: "Record payment" });
  const available = await rows.count();
  test.skip(available === 0, "no unpaid invoices in this seed");

  const invoiceNumber = await page
    .locator("tbody tr")
    .first()
    .locator("td")
    .first()
    .textContent();

  await rows.first().click();
  await page.getByRole("button", { name: "MVola", exact: true }).first().click();

  await expect
    .poll(
      () =>
        page.evaluate(
          ([key, number]) => {
            const data = JSON.parse(localStorage.getItem(key as string)!).data as {
              invoices: { number: string; status: string; appointmentId: string }[];
              appointments: { id: string; paymentStatus: string; paymentMethod: string | null }[];
            };
            const inv = data.invoices.find((i) => i.number === number);
            if (!inv) return "missing";
            const appt = data.appointments.find((a) => a.id === inv.appointmentId);
            return `${inv.status}/${appt?.paymentStatus}/${appt?.paymentMethod}`;
          },
          [STORAGE_KEY, (invoiceNumber ?? "").trim()],
        ),
      { timeout: 5000 },
    )
    .toBe("paid/paid/MVola");
});

test("a provider note and follow-up persist on the customer card", async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto("/clinic/patients/pt-1", { waitUntil: "networkidle" });
  await waitForHydration(page);

  await expect(page.getByText(/Clinical access restricted to the care team/)).toBeVisible();

  const body = `Prefers late afternoon ${Date.now()}`;
  await page.getByPlaceholder(/Prefers morning appointments/).fill(body);
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText(body)).toBeVisible();

  // Follow-ups are a different kind and carry a due date.
  await page.getByRole("button", { name: "Follow-up", exact: true }).click();
  const followUp = `Call back about results ${Date.now()}`;
  await page.getByPlaceholder(/Call to check the treatment/).fill(followUp);
  await page.getByRole("button", { name: "Schedule follow-up" }).click();
  await expect(page.getByText(followUp)).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await waitForHydration(page);
  await expect(page.getByText(body)).toBeVisible();
  await expect(page.getByText(followUp)).toBeVisible();

  const kinds = await page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key)!).data as {
      notes: { patientId: string; kind: string }[];
    };
    return data.notes.filter((n) => n.patientId === "pt-1").map((n) => n.kind);
  }, STORAGE_KEY);
  expect(kinds).toContain("preference");
  expect(kinds).toContain("followup");

  expect(errors).toEqual([]);
});

test("the service summary opens and is printable", async ({ page }) => {
  await page.goto("/clinic/patients/pt-1", { waitUntil: "networkidle" });
  await waitForHydration(page);

  await page.getByRole("button", { name: "Service summary" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Provider signature")).toBeVisible();
  await expect(dialog.getByText("Patient signature")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Print" })).toBeVisible();
  // The print target must exist, or window.print() would output the app shell.
  await expect(page.locator("#print-area")).toHaveCount(1);
});

test("a provider cannot open a patient outside their care team", async ({ page }) => {
  await page.goto("/doctor/patients", { waitUntil: "networkidle" });
  await waitForHydration(page);

  // A patient this doctor has treated opens normally.
  await page.getByRole("link", { name: "Open" }).first().click();
  await waitForHydration(page);
  await expect(page.getByText(/You have access as Dr\./)).toBeVisible();

  // Find a patient the signed-in doctor has never seen and try the URL.
  const strangerId = await page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key)!).data as {
      appointments: { patientId: string; doctorId: string }[];
      patients: { id: string }[];
    };
    const mine = new Set(
      data.appointments.filter((a) => a.doctorId === "dr-1").map((a) => a.patientId),
    );
    return data.patients.find((p) => !mine.has(p.id))?.id ?? null;
  }, STORAGE_KEY);
  expect(strangerId).toBeTruthy();

  await page.goto(`/doctor/patients/${strangerId}`, { waitUntil: "networkidle" });
  await waitForHydration(page);
  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
});

test("costs and team calendar fit a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/clinic/costs", "/clinic/calendar", "/clinic/reception"]) {
    await page.goto(route, { waitUntil: "networkidle" });
    await waitForHydration(page);
    await expectNoHorizontalOverflow(page);
  }
});
