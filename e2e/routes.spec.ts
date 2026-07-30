import { test, expect } from "@playwright/test";
import {
  DEMO_ROUTES,
  collectErrors,
  waitForHydration,
  expectNoHorizontalOverflow,
} from "./helpers";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 375, height: 720 },
];

for (const vp of VIEWPORTS) {
  test.describe(`route sweep [${vp.name}]`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of DEMO_ROUTES) {
      test(`${route} renders cleanly`, async ({ page }) => {
        const errors = collectErrors(page);
        const resp = await page.goto(route, { waitUntil: "networkidle" });
        expect(resp?.status()).toBe(200);
        await waitForHydration(page);
        await expectNoHorizontalOverflow(page);
        expect(errors, `console errors on ${route}`).toEqual([]);
      });
    }
  });
}
