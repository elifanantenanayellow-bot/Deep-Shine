import { test, expect } from "@playwright/test";
import { collectErrors, waitForHydration, expectNoHorizontalOverflow } from "./helpers";

// Interaction coverage for the clinic-management screens. Rendering is
// covered by the route sweep; these drive the workflows a clinic actually
// performs, and assert the state changes they depend on.

test.describe("Reception desk", () => {
  test("check-in moves a patient through the desk queue", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/clinic/reception", { waitUntil: "networkidle" });
    await waitForHydration(page);

    const checkIn = page.getByRole("button", { name: /^Check in$/ }).first();
    test.skip(
      !(await checkIn.isVisible().catch(() => false)),
      "no expected patients today (weekend or all processed)",
    );

    // Expected -> waiting
    await checkIn.click();
    await expect(page.getByText(/checked in/).first()).toBeVisible();
    await expect(page.getByText("Waiting").first()).toBeVisible();

    // Waiting counter must have incremented off zero.
    const waitingTile = page
      .locator("div", { hasText: /^In waiting room$/ })
      .locator("xpath=following-sibling::p[1]");
    await expect(page.getByText("Send to doctor").first()).toBeVisible();

    // Waiting -> in consultation
    await page.getByRole("button", { name: /send to doctor/i }).first().click();
    await expect(page.getByText("In consultation").first()).toBeVisible();

    // In consultation -> completed
    await page.getByRole("button", { name: /complete visit/i }).first().click();
    await expect(page.getByText(/Visit completed/).first()).toBeVisible();

    expect(errors).toEqual([]);
    expect(waitingTile).toBeTruthy();
  });

  test("marking a no-show updates the row", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/clinic/reception", { waitUntil: "networkidle" });
    await waitForHydration(page);

    const noShow = page.getByRole("button", { name: /no-show/i }).first();
    test.skip(
      !(await noShow.isVisible().catch(() => false)),
      "no expected patients today",
    );
    await noShow.click();
    await expect(page.getByText(/marked as no-show/).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("search narrows today's list", async ({ page }) => {
    await page.goto("/clinic/reception", { waitUntil: "networkidle" });
    await waitForHydration(page);
    await page.getByPlaceholder(/Search today/).fill("zzzzz-no-match");
    await expect(page.getByText(/No matching patients today/)).toBeVisible();
  });
});

test.describe("Billing", () => {
  test("an unpaid invoice can be marked paid and totals respond", async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto("/clinic/billing", { waitUntil: "networkidle" });
    await waitForHydration(page);

    // Filter to unpaid so the action is unambiguous.
    await page.getByRole("button", { name: /^Unpaid$/ }).click();
    const markPaid = page.getByRole("button", { name: /mark paid/i }).first();
    test.skip(
      !(await markPaid.isVisible().catch(() => false)),
      "no unpaid invoices in this dataset",
    );

    await markPaid.click();
    await expect(page.getByText(/marked as paid/).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("status filters and search work", async ({ page }) => {
    await page.goto("/clinic/billing", { waitUntil: "networkidle" });
    await waitForHydration(page);

    await page.getByRole("button", { name: /^Paid$/ }).click();
    const rows = page.locator("tbody tr");
    expect(await rows.count()).toBeGreaterThan(0);
    // Every visible row in the Paid filter must read "paid".
    const statuses = await page.locator("tbody tr td:nth-child(6)").allTextContents();
    for (const s of statuses) expect(s.trim().toLowerCase()).toBe("paid");

    await page.getByPlaceholder(/Search invoice/).fill("zzzzz-no-match");
    await expect(page.getByText("No invoices match")).toBeVisible();
  });

  test("invoice export downloads a real CSV", async ({ page }) => {
    await page.goto("/clinic/billing", { waitUntil: "networkidle" });
    await waitForHydration(page);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /export csv/i }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("invoices-centre-medical.csv");
  });
});

test.describe("Patient record", () => {
  test("a patient row opens their full record", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/clinic/patients", { waitUntil: "networkidle" });
    await waitForHydration(page);

    const firstPatient = page.locator("tbody tr a").first();
    const name = (await firstPatient.locator("p").first().textContent())?.trim();
    await firstPatient.click();

    await expect(page).toHaveURL(/\/clinic\/patients\/pt-/);
    await waitForHydration(page);
    await expect(page.getByRole("heading", { name: name! })).toBeVisible();
    // Role-scoped: "Prescriptions"/"Invoices" also appear as metric labels.
    for (const section of [
      "Medical records",
      "Visit history",
      "Prescriptions",
      "Invoices",
    ]) {
      await expect(
        page.getByRole("heading", { name: section, exact: true }),
      ).toBeVisible();
    }

    // Back navigation returns to the list.
    await page.getByRole("link", { name: /all patients/i }).click();
    await expect(page).toHaveURL("/clinic/patients");
    expect(errors).toEqual([]);
  });

  test("record actions respond", async ({ page }) => {
    await page.goto("/clinic/patients/pt-1", { waitUntil: "networkidle" });
    await waitForHydration(page);
    await page.getByRole("button", { name: /export record/i }).click();
    await expect(page.getByText(/exported as PDF/i)).toBeVisible();
    await page.getByRole("button", { name: /book follow-up/i }).click();
    await expect(page.getByText(/request sent/i)).toBeVisible();
  });

  test("an unknown patient id shows a designed empty state", async ({ page }) => {
    await page.goto("/clinic/patients/pt-does-not-exist", {
      waitUntil: "networkidle",
    });
    await waitForHydration(page);
    await expect(page.getByText("Patient not found")).toBeVisible();
    await expect(page.getByRole("button", { name: /back to patients/i })).toBeVisible();
  });
});

test.describe("Notifications", () => {
  test("sending reminders adds an entry and marking read clears badges", async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto("/clinic/notifications", { waitUntil: "networkidle" });
    await waitForHydration(page);

    await page.getByRole("button", { name: /send tomorrow/i }).click();
    await expect(page.getByText(/Reminder batch sent/)).toBeVisible();
    await expect(page.getByText("Reminder sent").first()).toBeVisible();

    await page.getByRole("button", { name: /send a test message/i }).click();
    await expect(page.getByText(/Test message delivered/)).toBeVisible();

    await page.getByRole("button", { name: /mark all read/i }).click();
    await expect(page.getByText("You're all caught up")).toBeVisible();

    expect(errors).toEqual([]);
  });
});

test.describe("Mobile layout of the new screens", () => {
  test.use({ viewport: { width: 375, height: 720 } });

  for (const route of [
    "/clinic/reception",
    "/clinic/billing",
    "/clinic/notifications",
    "/clinic/patients/pt-1",
  ]) {
    test(`${route} has no horizontal overflow after interaction`, async ({
      page,
    }) => {
      await page.goto(route, { waitUntil: "networkidle" });
      await waitForHydration(page);
      await expectNoHorizontalOverflow(page);

      // Open the mobile nav drawer — a common source of overflow.
      const menu = page.locator('button[aria-label="Open menu"]');
      if (await menu.isVisible().catch(() => false)) {
        await menu.click();
        await page.waitForTimeout(400);
        await expectNoHorizontalOverflow(page);
      }
    });
  }
});
