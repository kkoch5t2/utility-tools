import { expect, test } from "@playwright/test";

const url = "/game/football-club-manager/";
const saveKey = "utility-tools:sim:football-club-sim:v5";

test("20クラブ38試合と欧州クラブの選手データを閲覧できる", async ({ page }) => {
  await page.goto(url);
  await page.locator("[data-start]").click();
  await expect(page.locator("[data-play]")).toBeVisible();
  await expect(page.locator("[data-week]")).toHaveText("1 / 38");
  await expect(page.locator("[data-league-table] tr")).toHaveCount(20);

  await page.locator('[data-football-tab="world"]').click();
  await expect(page.locator('[data-football-panel="world"]')).toBeVisible();
  await page.selectOption("[data-world-country]", "Spain");
  await expect(page.locator("[data-world-club] option")).toHaveCount(4);
  await expect(page.locator("[data-world-roster] tr")).toHaveCount(20);
  await expect(page.locator("[data-world-roster] tr").first()).toContainText(/\d+/);

  await page.locator("[data-quick-match]").click();
  await page.selectOption("[data-world-country]", "LEAGUE");
  await expect(page.locator("[data-world-roster] tr").first().locator("td").nth(5)).toHaveText("1");
});

test("移籍金と契約を交渉して獲得し、届いた売却オファーを受諾できる", async ({ page }) => {
  await page.goto(url);
  await page.locator("[data-start]").click();
  await expect(page.locator("[data-play]")).toBeVisible();
  await page.locator('[data-football-tab="market"]').click();
  await page.selectOption("[data-market-sort]", "price");
  const buy = page.locator("[data-buy-player]:not([disabled])").first();
  const name = await buy.evaluate(el => el.closest(".market-player-card")?.querySelector("strong")?.textContent || "");
  await buy.click();
  const ask = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).negotiation.ask, saveKey);
  await page.locator("[data-negotiation-fee]").fill(String(ask));
  await page.locator("[data-submit-club-offer]").click();
  await expect(page.locator("[data-submit-contract-offer]")).toBeVisible();
  await page.locator("[data-submit-contract-offer]").click();
  await expect(page.locator("[data-squad-table]")).toContainText(name);
  await expect(page.locator("[data-squad-count]")).toHaveText("23 players");

  await page.locator("[data-quick-match]").click();
  await page.locator("[data-quick-match]").click();
  await page.locator('[data-football-tab="club"]').click();
  await expect(page.locator("[data-transfer-offers] .offer-card")).toHaveCount(1);
  await page.locator("[data-offer-accept]").click();
  await expect(page.locator("[data-squad-count]")).toHaveText("22 players");
  await page.locator('[data-football-tab="stats"]').click();
  expect(await page.locator("[data-transfer-history] > div").count()).toBeGreaterThanOrEqual(2);
});

test("PCのハーフタイムで交代ボタンが画面内に見えて操作できる", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(url);
  await page.locator("[data-start]").click();
  await expect(page.locator("[data-play]")).toBeVisible();
  await page.locator("[data-match]").click();
  const sub = page.locator("[data-make-sub]");
  await expect(page.locator("[data-halftime]")).toBeVisible();
  await expect(sub).toBeVisible();
  await expect(sub).toBeInViewport();
  await sub.click();
  await expect(page.locator("[data-sub-count]")).toHaveText("交代 1 / 3");
});
test("38試合完走後も全盛期までの選手は2年目開始だけで弱体化しない", async ({ page }) => {
  await page.goto(url);
  await page.locator("[data-start]").click();
  await expect(page.locator("[data-play]")).toBeVisible();
  for (let i = 0; i < 38; i++) await page.locator("[data-quick-match]").click();
  await expect(page.locator("[data-sim-game]")).toHaveAttribute("data-state", "complete");
  const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).squad.map((p:any) => ({ id:p.id, age:p.age, ovr:p.ovr })), saveKey);
  await page.locator("[data-next-season]").click();
  await expect(page.locator("[data-season]")).toHaveText("2年目");
  const after = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).squad.map((p:any) => ({ id:p.id, age:p.age, ovr:p.ovr })), saveKey);
  const afterMap = new Map(after.map((p:any) => [p.id, p]));
  const prime = before.filter((p:any) => p.age <= 31 && afterMap.has(p.id));
  expect(prime.length).toBeGreaterThanOrEqual(10);
  for (const p of prime) expect((afterMap.get(p.id) as any).ovr).toBeGreaterThanOrEqual(p.ovr);
  const veterans = before.filter((p:any) => p.age >= 32 && afterMap.has(p.id));
  for (const p of veterans) expect(p.ovr - (afterMap.get(p.id) as any).ovr).toBeLessThanOrEqual(1);
});

test("旧v4セーブは資金と選手能力を保ったまま38試合制へ移行する", async ({ page }) => {
  await page.goto(url);
  await page.locator("[data-start]").click();
  await expect(page.locator("[data-play]")).toBeVisible();
  const legacy = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    const player = { id: state.squad[0].id, name: state.squad[0].name, ovr: state.squad[0].ovr };
    state.version = 4;
    state.budget = 777000000;
    localStorage.setItem("utility-tools:sim:football-club-sim:v4", JSON.stringify(state));
    localStorage.removeItem(key);
    return player;
  }, saveKey);
  await page.reload();
  await page.locator("[data-continue]").click();
  await expect(page.locator("[data-play]")).toBeVisible();
  await expect(page.locator("[data-week]")).toHaveText("1 / 38");
  await expect(page.locator("[data-budget]")).toContainText("777,000,000");
  await expect(page.locator("[data-squad-table]")).toContainText(legacy.name);
  const migratedOvr = await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)!).squad.find((p:any) => p.id === id)?.ovr, { key: saveKey, id: legacy.id });
  expect(migratedOvr).toBe(legacy.ovr);
});

test("新しいクラブ管理画面はスマホでもページ全体が横にはみ出さない", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.locator("[data-start]").click();
  await expect(page.locator("[data-play]")).toBeVisible();
  for (const tab of ["squad", "market", "world", "club", "stats"]) {
    await page.locator(`[data-football-tab="${tab}"]`).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
  await expect(page.locator("[data-football-tabs]")).toBeVisible();
});
