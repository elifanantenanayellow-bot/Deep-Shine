import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { waitForHydration } from "./helpers";

// Export buttons must produce real CSV downloads, not just toasts.
test("clinic patients export downloads a real CSV", async ({ page }) => {
  await page.goto("/clinic/patients", { waitUntil: "networkidle" });
  await waitForHydration(page);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /export csv/i }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("patients-centre-medical.csv");

  const path = await download.path();
  const content = readFileSync(path!, "utf-8");
  expect(content).toContain("Name,Email,Phone,City,Visits");
  expect(content.split("\n").length).toBeGreaterThan(2);
});

test("clinic revenue export downloads the appointment ledger", async ({
  page,
}) => {
  await page.goto("/clinic/revenue", { waitUntil: "networkidle" });
  await waitForHydration(page);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /export csv/i }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("revenue-centre-medical.csv");
  const content = readFileSync((await download.path())!, "utf-8");
  expect(content).toContain("Date,Time,Patient,Doctor");
});
