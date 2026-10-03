import { expect, test } from "@playwright/test";

const url = "/game/football-club-manager/";
const saveKey = "utility-tools:sim:football-club-sim:v5";

async function finishPreseason(page:any){
  await page.locator("[data-play]").waitFor({state:"visible"});
  const panel=page.locator("[data-preseason-panel]");
  if(await panel.count()===0)return;
  await page.waitForFunction(()=>document.querySelector("[data-sim-game]")?.hasAttribute("data-match-phase"));
  for(let i=0;i<5;i++){if(!(await panel.isVisible()))break;const btn=page.locator("[data-preseason-action]");await btn.waitFor({state:"visible"});await btn.click();}
}

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

  await finishPreseason(page); await page.locator("[data-quick-match]").click();
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

  await page.evaluate((key) => { const st=JSON.parse(localStorage.getItem(key)!); st.seed=12345; st.offers=[]; delete st.lastOfferGenerationKey; localStorage.setItem(key,JSON.stringify(st)); }, saveKey);
  await page.reload(); await page.locator("[data-continue]").click();
  await finishPreseason(page);
  await expect(page.locator("[data-offer-alert]")).toBeVisible();
  await page.locator("[data-offer-alert]").click();
  await expect(page.locator('[data-football-panel="club"]')).toBeVisible();
  expect(await page.locator("[data-transfer-offers] .offer-card").count()).toBeGreaterThanOrEqual(1);
  await page.locator("[data-offer-accept]").first().click();
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
  await finishPreseason(page); await page.locator("[data-match]").click();
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
  await finishPreseason(page); for (let i = 0; i < 38; i++) await page.locator("[data-quick-match]").click();
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
  expect(fiscal.maintenance).toBe(55_000_000);
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

  await finishPreseason(page); await page.locator("[data-match]").click();
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
  await finishPreseason(page); await page.locator("[data-quick-match]").click();
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

  await finishPreseason(page); await page.locator("[data-quick-match]").click();
  await finishPreseason(page); await page.locator("[data-quick-match]").click();
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
  await finishPreseason(page); await page.locator("[data-match]").click();
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


test("選手をサブポジションへコンバートしメインポジションへ昇格できる", async ({ page }) => {
  await page.goto(url); await page.locator("[data-start]").click();
  await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), saveKey);
  const picked = await page.evaluate((key) => { const st=JSON.parse(localStorage.getItem(key)!); const p=st.squad.find((x:any)=>!x.pos.includes("GK")); return {id:p.id,main:p.pos[0]}; }, saveKey);
  await page.locator(`[data-profile="${picked.id}"]`).first().click();
  const target = await page.locator("[data-convert-target] option").first().getAttribute("value"); expect(target).toBeTruthy();
  await page.locator("[data-convert-target]").selectOption(target!); await page.locator("[data-start-conversion]").click();
  await expect(page.locator("[data-cancel-conversion]")).toBeVisible();
  await page.evaluate(({key,id})=>{const st=JSON.parse(localStorage.getItem(key)!);const p=st.squad.find((x:any)=>x.id===id);p.conversionProgress=96;localStorage.setItem(key,JSON.stringify(st));},{key:saveKey,id:picked.id});
  await page.reload(); await page.locator("[data-continue]").click(); await finishPreseason(page); await page.locator("[data-quick-match]").click();
  const learned = await page.evaluate(({key,id})=>JSON.parse(localStorage.getItem(key)!).squad.find((x:any)=>x.id===id),{key:saveKey,id:picked.id});
  expect(learned.pos).toContain(target); expect(learned.conversionTarget).toBe("");
  await page.locator(`[data-profile="${picked.id}"]`).first().click(); await page.locator(`[data-promote-position="${target}"]`).click();
  const promoted = await page.evaluate(({key,id})=>JSON.parse(localStorage.getItem(key)!).squad.find((x:any)=>x.id===id),{key:saveKey,id:picked.id});
  expect(promoted.pos[0]).toBe(target); expect(promoted.pos).toContain(picked.main);
});


