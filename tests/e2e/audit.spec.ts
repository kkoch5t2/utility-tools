import { expect, test } from "@playwright/test";

const TOOL_PATH = /^(?:\/(schedule|poll|attendance|split-bill|survey|team-divider|lottery-order|availability-match|packing-list|shared-checklist|seat-shuffle|travel-expense|candidate-ranking)\/|\/(image|csv|json|text|pdf|qr|video|japanese|developer|date|calculator|security|japan|office|game)\/)/;

test("全ツールをPC・スマホで表示監査する", async ({ browser, request }) => {
  test.setTimeout(90_000);
  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.ok()).toBeTruthy();
  const sitemap = await sitemapResponse.text();
  const toolPaths = [...sitemap.matchAll(/<loc>https:\/\/utility-tools-jp\.com([^<]+)<\/loc>/g)]
    .map((match) => match[1])
    .filter((path) => TOOL_PATH.test(path));

  expect(toolPaths.length).toBeGreaterThanOrEqual(170);

  const viewports = [
    { name: "desktop", width: 1365, height: 768 },
    { name: "mobile", width: 390, height: 844 },
  ];

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    for (const path of toolPaths) {
      const pageErrors: string[] = [];
      const handler = (error: Error) => pageErrors.push(error.message);
      page.on("pageerror", handler);

      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.ok(), `${viewport.name}: ${path}`).toBeTruthy();
      if (["/schedule/", "/poll/", "/attendance/", "/split-bill/", "/survey/", "/lottery-order/", "/availability-match/", "/packing-list/", "/shared-checklist/", "/travel-expense/", "/candidate-ranking/"].includes(path)) {
        await expect(page.locator("h1"), `${viewport.name}: ${path}`).toBeVisible();
        await expect(page.locator("[data-create-form]"), `${viewport.name}: ${path}`).toBeVisible();
      } else {
        await expect(page.locator(".tool-heading h1"), `${viewport.name}: ${path}`).toBeVisible();
        await expect(page.locator(".tool-card, .game-card, .platformer-shell, .arcade-shell, .quick-game, .sim-shell").first(), `${viewport.name}: ${path}`).toBeVisible();
      }

      const overflow = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(
        Math.max(overflow.document, overflow.body) <= overflow.viewport + 2,
        `${viewport.name}: horizontal overflow at ${path}: ${JSON.stringify(overflow)}`,
      ).toBeTruthy();
      expect(pageErrors, `${viewport.name}: pageerror at ${path}`).toEqual([]);
      page.off("pageerror", handler);
    }
    await page.close();
  }
});
