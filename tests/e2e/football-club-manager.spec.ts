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
  await expect(page.locator("[data-negotiation-backdrop]")).toBeVisible();
  const modalBox = await page.locator("[data-negotiation]").boundingBox();
  const viewport = page.viewportSize()!;
  expect(modalBox).not.toBeNull();
  expect(modalBox!.y).toBeGreaterThanOrEqual(0);
  expect(modalBox!.y + modalBox!.height).toBeLessThanOrEqual(viewport.height + 1);
  const ask = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).negotiation.ask, saveKey);
  await page.locator("[data-negotiation-fee]").fill(String(ask));
  await page.locator("[data-submit-club-offer]").click();
  await expect(page.locator("[data-submit-contract-offer]")).toBeVisible();
  await page.locator("[data-submit-contract-offer]").click();
  await expect(page.locator("[data-squad-table]")).toContainText(name);
  await expect(page.locator("[data-squad-count]")).toHaveText("23 players");

  await page.locator("[data-quick-match]").click();
  await page.locator("[data-quick-match]").click();
  await expect(page.locator("[data-offer-alert]")).toBeVisible();
  await expect(page.locator("[data-offer-alert-text]")).toContainText("1件");
  await page.locator("[data-offer-alert]").click();
  await expect(page.locator('[data-football-panel="club"]')).toBeVisible();
  await expect(page.locator("[data-transfer-offers] .offer-card")).toHaveCount(1);
  await page.locator("[data-offer-accept]").click();
  await expect(page.locator("[data-squad-count]")).toHaveText("22 players");
  const sold = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).transferHistory.filter((x:any) => x.type === "OUT").at(-1), saveKey);
  expect(sold.ownerCut).toBeGreaterThan(0);
  expect(sold.net).toBeLessThan(sold.fee);
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
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    state.budget = 2000000000;
    state.facilities = { training:true, recovery:true, academy:true, stadium:true };
    localStorage.setItem(key, JSON.stringify(state));
  }, saveKey);
  await page.reload();
  await page.locator("[data-continue]").click();
  await expect(page.locator("[data-play]")).toBeVisible();
  await page.locator("[data-next-season]").click();
  await expect(page.locator("[data-season]")).toHaveText("2年目");
  const fiscal = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    return { budget:state.budget, levy:state.lastReserveLevy, maintenance:state.lastFacilityMaintenance };
  }, saveKey);
  expect(fiscal.levy).toBeGreaterThan(1000000000);
  expect(fiscal.maintenance).toBe(260000000);
  expect(fiscal.budget).toBeLessThan(1000000000);
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

test("タクティカルボードから交代でき、国籍コードとポジション色が見える", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(url);
  await page.locator("[data-start]").click();
  await expect(page.locator("[data-play]")).toBeVisible();
  const firstName = page.locator("[data-squad-table] .player-name-button").first();
  await expect(firstName.locator(".nation-badge small")).toHaveText(/^[A-Z]{2}$/);
  await expect(firstName).toContainText(/[🟤🟡🟢🔵]/);

  await page.locator("[data-match]").click();
  await expect(page.locator("[data-halftime]")).toBeVisible();
  const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).lineup[9], saveKey);
  await page.locator('[data-board-phase="base"]').click();
  await page.locator("[data-pitch-player]").nth(9).click();
  await expect(page.locator("[data-tactical-selected]")).toContainText("を入れ替える");
  const incoming = page.locator("[data-tactical-in]:not([disabled])").first();
  await expect(incoming).toBeVisible();
  await incoming.click();
  await expect(page.locator("[data-sub-count]")).toHaveText("交代 1 / 3");
  const after = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).lineup[9], saveKey);
  expect(after).not.toBe(before);
});

test("FITが落ちた先発を第2レギュラーへ自動ローテする", async ({ page }) => {
  await page.goto(url);
  await page.locator("[data-start]").click();
  await expect(page.locator("[data-play]")).toBeVisible();
  const ids = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    const starter = state.lineup[0], reserve = state.rotationLineup[0];
    state.squad.find((p:any) => p.id === starter).fit = 40;
    state.squad.find((p:any) => p.id === reserve).fit = 99;
    state.autoRotate = true;
    state.rotationThreshold = 75;
    localStorage.setItem(key, JSON.stringify(state));
    return { starter, reserve };
  }, saveKey);
  await page.reload();
  await page.locator("[data-continue]").click();
  await expect(page.locator("[data-auto-rotate]")).toBeChecked();
  await page.locator("[data-quick-match]").click();
  const state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), saveKey);
  expect(state.lineup[0]).toBe(ids.reserve);
  expect(state.rotationLineup[0]).toBe(ids.starter);
  expect(state.log.join("\n")).toContain("自動ローテ");
});