test("戦術ボードをドラッグして基本と攻撃時の先発配置を入れ替えられる", async ({ page }) => {
  await page.goto(url); await page.locator("[data-start]").click();
  await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), saveKey);
  const baseA=page.locator("[data-pitch-player]").nth(1),baseB=page.locator("[data-pitch-player]").nth(4);
  const a=Number(await baseA.getAttribute("data-lineup-index")),b=Number(await baseB.getAttribute("data-lineup-index"));
  const before=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey); await baseA.dragTo(baseB);
  const after=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey);
  expect(after.lineup[a]).toBe(before.lineup[b]); expect(after.lineup[b]).toBe(before.lineup[a]);
  await page.locator('[data-board-phase="attack"]').click();
  const atkA=page.locator("[data-pitch-player]").nth(2),atkB=page.locator("[data-pitch-player]").nth(7);
  const atkBefore=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey);
  const idA=await atkA.getAttribute("data-pitch-player"),idB=await atkB.getAttribute("data-pitch-player"); await atkA.dragTo(atkB);
  const atkAfter=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey);
  expect(atkAfter.lineup).toEqual(after.lineup); expect(atkAfter.attackLineup.indexOf(idA)).toBe(atkBefore.attackLineup.indexOf(idB)); expect(atkAfter.attackLineup.indexOf(idB)).toBe(atkBefore.attackLineup.indexOf(idA));
});


test("スマホでは長押しドラッグで戦術ボードの先発を入れ替えられる", async ({ browser }) => {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}); const page=await context.newPage();
  await page.goto(url); await page.locator("[data-start]").click(); await page.waitForFunction((key)=>Boolean(localStorage.getItem(key)),saveKey);
  const a=page.locator("[data-pitch-player]").nth(1),b=page.locator("[data-pitch-player]").nth(4),ab=await a.boundingBox(),bb=await b.boundingBox();
  expect(ab).toBeTruthy(); expect(bb).toBeTruthy(); const from=Number(await a.getAttribute("data-lineup-index")),to=Number(await b.getAttribute("data-lineup-index"));
  const before=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey),ax=ab!.x+ab!.width/2,ay=ab!.y+ab!.height/2,bx=bb!.x+bb!.width/2,by=bb!.y+bb!.height/2;
  await a.dispatchEvent("pointerdown",{pointerId:9,pointerType:"touch",button:0,clientX:ax,clientY:ay}); await page.waitForTimeout(320);
  await a.dispatchEvent("pointermove",{pointerId:9,pointerType:"touch",button:0,clientX:bx,clientY:by});
  await a.dispatchEvent("pointerup",{pointerId:9,pointerType:"touch",button:0,clientX:bx,clientY:by});
  const after=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey); expect(after.lineup[from]).toBe(before.lineup[to]); expect(after.lineup[to]).toBe(before.lineup[from]);
  await context.close();
});


test("全選手に利き足がありプロフィールと戦術ボードで確認できる", async ({ page }) => {
  await page.goto(url); await page.locator("[data-start]").click();
  await page.waitForFunction((key)=>Boolean(localStorage.getItem(key)),saveKey);
  const state=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey);
  expect(state.squad.every((p:any)=>p.preferredFoot==="R"||p.preferredFoot==="L")).toBe(true);
  const all=[...state.squad,...Object.values(state.rivalSquads||{}).flat(),...Object.values(state.worldSquads||{}).flat()] as any[];
  const wide=all.filter((p:any)=>["LW","LM","RW","RM"].includes(p.pos?.[0]));
  const inverted=wide.filter((p:any)=>["LW","LM"].includes(p.pos[0])?p.preferredFoot==="R":p.preferredFoot==="L");
  expect(wide.length).toBeGreaterThan(30); expect(inverted.length/wide.length).toBeGreaterThan(.6); expect(inverted.length/wide.length).toBeLessThan(.8);
  const id=state.lineup[0],player=state.squad.find((p:any)=>p.id===id),label=player.preferredFoot==="L"?"左足":"右足";
  await page.locator(`[data-pitch-player="${id}"]`).click();
  await expect(page.locator("[data-tactical-player-detail]")).toContainText(label);
  await expect(page.locator("[data-player-detail]")).toContainText(label);
  await page.locator('[data-football-tab="squad"]').click();
  await expect(page.locator("[data-squad-table]")).toContainText(label);
  await page.evaluate((key)=>{const st=JSON.parse(localStorage.getItem(key)!);st.preferredFootModel=1;const all=[...st.squad,...Object.values(st.rivalSquads||{}).flat(),...Object.values(st.worldSquads||{}).flat()] as any[];for(const p of all){if(["LW","LM"].includes(p.pos?.[0]))p.preferredFoot="L";if(["RW","RM"].includes(p.pos?.[0]))p.preferredFoot="R"}localStorage.setItem(key,JSON.stringify(st))},saveKey);
  await page.reload(); await page.locator("[data-continue]").click(); await page.waitForFunction((key)=>JSON.parse(localStorage.getItem(key)!).preferredFootModel===2,saveKey);
  const migrated=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey),mAll=[...migrated.squad,...Object.values(migrated.rivalSquads||{}).flat(),...Object.values(migrated.worldSquads||{}).flat()] as any[],mWide=mAll.filter((p:any)=>["LW","LM","RW","RM"].includes(p.pos?.[0])),mInv=mWide.filter((p:any)=>["LW","LM"].includes(p.pos[0])?p.preferredFoot==="R":p.preferredFoot==="L");
  expect(mInv.length/mWide.length).toBeGreaterThan(.6); expect(mInv.length/mWide.length).toBeLessThan(.8);
});

