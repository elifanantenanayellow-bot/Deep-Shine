import { test, expect } from "@playwright/test";
import { collectErrors, waitForHydration, expectNoHorizontalOverflow } from "./helpers";
import { STORAGE_KEY } from "../src/demo/storage-key";

// The team hub is the shared inbox. Messages must persist, unread badges must
// clear when a thread is opened, and the sidebar counter must track reality.

test("sending a message persists it and it survives a reload", async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto("/clinic/messages", { waitUntil: "networkidle" });
  await waitForHydration(page);

  await expect(page.getByRole("heading", { name: "# Front desk" })).toBeVisible();

  const body = `Stock check done at ${Date.now()}`;
  await page.getByLabel(/^Message /).fill(body);
  // Exact: thread previews carry message text that can contain "send".
  await page.getByRole("button", { name: "Send", exact: true }).click();

  // The text shows in both the thread preview and the bubble — assert the bubble.
  await expect(page.getByRole("paragraph").filter({ hasText: body })).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await waitForHydration(page);
  // The text shows in both the thread preview and the bubble — assert the bubble.
  await expect(page.getByRole("paragraph").filter({ hasText: body })).toBeVisible();

  const stored = await page.evaluate((key) => {
    const data = JSON.parse(localStorage.getItem(key)!).data as {
      messages: { body: string; threadId: string }[];
    };
    return data.messages.filter((m) => m.threadId === "th-front-desk").length;
  }, STORAGE_KEY);
  expect(stored).toBeGreaterThan(1);

  expect(errors).toEqual([]);
});

test("opening a thread clears its unread badge in the sidebar", async ({ page }) => {
  await page.goto("/clinic", { waitUntil: "networkidle" });
  await waitForHydration(page);

  const hubLink = page.getByRole("link", { name: /Team hub/ }).first();
  const badgeBefore = (await hubLink.textContent())?.replace("Team hub", "").trim();
  expect(Number(badgeBefore), "seeded data leaves unread messages").toBeGreaterThan(0);

  await page.goto("/clinic/messages", { waitUntil: "networkidle" });
  await waitForHydration(page);

  // Visit every thread; the counter must reach zero.
  const threadButtons = page.locator("li > button");
  const count = await threadButtons.count();
  for (let i = 0; i < count; i++) {
    await threadButtons.nth(i).click();
    await page.waitForTimeout(150);
  }

  await expect
    .poll(
      () =>
        page.evaluate((key) => {
          const data = JSON.parse(localStorage.getItem(key)!).data as {
            messages: { read: boolean }[];
          };
          return data.messages.filter((m) => !m.read).length;
        }, STORAGE_KEY),
      { timeout: 5000 },
    )
    .toBe(0);
});

test("the team hub fits a phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/clinic/messages", { waitUntil: "networkidle" });
  await waitForHydration(page);
  await expectNoHorizontalOverflow(page);
});