test("スマホでも移籍交渉モーダルとオファー通知が画面内に収まる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.locator("[data-start]").click();
  await page.locator('[data-football-tab="market"]').click();
  await page.locator("[data-buy-player]:not([disabled])").first().click();
  const modal = await page.locator("[data-negotiation]").boundingBox();
  expect(modal).not.toBeNull();
  expect(modal!.x).toBeGreaterThanOrEqual(0);
  expect(modal!.x + modal!.width).toBeLessThanOrEqual(390);
  expect(modal!.y + modal!.height).toBeLessThanOrEqual(844);
  await page.locator("[data-cancel-negotiation]").click();

  await page.locator("[data-quick-match]").click();
  await page.locator("[data-quick-match]").click();
  await expect(page.locator("[data-offer-alert]")).toBeVisible();
  const alert = await page.locator("[data-offer-alert]").boundingBox();
  expect(alert).not.toBeNull();
  expect(alert!.x + alert!.width).toBeLessThanOrEqual(390);
  await page.locator("[data-offer-alert]").click();
  await expect(page.locator('[data-football-panel="club"]')).toBeVisible();
});

test("攻守の可変フォーメーションでも同じ11人を自動最適配置しOVRを維持する", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(url);
  await page.locator("[data-start]").click();
  await expect(page.locator("[data-play]")).toBeVisible();
  await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), saveKey);
  await expect(page.locator("[data-shape-summary]")).toContainText("攻撃 3-2-5");
  await expect(page.locator("[data-shape-summary]")).toContainText("守備 4-1-4-1");

  const saved = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    return { ids: [...state.lineup], ovr: Object.fromEntries(state.squad.map((p:any) => [p.id, p.ovr])) };
  }, saveKey);
  const baseIds = await page.locator("[data-pitch-player]").evaluateAll(nodes => nodes.map(n => n.getAttribute("data-pitch-player")));
  expect(new Set(baseIds)).toEqual(new Set(saved.ids));
  await expect(page.locator("[data-pitch-player]").first()).toContainText(/OVR \d+/);
  await page.locator('[data-board-phase="attack"]').click();
  await expect(page.locator('[data-board-phase="attack"]')).toHaveClass(/active/);
  const attack = await page.locator("[data-pitch-player]").evaluateAll(nodes => nodes.map(n => ({ id:n.getAttribute("data-pitch-player"), fit:Number(n.getAttribute("data-role-fit")) })));
  expect(new Set(attack.map(x => x.id))).toEqual(new Set(saved.ids));
  expect(Math.min(...attack.map(x => x.fit))).toBeGreaterThanOrEqual(90);
  await expect(page.locator("[data-pitch-player]").first()).toContainText(/OVR \d+/);

  await page.locator('[data-board-phase="defense"]').click();
  const defense = await page.locator("[data-pitch-player]").evaluateAll(nodes => nodes.map(n => ({ id:n.getAttribute("data-pitch-player"), fit:Number(n.getAttribute("data-role-fit")) })));
  expect(new Set(defense.map(x => x.id))).toEqual(new Set(saved.ids));
  expect(Math.min(...defense.map(x => x.fit))).toBeGreaterThanOrEqual(90);

  const after = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), saveKey);
  for (const id of saved.ids) expect(after.squad.find((p:any) => p.id === id).ovr).toBe(saved.ovr[id]);
});