test("新シーズンは5日間のプレシーズン後に開幕し夏移籍期間は10日ある", async ({ page }) => {
  await page.goto(url); await page.locator("[data-start]").click();
  await expect(page.locator("[data-preseason-panel]")).toBeVisible();
  await expect(page.locator("[data-preseason-day]")).toHaveText("DAY 1 / 5");
  await page.locator("[data-preseason-action]").click();
  await expect(page.locator("[data-preseason-action]")).toContainText("プレシーズンマッチ");
  await page.locator("[data-preseason-action]").click();
  let st=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey);
  expect(st.week).toBe(1); expect(st.preseasonResults).toHaveLength(1);
  expect(st.offers.some((o:any)=>o.status==="pending")).toBe(true);
  for(let i=0;i<3;i++) await page.locator("[data-preseason-action]").click();
  await expect(page.locator("[data-preseason-panel]")).toBeHidden();
  st=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey);
  expect(st.preseasonDone).toBe(true); expect(st.summerDay).toBe(6); expect(st.week).toBe(1);
  await page.locator('[data-football-tab="market"]').click();
  await expect(page.locator("[data-market-window]")).toContainText("DAY 6 / 10");
  for(let i=0;i<5;i++) await page.locator("[data-quick-match]").click();
  st=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey);
  expect(st.summerDay).toBe(11); expect(st.week).toBe(6);
  await expect(page.locator("[data-window-status]")).toHaveText("WINDOW CLOSED");
});
test("旧セーブの施設はLv1へ移行し、Lv10強化と有料グレードダウンができる", async ({ page }) => {
  await page.goto(url); await page.locator("[data-start]").click();
  await page.waitForFunction((key)=>Boolean(localStorage.getItem(key)),saveKey);
  await page.evaluate((key)=>{const st=JSON.parse(localStorage.getItem(key)!);st.budget=5_000_000_000;st.facilities={training:true,recovery:false,academy:true,stadium:false};localStorage.setItem(key,JSON.stringify(st))},saveKey);
  await page.reload(); await page.locator("[data-continue]").click();
  await page.locator('[data-football-tab="club"]').click();
  await expect(page.locator('[data-facility-level="training"]')).toHaveText("Lv1");
  await expect(page.locator('[data-facility-level="academy"]')).toHaveText("Lv1");
  const before=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey);
  await page.locator('[data-facility="training"]').click();
  let after=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey);
  expect(after.facilities.training).toBe(2); expect(before.budget-after.budget).toBe(65_000_000);
  await expect(page.locator('[data-facility-info="training"]')).toContainText("成長XP +8%");
  await page.evaluate((key)=>{const st=JSON.parse(localStorage.getItem(key)!);st.facilities.training=9;st.budget=1_000_000_000;localStorage.setItem(key,JSON.stringify(st))},saveKey);
  await page.reload(); await page.locator("[data-continue]").click(); await page.locator('[data-football-tab="club"]').click();
  await page.locator('[data-facility="training"]').click();
  after=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey);
  expect(after.facilities.training).toBe(10); expect(after.budget).toBe(660_000_000);
  await expect(page.locator('[data-facility="training"]')).toHaveText("Lv10 MAX");
  const beforeDown=after.budget; await page.locator('[data-facility-demolish="training"]').click();
  after=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey);
  expect(after.facilities.training).toBe(9); expect(beforeDown-after.budget).toBe(10_200_000);
  await expect(page.locator('[data-facility-level="training"]')).toHaveText("Lv9");
  await page.locator('[data-facility-demolish="academy"]').click();
  after=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey);
  expect(after.facilities.academy).toBe(0);
  await expect(page.locator('[data-facility-level="academy"]')).toHaveText("Lv0");
});

