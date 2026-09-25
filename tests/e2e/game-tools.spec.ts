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
  await expect(page.getByRole("heading", { name: "無料ブラウザゲーム" })).toBeVisible();
  await expect(page.locator(".game-hub-card")).toHaveCount(7);
  await expect(page.locator(".game-hub-card").filter({ hasText: "ナンバーチェイン" })).toContainText("ナンバーチェイン");
  await expect(page.locator(".game-hub-card").filter({ hasText: "Lumo's Sky Run" })).toContainText("Lumo's Sky Run");
  await expect(page.locator(".game-hub-card").filter({ hasText: "Meteor Drift" })).toContainText("Meteor Drift");
  await expect(page.locator(".game-hub-card").filter({ hasText: "Flash Matrix" })).toContainText("Flash Matrix");
  await expect(page.locator(".game-hub-card").filter({ hasText: "Neon Snake" })).toContainText("Neon Snake");
  await expect(page.locator(".game-hub-card").filter({ hasText: "Reaction Zero" })).toContainText("Reaction Zero");
  await expect(page.locator(".game-hub-card").filter({ hasText: "Orbit Catch" })).toContainText("Orbit Catch");
});


test("Lumo's Sky Runで移動とジャンプができる", async ({ page }) => {
  await page.goto("/game/lumo-sky-run/");
  await expect(page.locator("h1")).toHaveText("Lumo's Sky Run");
  await expect(page.locator("[data-canvas]")).toBeVisible();
  await expect(page.locator("[data-platformer]")).toHaveAttribute("data-state", "ready");

  await page.locator("[data-start]").click();
  await expect(page.locator("[data-platformer]")).toHaveAttribute("data-state", "running");
  await expect(page.locator("[data-platformer] strong[data-level]")).toHaveText("1 / 3");

  await page.waitForTimeout(350);
  const startX = Number(await page.locator("[data-platformer]").getAttribute("data-player-x"));
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(500);
  await page.keyboard.up("ArrowRight");
  const movedX = Number(await page.locator("[data-platformer]").getAttribute("data-player-x"));
  expect(movedX).toBeGreaterThan(startX + 20);

  await page.waitForTimeout(250);
  const groundY = Number(await page.locator("[data-platformer]").getAttribute("data-player-y"));
  await page.keyboard.down("Space");
  await page.waitForTimeout(120);
  await page.keyboard.up("Space");
  await page.waitForTimeout(80);
  const jumpY = Number(await page.locator("[data-platformer]").getAttribute("data-player-y"));
  expect(jumpY).toBeLessThan(groundY - 8);

  await expect(page.locator("[data-lives]")).toContainText("♥");
});

test("Lumo's Sky Runのスマホ操作とベストタイム表示が動く", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("utility-tools:lumo-sky-run:best", JSON.stringify({ total: 98.2 })));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/game/lumo-sky-run/");
  await expect(page.locator("[data-total-best]")).toHaveText("1:38");
  await expect(page.locator('[data-control="left"]')).toBeVisible();
  await expect(page.locator('[data-control="right"]')).toBeVisible();
  await expect(page.locator('[data-control="jump"]')).toBeVisible();
  await expect(page.locator('[data-control="left"] svg')).toBeVisible();
  await expect(page.locator('[data-control="right"] svg')).toBeVisible();

  const canvasBox = await page.locator("[data-canvas]").boundingBox();
  expect(canvasBox?.height ?? 0).toBeGreaterThan(300);
  const controlSelect = await page.locator('[data-control="left"]').evaluate((el) => getComputedStyle(el).userSelect);
  expect(controlSelect).toBe("none");

  await page.goto("/category/game/");
  await expect(page.locator(".game-hub-card")).toHaveCount(7);
  await expect(page.locator(".game-hub-card").filter({ hasText: "Lumo's Sky Run" })).toBeVisible();
});


test("Meteor Driftで移動とスコア加算が動く", async ({ page }) => {
  await page.goto("/game/meteor-drift/");
  await expect(page.locator("h1")).toHaveText("Meteor Drift");
  await expect(page.locator("[data-meteor-canvas]")).toBeVisible();
  await page.locator("[data-start]").click();
  await expect(page.locator("[data-arcade]")).toHaveAttribute("data-state", "running");

  await page.waitForTimeout(250);
  const startX = Number(await page.locator("[data-arcade]").getAttribute("data-player-x"));
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(450);
  await page.keyboard.up("ArrowRight");
  const movedX = Number(await page.locator("[data-arcade]").getAttribute("data-player-x"));
  expect(movedX).toBeGreaterThan(startX + 15);

  await page.waitForTimeout(500);
  const scoreText = (await page.locator("[data-score]").textContent()) ?? "0";
  expect(Number(scoreText.replace(/,/g, ""))).toBeGreaterThan(0);
  await expect(page.locator("[data-lives]")).toContainText("♥");
});

