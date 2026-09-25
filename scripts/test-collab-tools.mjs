import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const PORT=8793;
const BASE=`http://127.0.0.1:${PORT}`;
const wranglerCli="node_modules/wrangler/bin/wrangler.js";
const worker=spawn(process.execPath,[wranglerCli,"dev","--config","wrangler.jsonc","--local","--port",String(PORT)],{stdio:["ignore","pipe","pipe"],detached:true});
let log="";worker.stdout.on("data",c=>log+=c.toString());worker.stderr.on("data",c=>log+=c.toString());
const assert=(v,m)=>{if(!v)throw new Error(m)};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function waitServer(){const end=Date.now()+30000;while(Date.now()<end){try{const r=await fetch(BASE+"/api/health");if(r.ok)return}catch{}await wait(250)}throw new Error("server did not start\n"+log)}
let browser;
try{
  await waitServer();
  browser=await chromium.launch({headless:true});

  console.log('TEST survey');
  // survey
  {
    const ownerCtx=await browser.newContext(), owner=await ownerCtx.newPage();
    await owner.goto(BASE+"/survey/");
    await owner.locator("#survey-title").fill("社内アンケート");
    await owner.locator("#survey-questions").fill("単一: 好きな昼食は？\n寿司\n焼肉\n\n評価: 満足度");
    await owner.getByRole("button",{name:"アンケートを作成"}).click();
    await owner.waitForURL(/\/survey\/\?id=/);
    const url=owner.url().replace("&created=1","");
    const guestCtx=await browser.newContext(), guest=await guestCtx.newPage();
    await guest.goto(url);
    await guest.locator('input[name="q-1"]').first().check();
    await guest.locator('input[name="q-2"][value="5"]').check();
    await guest.getByRole("button",{name:"回答を送信"}).click();
    await guest.getByRole("button",{name:"回答を更新"}).waitFor();
    assert((await guest.locator("[data-count]").textContent())==="1件回答","survey response count");
    guest.once("dialog",d=>d.accept());
    await guest.getByRole("button",{name:"回答を取り消す"}).click();
    await wait(100);
    assert((await guest.locator("[data-count]").textContent())==="0件回答","survey delete response");
    owner.once("dialog",d=>d.accept());
    await owner.getByRole("button",{name:"このアンケートを削除"}).click();
    await owner.waitForURL(BASE+"/survey/");
    await guestCtx.close();await ownerCtx.close();
  }

  console.log('TEST lottery');
  // lottery order
  {
    const ownerCtx=await browser.newContext(),owner=await ownerCtx.newPage();
    await owner.goto(BASE+"/lottery-order/");
    await owner.locator("#lottery-title").fill("発表順");
    await owner.getByRole("button",{name:"抽選ページを作成"}).click();
    await owner.waitForURL(/\/lottery-order\/\?id=/);
    const url=owner.url().replace("&created=1","");
    const g1c=await browser.newContext(),g1=await g1c.newPage();await g1.goto(url);await g1.locator("[data-name]").fill("田中");await g1.getByRole("button",{name:"参加登録"}).click();await wait(100);
    const g2c=await browser.newContext(),g2=await g2c.newPage();await g2.goto(url);await g2.locator("[data-name]").fill("鈴木");await g2.getByRole("button",{name:"参加登録"}).click();await wait(100);
    await owner.goto(url+"&created=1");
    assert((await owner.locator("[data-count]").textContent())==="2人参加","lottery participants");
    owner.once("dialog",d=>d.accept());
    await owner.getByRole("button",{name:"順番を抽選する"}).click();
    await owner.locator(".rank-row").first().waitFor();
    assert(await owner.locator(".rank-row").count()===2,"lottery order count");
    owner.once("dialog",d=>d.accept());
    await owner.getByRole("button",{name:"この抽選を削除"}).click();
    await owner.waitForURL(BASE+"/lottery-order/");
    await g1c.close();await g2c.close();await ownerCtx.close();
  }

  console.log('TEST availability');
  // availability
  {
    const ownerCtx=await browser.newContext(),owner=await ownerCtx.newPage();
    await owner.goto(BASE+"/availability-match/");
    await owner.locator("#availability-title").fill("打ち合わせ");
    await owner.locator("#availability-slots").fill("10/1 19:00\n10/1 20:00\n10/2 19:00");
    await owner.getByRole("button",{name:"候補時間を作成"}).click();
    await owner.waitForURL(/\/availability-match\/\?id=/);
    const url=owner.url().replace("&created=1","");
    const guestCtx=await browser.newContext(),guest=await guestCtx.newPage();await guest.goto(url);
    await guest.locator("[data-name]").fill("山田");
    await guest.locator("[data-slots] input").nth(0).check();await guest.locator("[data-slots] input").nth(1).check();
    await guest.getByRole("button",{name:"回答を送信"}).click();await guest.getByRole("button",{name:"回答を更新"}).waitFor();
    assert((await guest.locator("[data-count]").textContent())==="1人回答","availability count");
    guest.once("dialog",d=>d.accept());await guest.getByRole("button",{name:"回答を削除"}).click();await wait(100);
    assert((await guest.locator("[data-count]").textContent())==="0人回答","availability delete");
    owner.once("dialog",d=>d.accept());await owner.getByRole("button",{name:"この候補を削除"}).click();await owner.waitForURL(BASE+"/availability-match/");
    await guestCtx.close();await ownerCtx.close();
  }

  console.log('TEST packing');
  // packing assignment
  {
    const ownerCtx=await browser.newContext(),owner=await ownerCtx.newPage();
    await owner.goto(BASE+"/packing-list/");
    await owner.locator("#packing-title").fill("BBQ");
    await owner.locator("#packing-items").fill("炭\n紙皿\n飲み物");
    await owner.getByRole("button",{name:"分担表を作成"}).click();await owner.waitForURL(/\/packing-list\/\?id=/);
    const url=owner.url().replace("&created=1","");
    const guestCtx=await browser.newContext(),guest=await guestCtx.newPage();await guest.goto(url);await guest.locator("[data-name]").fill("佐藤");
    await guest.getByRole("button",{name:"担当する"}).first().click();await wait(100);
    assert((await guest.locator("[data-progress]").textContent())==="1 / 3 担当済み","packing claim");
    guest.once("dialog",d=>d.accept());await guest.getByRole("button",{name:"担当を外す"}).click();await wait(100);
    assert((await guest.locator("[data-progress]").textContent())==="0 / 3 担当済み","packing release");
    owner.once("dialog",d=>d.accept());await owner.getByRole("button",{name:"この分担表を削除"}).click();await owner.waitForURL(BASE+"/packing-list/");
    await guestCtx.close();await ownerCtx.close();
  }

  console.log('TEST checklist');
  // shared checklist
  {
    const ownerCtx=await browser.newContext(),owner=await ownerCtx.newPage();
    await owner.goto(BASE+"/shared-checklist/");
    await owner.locator("#check-title").fill("旅行準備");await owner.locator("#check-tasks").fill("ホテル予約\n切符購入");
    await owner.getByRole("button",{name:"チェックリストを作成"}).click();await owner.waitForURL(/\/shared-checklist\/\?id=/);
    const url=owner.url().replace("&created=1","");
    const guestCtx=await browser.newContext(),guest=await guestCtx.newPage();await guest.goto(url);
    await guest.locator(".check-row input").first().check();await wait(100);
    assert((await guest.locator("[data-progress]").textContent())==="1 / 2 完了","checklist toggle");
    await guest.locator("[data-new-task]").fill("Wi-Fi受取");await guest.getByRole("button",{name:"追加"}).click();await wait(100);
    assert(await guest.locator(".check-row").count()===3,"checklist add");
    guest.once("dialog",d=>d.accept());await guest.locator(".check-row").last().getByRole("button",{name:"削除"}).click();await wait(100);
    assert(await guest.locator(".check-row").count()===2,"checklist remove");
    owner.once("dialog",d=>d.accept());await owner.getByRole("button",{name:"このリストを削除"}).click();await owner.waitForURL(BASE+"/shared-checklist/");
    await guestCtx.close();await ownerCtx.close();
  }

  console.log('TEST ranking');
  // candidate ranking
  {
    const ownerCtx=await browser.newContext(),owner=await ownerCtx.newPage();
    await owner.goto(BASE+"/candidate-ranking/");
    await owner.locator("#ranking-title").fill("旅行先");await owner.locator("#ranking-options").fill("北海道\n沖縄\n京都");
    await owner.getByRole("button",{name:"ランキングを作成"}).click();await owner.waitForURL(/\/candidate-ranking\/\?id=/);
    const url=owner.url().replace("&created=1","");
    const guestCtx=await browser.newContext(),guest=await guestCtx.newPage();await guest.goto(url);
    await guest.getByRole("button",{name:"回答を送信"}).click();await guest.getByRole("button",{name:"回答を更新"}).waitFor();
    assert((await guest.locator("[data-count]").textContent())==="1件回答","ranking count");
    await guest.locator("[data-rank]").nth(0).selectOption("2");await guest.locator("[data-rank]").nth(1).selectOption("1");
    await guest.getByRole("button",{name:"回答を更新"}).click();await wait(100);
    guest.once("dialog",d=>d.accept());await guest.getByRole("button",{name:"回答を取り消す"}).click();await wait(100);
    assert((await guest.locator("[data-count]").textContent())==="0件回答","ranking delete");
    owner.once("dialog",d=>d.accept());await owner.getByRole("button",{name:"このランキングを削除"}).click();await owner.waitForURL(BASE+"/candidate-ranking/");
    await guestCtx.close();await ownerCtx.close();
  }

  console.log('TEST team');
  // browser-only team divider
  {
    const page=await browser.newPage();await page.goto(BASE+"/team-divider/");
    await page.locator("#team-names").fill("A\nB\nC\nD\nE");await page.locator("#team-count").fill("2");await page.getByRole("button",{name:"チーム分けする"}).click();
    assert(await page.locator(".team-result").count()===2,"team divider result");
    await page.close();
  }

  console.log('TEST seating');
  // browser-only seating
  {
    const page=await browser.newPage();await page.goto(BASE+"/seat-shuffle/");
    await page.locator("#seat-names").fill("A\nB\nC\nD");await page.locator("#seat-rows").fill("2");await page.locator("#seat-cols").fill("2");await page.getByRole("button",{name:"席を決める"}).click();
    assert(await page.locator(".seat").count()===4,"seat shuffle result");
    await page.close();
  }

  console.log('TEST travel');
  // travel expense
  {
    const ownerCtx=await browser.newContext(),owner=await ownerCtx.newPage();await owner.goto(BASE+"/travel-expense/");
    await owner.locator("#split-title").fill("沖縄旅行");await owner.locator("#split-members").fill("A\nB\nC");await owner.getByRole("button",{name:"旅行精算を作成"}).click();
    await owner.waitForURL(/\/travel-expense\/\?id=/);await owner.locator("[data-payer]").selectOption("A");await owner.locator("[data-amount]").fill("9000");await owner.locator("[data-memo]").fill("ホテル");await owner.getByRole("button",{name:"支払いを追加"}).click();await wait(100);
    assert((await owner.locator("[data-total]").textContent())?.includes("9,000円"),"travel total");
    owner.once("dialog",d=>d.accept());await owner.getByRole("button",{name:"この旅行精算を削除"}).click();await owner.waitForURL(BASE+"/travel-expense/");
    await ownerCtx.close();
  }

  console.log("Extended tool E2E OK: survey / lottery / availability / packing / checklist / ranking / team / seating / travel expense.");
} finally {
  await browser?.close().catch(()=>{});
  try{if(worker.pid)process.kill(-worker.pid,"SIGTERM")}catch{}
}
