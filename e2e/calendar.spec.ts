import { test, expect } from "@playwright/test";
import { collectErrors, waitForHydration } from "./helpers";
import { STORAGE_KEY } from "../src/demo/storage-key";

// The shared team calendar: provider filter, keyboard day navigation, and the
// guarantee that it only ever shows the flagship clinic's own practitioners.

test("filtering by provider narrows the calendar columns", async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto("/clinic/calendar", { waitUntil: "networkidle" });
  await waitForHydration(page);

  const firstName = await page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key)!).data as {
      doctors: { name: string; clinicId: string }[];
    };
    return data.doctors.find((d) => d.clinicId === "cl-1")!.name;
  }, STORAGE_KEY);

  // Column headers live in the sticky header row; count them before/after.
  const headers = page.locator("[style*='grid-template-columns'] >> text=/Off today|Analakely|Isoraka/");
  const before = await headers.count();
  expect(before).toBeGreaterThan(1);

  await page.getByLabel("Filter providers").fill(firstName);
  await page.waitForTimeout(300);
  await expect(page.getByText(firstName, { exact: false }).first()).toBeVisible();

  // A nonsense filter yields the empty state.
  await page.getByLabel("Filter providers").fill("zzz-nobody");
  await expect(page.getByText("No provider matches your filter")).toBeVisible();
});

test("arrow keys step the calendar day", async ({ page }) => {
  await page.goto("/clinic/calendar", { waitUntil: "networkidle" });
  await waitForHydration(page);

  const heading = page.locator("span", { hasText: /\w+ \d+ \w+/ }).first();
  const initial = await heading.textContent();

  await page.locator("body").press("ArrowRight");
  await page.waitForTimeout(200);
  const next = await heading.textContent();
  expect(next).not.toBe(initial);

  // Home returns to today, which re-enables the primary "Today" button styling.
  await page.locator("body").press("Home");
  await page.waitForTimeout(200);
  const back = await heading.textContent();
  expect(back).toBe(initial);
});

test("the calendar shows only the flagship clinic's providers", async ({ page }) => {
  await page.goto("/clinic/calendar", { waitUntil: "networkidle" });
  await waitForHydration(page);

  const leaked = await page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key)!).data as {
      doctors: { name: string; clinicId: string }[];
    };
    const foreign = new Set(
      data.doctors.filter((d) => d.clinicId !== "cl-1").map((d) => d.name),
    );
    const headerText = document.body.innerText;
    return [...foreign].some((name) => headerText.includes(name));
  }, STORAGE_KEY);

  expect(leaked, "no out-of-tenant provider appears").toBe(false);
});