test("Flash Matrixの正解シーケンスを入力すると次ラウンドへ進む", async ({ page }) => {
  await page.goto("/game/flash-matrix/");
  await expect(page.locator("h1")).toHaveText("Flash Matrix");
  await expect(page.locator("[data-memory-grid] [data-cell]")).toHaveCount(16);
  await page.locator("[data-start]").click();
  await expect(page.locator("[data-arcade]")).toHaveAttribute("data-state", "running");

  await expect(page.locator("[data-status]")).toHaveText("同じ順番でタップ！", { timeout: 5000 });
  const raw = (await page.locator("[data-arcade]").getAttribute("data-sequence")) ?? "";
  const sequence = raw.split(",").filter(Boolean).map(Number);
  expect(sequence.length).toBe(3);

  for (const index of sequence) {
    await page.locator('[data-cell="' + index + '"]').click();
  }
  await expect(page.locator("[data-round]")).toHaveText("2", { timeout: 4000 });
  await expect(page.locator("[data-score]")).not.toHaveText("0");
});

test("ブラウザゲーム目的別ページに7ゲームが表示される", async ({ page }) => {
  await page.goto("/use-case/browser-games/");
  await expect(page.getByRole("heading", { name: "ブラウザでゲームを遊ぶ" })).toBeVisible();
  await expect(page.locator(".usecase-card")).toHaveCount(7);
  await expect(page.locator(".usecase-card").filter({ hasText: "Meteor Drift" })).toBeVisible();
  await expect(page.locator(".usecase-card").filter({ hasText: "Flash Matrix" })).toBeVisible();
  await expect(page.locator(".usecase-card").filter({ hasText: "Neon Snake" })).toBeVisible();
  await expect(page.locator(".usecase-card").filter({ hasText: "Reaction Zero" })).toBeVisible();
  await expect(page.locator(".usecase-card").filter({ hasText: "Orbit Catch" })).toBeVisible();
});


test("Neon Snakeが開始して実際に前進する", async ({ page }) => {
  await page.goto("/game/neon-snake/");
  await expect(page.locator("h1")).toHaveText("Neon Snake");
  await expect(page.locator("[data-snake]")).toBeVisible();
  const startX = Number(await page.locator("[data-quick-game]").getAttribute("data-head-x"));
  await page.locator("[data-start]").click();
  await expect(page.locator("[data-quick-game]")).toHaveAttribute("data-state", "running");
  await page.waitForTimeout(360);
  const movedX = Number(await page.locator("[data-quick-game]").getAttribute("data-head-x"));
  expect(movedX).toBeGreaterThan(startX);
  await expect(page.locator("[data-length]")).toHaveText(/3|4|5|6/);
});

test("Reaction ZeroでGO後の反応時間を計測できる", async ({ page }) => {
  await page.goto("/game/reaction-zero/");
  await expect(page.locator("h1")).toHaveText("Reaction Zero");
  await page.locator("[data-start]").click();
  await expect(page.locator("[data-quick-game]")).toHaveAttribute("data-state", "go", { timeout: 4500 });
  await page.locator("[data-reaction-pad]").click();
  await expect(page.locator("[data-round]")).toHaveText("1 / 5");
  await expect(page.locator("[data-last]")).toHaveText(/\d+ ms/);
  await expect(page.locator("[data-quick-game]")).toHaveAttribute("data-state", "hit");
});

test("Orbit CatchでSTOPすると試行回数が進む", async ({ page }) => {
  await page.goto("/game/orbit-catch/");
  await expect(page.locator("h1")).toHaveText("Orbit Catch");
  await page.locator("[data-start]").click();
  await expect(page.locator("[data-quick-game]")).toHaveAttribute("data-state", "running");
  await expect(page.locator("[data-stop]")).toBeEnabled();
  await page.waitForTimeout(250);
  await page.locator("[data-stop]").click();
  await expect(page.locator("strong[data-tries]")).toHaveText("1 / 10");
  await expect(page.locator("[data-orbit-status]")).toHaveText(/PERFECT|GREAT|CLOSE|MISS/);
});