test("10年進めてもAIクラブは若手を補充し高齢化し続けない", async ({ page }) => {
  await page.goto(url); await page.locator("[data-start]").click();
  await page.waitForFunction((key)=>Boolean(localStorage.getItem(key)),saveKey);
  await page.evaluate((key)=>{const st=JSON.parse(localStorage.getItem(key)!);st.seed=123456789;localStorage.setItem(key,JSON.stringify(st))},saveKey);
  const youthPositions=new Set<string>();
  for(let i=0;i<10;i++){
    const before=await page.evaluate((key)=>{const st=JSON.parse(localStorage.getItem(key)!);st.complete=true;st.history.push({season:st.season,rank:5,points:55,record:"16勝7分15敗",prize:60_000_000});localStorage.setItem(key,JSON.stringify(st));return st.season},saveKey);
    await page.reload(); await page.locator("[data-continue]").click(); await page.locator("[data-next-season]").click();
    await page.waitForFunction(({key,before})=>JSON.parse(localStorage.getItem(key)!).season===before+1,{key:saveKey,before});
    const pos=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!).squad.filter((p:any)=>String(p.id).startsWith("y_")&&p.age<=20).map((p:any)=>p.pos[0]),saveKey);
    for(const p of pos)youthPositions.add(p);
  }
  const stats=await page.evaluate((key)=>{const st=JSON.parse(localStorage.getItem(key)!);const bags=[...Object.values(st.rivalSquads||{}),...Object.values(st.worldSquads||{})] as any[][];return bags.map(r=>({n:r.length,avg:r.reduce((a:number,p:any)=>a+p.age,0)/r.length,youth:r.some((p:any)=>p.age<=20),pot94:r.some((p:any)=>String(p.id).startsWith("aiy_")&&p.pot===94),maxPot:Math.max(...r.map((p:any)=>p.pot))}))},saveKey);
  expect(stats.length).toBeGreaterThan(30); expect(stats.every(x=>x.n>=20&&x.n<=21)).toBe(true);
  expect(Math.max(...stats.map(x=>x.avg))).toBeLessThan(29.5); expect(stats.every(x=>x.youth)).toBe(true);
  expect(stats.some(x=>x.pot94)).toBe(true); expect(Math.max(...stats.map(x=>x.maxPot))).toBe(94);
  expect(youthPositions.size).toBeGreaterThanOrEqual(4);
  expect([...youthPositions].some(p=>["DM","CM","AM","LM","RM"].includes(p))).toBe(true);
  expect([...youthPositions].some(p=>["LW","RW","ST"].includes(p))).toBe(true);
});

test("Lv10施設の年間維持費と累進オーナー徴収を新シーズンに反映する", async ({ page }) => {
  await page.goto(url); await page.locator("[data-start]").click();
  await page.waitForFunction((key)=>Boolean(localStorage.getItem(key)),saveKey);
  await page.evaluate((key)=>{const st=JSON.parse(localStorage.getItem(key)!);st.budget=2_000_000_000;st.facilities={training:10,recovery:10,academy:10,stadium:10};st.complete=true;st.history.push({season:st.season,rank:1,points:90,record:"28勝6分4敗",prize:220_000_000});localStorage.setItem(key,JSON.stringify(st))},saveKey);
  await page.reload(); await page.locator("[data-continue]").click(); await page.locator("[data-next-season]").click();
  const st=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey);
  expect(st.lastReserveLevy).toBeGreaterThan(1_000_000_000);
  expect(st.lastFacilityMaintenance).toBe(1_045_000_000);
  expect(st.budget).toBeLessThan(1_000_000_000);
  await page.locator('[data-football-tab="club"]').click();
  await expect(page.locator("[data-facility-maintenance]")).toHaveText("¥1,045,000,000");
  await expect(page.locator("[data-facility-count]")).toContainText("総Lv 40/40");
});