test("攻撃時と守備時の形を変更して保存し試合へ反映できる", async ({ page }) => {
  await page.goto(url);
  await page.locator("[data-start]").click();
  await expect(page.locator("[data-play]")).toBeVisible();
  await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), saveKey);
  await page.locator("[data-attack-formation]").selectOption("3241");
  await page.locator("[data-defense-formation]").selectOption("532");
  await expect(page.locator("[data-shape-summary]")).toContainText("攻撃 3-2-4-1");
  await expect(page.locator("[data-shape-summary]")).toContainText("守備 5-3-2");
  let state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), saveKey);
  expect(state.attackFormation).toBe("3241");
  expect(state.defenseFormation).toBe("532");

  await page.reload();
  await page.locator("[data-continue]").click();
  await expect(page.locator("[data-attack-formation]")).toHaveValue("3241");
  await expect(page.locator("[data-defense-formation]")).toHaveValue("532");
  await page.locator("[data-match]").click();
  await expect(page.locator("[data-match-feed]")).toContainText("攻撃 3-2-4-1 / 守備 5-3-2");
});


test("戦術ボードで選手詳細を確認し先発同士を直接入れ替えられる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.locator("[data-start]").click();
  await expect(page.locator("[data-play]")).toBeVisible();
  await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), saveKey);
  const before = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    const player = state.squad.find((p:any) => p.id === state.lineup[1]);
    return { lineup:[...state.lineup], player };
  }, saveKey);

  await page.locator("[data-pitch-player]").nth(1).click();
  const detail = page.locator("[data-tactical-player-detail]");
  await expect(detail).toContainText(before.player.name);
  await expect(detail).toContainText("OVR");
  await expect(detail).toContainText("POT");
  await expect(detail).toContainText("PAC");
  await expect(detail).toContainText(String(before.player.pac));
  await expect(detail).toContainText(before.player.pos[0]);
  await page.locator("[data-arm-starter-swap]").click();
  await expect(page.locator("[data-pitch-player]").nth(1)).toHaveClass(/swap-source/);
  await page.locator("[data-pitch-player]").nth(4).click();

  const after = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).lineup, saveKey);
  expect(after[1]).toBe(before.lineup[4]);
  expect(after[4]).toBe(before.lineup[1]);
  await expect(page.locator("[data-pitch-player]").nth(1)).toHaveAttribute("data-pitch-player", before.lineup[4]);
  await expect(page.locator("[data-pitch-player]").nth(4)).toHaveAttribute("data-pitch-player", before.lineup[1]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.reload();
  await page.locator("[data-continue]").click();
  const persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).lineup, saveKey);
  expect(persisted[1]).toBe(before.lineup[4]);
  expect(persisted[4]).toBe(before.lineup[1]);
});


test("attack and defense boards keep independent manual starter positions", async ({ page }) => {
  await page.goto(url);
  await page.locator("[data-start]").click();
  await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), saveKey);
  await page.selectOption("[data-attack-formation]", "433");
  await page.selectOption("[data-defense-formation]", "433");

  await page.locator('[data-board-phase="attack"]').click();
  const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), saveKey);
  const baseBefore = [...before.lineup];
  const defenseBefore = [...before.defenseLineup];
  const attackBefore = [...before.attackLineup];
  await page.locator("[data-pitch-player]").nth(1).click();
  await page.locator("[data-arm-starter-swap]").click();
  await page.locator("[data-pitch-player]").nth(4).click();

  const afterAttack = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), saveKey);
  expect(afterAttack.lineup).toEqual(baseBefore);
  expect(afterAttack.defenseLineup).toEqual(defenseBefore);
  expect(afterAttack.attackLineup[1]).toBe(attackBefore[4]);
  expect(afterAttack.attackLineup[4]).toBe(attackBefore[1]);

  await page.locator('[data-board-phase="defense"]').click();
  const defenseSwapBefore = [...afterAttack.defenseLineup];
  await page.locator("[data-pitch-player]").nth(2).click();
  await page.locator("[data-arm-starter-swap]").click();
  await page.locator("[data-pitch-player]").nth(7).click();
  const afterDefense = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), saveKey);
  expect(afterDefense.lineup).toEqual(baseBefore);
  expect(afterDefense.attackLineup).toEqual(afterAttack.attackLineup);
  expect(afterDefense.defenseLineup[2]).toBe(defenseSwapBefore[7]);
  expect(afterDefense.defenseLineup[7]).toBe(defenseSwapBefore[2]);

  await page.reload();
  await page.locator("[data-continue]").click();
  const persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), saveKey);
  expect(persisted.attackLineup).toEqual(afterAttack.attackLineup);
  expect(persisted.defenseLineup).toEqual(afterDefense.defenseLineup);
});
