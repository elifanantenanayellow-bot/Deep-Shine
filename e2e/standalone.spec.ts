import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// The single-file offline build is a shipped artifact: it is what gets handed
// to a customer on a laptop with no connection. It uses hash routing and its
// own next/link + next/navigation shims, so a route that works under Next can
// still 404 here. This guards that.

const BUNDLE = resolve(process.cwd(), "dist/deep-shine-demo.html");
const FILE = pathToFileURL(BUNDLE).href;

const ROUTES = [
  "/",
  "/patient",
  "/doctor",
  "/doctor/patients",
  "/clinic",
  "/clinic/reception",
  "/clinic/calendar",
  "/clinic/messages",
  "/clinic/costs",
  "/clinic/patients/pt-1",
];

test.describe("offline single-file demo", () => {
  test.skip(
    !existsSync(BUNDLE),
    "run `pnpm run build:standalone` first (CI builds it before this suite)",
  );

  test("every screen renders from file:// with no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });

    for (const route of ROUTES) {
      await page.goto(`${FILE}#${route}`);
      await page.waitForTimeout(1300);
      const text = await page.locator("#root").innerText();
      expect(text.length, `content rendered on ${route}`).toBeGreaterThan(80);
      expect(text, `no 404 on ${route}`).not.toContain("Page not found");
      expect(text, `no crash screen on ${route}`).not.toContain(
        "This screen hit a problem",
      );
    }

    expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
  });

  test("walk-in ticketing works offline", async ({ page }) => {
    await page.goto(`${FILE}#/clinic/reception`);
    await page.waitForTimeout(1400);

    const patient = await page.evaluate(() => {
      const input = document.querySelector<HTMLDataListElement>(
        "#walkin-patient-options",
      );
      return input?.querySelector("option")?.value ?? null;
    });
    expect(patient).toBeTruthy();

    await page.getByLabel("Patient").fill(patient!);
    await page
      .getByRole("button", { name: /Issue ticket & notify provider/ })
      .click();

    await expect(page.getByText(/^T-\d{3}$/).first()).toBeVisible();
    await expect(page.getByText(/Emailed .+@.+ at \d{2}:\d{2}/).first()).toBeVisible();
  });
});
