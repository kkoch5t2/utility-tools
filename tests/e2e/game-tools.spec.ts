import { test, expect } from "@playwright/test";

test("ナンバーチェインを開始してヒント経路で得点できる", async ({ page }) => {
  await page.goto("/game/number-chain-10/");
  await expect(page.getByRole("heading", { name: "10をつくれ！ナンバーチェイン", exact: true })).toBeVisible();
  await expect(page.locator("[data-board] [data-cell]")).toHaveCount(36);

  await page.locator("[data-start]").click();
  await expect(page.locator("[data-time]")).toHaveText(/60|59/);
  await expect(page.locator("[data-hint]")).toBeEnabled();

  await page.locator("[data-hint]").click();
  const hintCells = page.locator("[data-hint-order]");
  await expect(hintCells).toHaveCount(await hintCells.count());
  const count = await hintCells.count();
  expect(count).toBeGreaterThanOrEqual(2);

  const ordered: Array<{ order: number; box: { x: number; y: number; width: number; height: number } }> = [];
  for (let i = 0; i < count; i++) {
    const cell = hintCells.nth(i);
    const order = Number(await cell.getAttribute("data-hint-order"));
    const box = await cell.boundingBox();
    if (!box) throw new Error("hint cell has no bounding box");
    ordered.push({ order, box });
  }
  ordered.sort((a, b) => a.order - b.order);

  const first = ordered[0].box;
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
  await page.mouse.down();
  for (const item of ordered.slice(1)) {
    await page.mouse.move(item.box.x + item.box.width / 2, item.box.y + item.box.height / 2, { steps: 3 });
  }
  await page.mouse.up();

  await expect(page.locator("[data-score]")).not.toHaveText("0");
  await expect(page.locator("[data-status]")).toContainText("成功");
});

test("ゲームカテゴリページと端末ベストスコア表示が動く", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("utility-tools:number-chain-10:best", "4321"));
  await page.goto("/game/number-chain-10/");
  await expect(page.locator("[data-best]")).toHaveText("4,321");

  await page.goto("/category/game/");
  await expect(page.getByRole("heading", { name: "ゲームツール一覧" })).toBeVisible();
  await expect(page.locator(".category-card")).toHaveCount(1);
  await expect(page.locator(".category-card").filter({ hasText: "ナンバーチェイン" })).toContainText("ナンバーチェイン");
});