test("プレシーズン導入前の既存v5セーブは現在季を維持し次季から適用する", async ({ page }) => {
  await page.goto(url); await page.locator("[data-start]").click();
  await page.waitForFunction((key)=>Boolean(localStorage.getItem(key)),saveKey);
  await page.evaluate((key)=>{const st=JSON.parse(localStorage.getItem(key)!);st.week=12;delete st.preseasonDone;delete st.preseasonDay;delete st.summerDay;localStorage.setItem(key,JSON.stringify(st))},saveKey);
  await page.reload(); await page.locator("[data-continue]").click();
  await page.waitForFunction((key)=>{const st=JSON.parse(localStorage.getItem(key)||"null");return st?.week===12&&st?.preseasonDone===true},saveKey);
  await expect(page.locator("[data-preseason-panel]")).toBeHidden();
  let st=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey);
  expect(st.week).toBe(12); expect(st.preseasonDone).toBe(true);
  await page.evaluate((key)=>{const st=JSON.parse(localStorage.getItem(key)!);st.complete=true;st.history.push({season:st.season,rank:5,points:55,record:"16勝7分15敗",prize:60_000_000});localStorage.setItem(key,JSON.stringify(st))},saveKey);
  await page.reload(); await page.locator("[data-continue]").click(); await page.locator("[data-next-season]").click();
  await expect(page.locator("[data-preseason-panel]")).toBeVisible();
  await expect(page.locator("[data-preseason-day]")).toHaveText("DAY 1 / 5");
  st=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!),saveKey);
  expect(st.summerDay).toBe(1); expect(st.preseasonDone).toBe(false);
});


test("academy Lv10 uses weighted POT rolls instead of guaranteed 94", async ({ page }) => {
  await page.goto(url); await page.locator("[data-start]").click();
  await page.waitForFunction((key)=>Boolean(localStorage.getItem(key)),saveKey);
  await page.evaluate((key)=>{const st=JSON.parse(localStorage.getItem(key)!);st.seed=123456789;st.budget=100_000_000_000;st.facilities.academy=10;localStorage.setItem(key,JSON.stringify(st))},saveKey);
  const pots:number[]=[];
  for(let i=0;i<4;i++){
    const before=await page.evaluate((key)=>{const st=JSON.parse(localStorage.getItem(key)!);st.complete=true;st.history.push({season:st.season,rank:5,points:55,record:"16-7-15",prize:60_000_000});localStorage.setItem(key,JSON.stringify(st));return st.season},saveKey);
    await page.reload(); await page.locator("[data-continue]").click(); await page.locator("[data-next-season]").click();
    await page.waitForFunction(({key,before})=>JSON.parse(localStorage.getItem(key)!).season===before+1,{key:saveKey,before});
    const generated=await page.evaluate((key)=>{const st=JSON.parse(localStorage.getItem(key)!);return st.squad.filter((p:any)=>String(p.id).startsWith(`y_${st.seed}_${st.season}_`)).map((p:any)=>p.pot)},saveKey);
    pots.push(...generated);
  }
  expect(pots.length).toBeGreaterThanOrEqual(16);
  expect(pots.every(p=>p>=82&&p<=94)).toBe(true);
  expect(pots.some(p=>p>=90)).toBe(true);
  expect(pots.some(p=>p<94)).toBe(true);
});


test("incoming transfer offers vary by day, count, and buyer club", async ({ page }) => {
  await page.goto(url); await page.locator("[data-start]").click();
  await page.waitForFunction((key)=>Boolean(localStorage.getItem(key)),saveKey);
  await page.evaluate((key)=>{const st=JSON.parse(localStorage.getItem(key)!);st.seed=12345;st.offers=[];delete st.lastOfferGenerationKey;for(const p of st.squad)p.transferListed=true;localStorage.setItem(key,JSON.stringify(st))},saveKey);
  await page.reload(); await page.locator("[data-continue]").click();
  const batchCounts:number[]=[]; const buyerIds:string[]=[];
  const collectAndReject=async()=>{
    const pending=await page.evaluate((key)=>JSON.parse(localStorage.getItem(key)!).offers.filter((o:any)=>o.status==="pending").map((o:any)=>({clubId:o.clubId,id:o.id})),saveKey);
    batchCounts.push(pending.length); buyerIds.push(...pending.map((o:any)=>o.clubId));
    if(pending.length){await page.locator('[data-football-tab="club"]').click();while(await page.locator("[data-offer-reject]").count())await page.locator("[data-offer-reject]").first().click()}
  };
  for(let i=0;i<5;i++){await page.locator("[data-preseason-action]").click();await collectAndReject()}
  for(let i=0;i<5;i++){await page.locator("[data-quick-match]").click();await collectAndReject()}
  expect(batchCounts).toHaveLength(10);
  expect(batchCounts.some(n=>n===0)).toBe(true);
  expect(batchCounts.some(n=>n===2)).toBe(true);
  expect(buyerIds.length).toBeGreaterThanOrEqual(4);
  expect(new Set(buyerIds).size).toBeGreaterThanOrEqual(3);
});
