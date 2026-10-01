import { test, expect } from "@playwright/test";
import { collectErrors, waitForHydration } from "./helpers";

test("sign-in as a specific doctor switches the doctor portal persona", async ({
  page,
}) => {
  const errors = collectErrors(page);

  await page.goto("/signin", { waitUntil: "networkidle" });
  await waitForHydration(page);
  await expect(page.getByText("Explore the demo")).toBeVisible();

  await page.getByRole("button", { name: /^Doctor/ }).click();
  await expect(page.getByText("Pick a practitioner")).toBeVisible();

  // Pick the SECOND doctor so we prove it's not the dr-1 default.
  // (Avatar initials precede the name in the button's text, so match
  // unanchored and read the name from its own span.)
  const pick = page.locator("button:has(span.block)", { hasText: /Dr\./ }).nth(1);
  const chosenName = (await pick.locator("span.block").first().textContent())?.trim();
  expect(chosenName).toBeTruthy();
  await pick.click();

  await expect(page).toHaveURL("/doctor");
  await waitForHydration(page);
  // The portal header shows the signed-in doctor.
  await expect(page.getByText(chosenName!).first()).toBeVisible();

  expect(errors).toEqual([]);
});

test("sign-in as a patient lands on their dashboard", async ({ page }) => {
  await page.goto("/signin", { waitUntil: "networkidle" });
  await waitForHydration(page);
  await page.getByRole("button", { name: /^Patient/ }).click();
  await expect(page.getByText("Pick a patient profile")).toBeVisible();

  const pick = page.locator("button:has(span.block)").nth(1);
  const chosenName = (await pick.locator("span.block").first().textContent())?.trim();
  await pick.click();

  await expect(page).toHaveURL("/patient");
  await waitForHydration(page);
  await expect(
    page.getByText(`Hello, ${chosenName!.split(" ")[0]}`),
  ).toBeVisible();
});