test("GAME専用ハブでサムネ・最近遊んだゲーム・ジャンル絞り込みが動く", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("utility-tools:recent", JSON.stringify([
      { id: "game-neon-snake", href: "/game/neon-snake/", name: "Neon Snake", category: "game" },
      { id: "game-reaction-zero", href: "/game/reaction-zero/", name: "Reaction Zero", category: "game" },
    ]));
  });
  await page.goto("/category/game/");
  await expect(page.locator(".game-hub-hero")).toBeVisible();
  await expect(page.locator(".game-hub-card")).toHaveCount(7);
  await expect(page.locator(".game-hub-card img")).toHaveCount(7);
  await expect(page.locator("[data-recent-games]")).toBeVisible();
  await expect(page.locator("[data-recent-game-grid] a")).toHaveCount(2);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.locator('[data-game-filter="反応速度"]').click();
  await expect(page.locator(".game-hub-card:not([hidden])")).toHaveCount(1);
  await expect(page.locator(".game-hub-card:not([hidden])")).toContainText("Reaction Zero");

  await page.locator('[data-game-filter="all"]').click();
  await expect(page.locator(".game-hub-card:not([hidden])")).toHaveCount(7);
});

test("各ゲームページが内容の分かる個別アイキャッチを使う", async ({ page }) => {
  await page.goto("/game/lumo-sky-run/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/game-art\/lumo-sky-run\.jpg$/);
  await page.goto("/game/reaction-zero/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/game-art\/reaction-zero\.jpg$/);
});

test("ゲーム終了後に次に遊ぶ3ゲームが表示される", async ({ page }) => {
  await page.goto("/game/orbit-catch/");
  await expect(page.locator("[data-game-next]")).toBeHidden();
  await page.locator("[data-start]").click();
  for (let i = 0; i < 10; i++) {
    await page.locator("[data-stop]").click();
    if (i < 9) await page.waitForTimeout(360);
  }
  await expect(page.locator("[data-quick-game]")).toHaveAttribute("data-state", "complete", { timeout: 2000 });
  await expect(page.locator("[data-game-next]")).toBeVisible();
  await expect(page.locator("[data-game-next] .game-next-card")).toHaveCount(3);
  await expect(page.locator('[data-game-next] a[href="/category/game/"]')).toBeVisible();
});


test("ホーム上部からGAMEカテゴリへ移動できる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const section = page.locator(".home-games");
  await expect(section).toBeVisible();
  await expect(page.locator(".home-games-grid > a")).toHaveCount(3);
  await expect(page.locator('.home-games-heading a[href="/category/game/"]')).toBeVisible();
  await expect(page.locator(".home-games-grid").filter({ hasText: "Lumo's Sky Run" })).toBeVisible();
  const box = await section.boundingBox();
  expect(box?.y ?? 9999).toBeLessThan(500);
});

test("GAME一覧カードがPCで縦長にならない", async ({ page }) => {
  await page.setViewportSize({ width: 1668, height: 1000 });
  await page.goto("/category/game/");
  const card = page.locator(".game-hub-card").first();
  const image = card.locator(".game-card-image img");
  const cardBox = await card.boundingBox();
  const imageBox = await image.boundingBox();
  expect(cardBox?.height ?? 999).toBeLessThan(260);
  expect(imageBox?.height ?? 999).toBeLessThan(230);
  expect(imageBox?.width ?? 0).toBeGreaterThan(180);
});


test("共通GAME UIとプレイイベント計測が動く", async ({ page }) => {
  const events: string[] = [];
  await page.route("**/api/game-events", async (route) => {
    const body = route.request().postDataJSON() as { event?: string };
    if (body.event) events.push(body.event);
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/game/orbit-catch/");
  await expect(page.locator("[data-game-common]")).toBeVisible();
  await expect(page.locator('[data-game-common] a[href="/category/game/"]')).toBeVisible();
  await expect(page.locator("[data-game-fullscreen]")).toBeVisible();

  await page.locator("[data-start]").click();
  await expect.poll(() => events).toContain("start");

  for (let i = 0; i < 10; i++) {
    await page.locator("[data-stop]").click();
    if (i < 9) await page.waitForTimeout(360);
  }
  await expect(page.locator("[data-quick-game]")).toHaveAttribute("data-state", "complete", { timeout: 2000 });
  await expect.poll(() => events).toContain("end");

  await page.locator("[data-game-next] .game-next-card").first().click();
  await expect.poll(() => events).toContain("next");
});
