import { expect, type Page } from "@playwright/test";

export const DEMO_ROUTES = [
  "/",
  "/patient",
  "/patient/doctors",
  "/patient/doctors/dr-1",
  "/patient/appointments",
  "/patient/settings",
  "/doctor",
  "/doctor/calendar",
  "/doctor/patients",
  "/doctor/earnings",
  "/doctor/availability",
  "/clinic",
  "/clinic/doctors",
  "/clinic/patients",
  "/clinic/appointments",
  "/clinic/reception",
  "/clinic/billing",
  "/clinic/notifications",
  "/clinic/patients/pt-1",
  "/clinic/revenue",
  "/clinic/settings",
];

// Attach console/page error collection to a page. Returns the error sink.
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

// The demo store hydrates client-side; wait for the skeleton beat to pass.
export async function waitForHydration(page: Page) {
  await page.waitForTimeout(900);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(1);
}
