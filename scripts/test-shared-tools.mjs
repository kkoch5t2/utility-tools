import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const PORT = 8792;
const BASE = `http://127.0.0.1:${PORT}`;
const wranglerCli = "node_modules/wrangler/bin/wrangler.js";
const worker = spawn(process.execPath,[wranglerCli,"dev","--config","wrangler.jsonc","--local","--port",String(PORT)],{stdio:["ignore","pipe","pipe"],detached:true});
let log="";
worker.stdout.on("data",c=>{log+=c.toString()});
worker.stderr.on("data",c=>{log+=c.toString()});
const assert=(v,m)=>{if(!v)throw new Error(m)};
async function waitText(page, selector, expected) {
  await page.waitForFunction(
    ({ selector, expected }) => document.querySelector(selector)?.textContent?.includes(expected),
    { selector, expected },
    { timeout: 5000 },
  );
}
async function waitServer(){const end=Date.now()+30000;while(Date.now()<end){try{const r=await fetch(BASE+"/api/health");if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,250))}throw new Error("server did not start\n"+log)}
let browser;
try{
  await waitServer();
  browser=await chromium.launch({headless:true});

  // poll
  const pollOwnerCtx=await browser.newContext();
  const pollOwner=await pollOwnerCtx.newPage();
  await pollOwner.goto(BASE+"/poll/");
  await pollOwner.locator("#poll-title").fill("ランチ投票");
  await pollOwner.locator("#poll-options").fill("寿司\n焼肉\nカレー");
  await pollOwner.getByRole("button",{name:"投票を作成"}).click();
  await pollOwner.waitForURL(/\/poll\/\?id=/);
  const pollUrl=pollOwner.url().replace("&created=1","");
  const pollGuestCtx=await browser.newContext();
  const pollGuest=await pollGuestCtx.newPage();
  await pollGuest.goto(pollUrl);
  await pollGuest.locator('[name="poll-option"]').nth(1).check();
  await pollGuest.getByRole("button",{name:"投票する"}).click();
  await pollGuest.getByRole("button",{name:"投票を変更"}).waitFor({state:"visible"});
  await waitText(pollGuest,"[data-total]","1票");
  await pollGuest.locator('[name="poll-option"]').nth(0).check();
  await pollGuest.getByRole("button",{name:"投票を変更"}).click();
  pollGuest.once("dialog",d=>d.accept());
  await pollGuest.getByRole("button",{name:"投票を取り消す"}).click();
  await waitText(pollGuest,"[data-total]","0票");
  pollOwner.once("dialog",d=>d.accept());
  await pollOwner.getByRole("button",{name:"この投票を削除"}).click();
  await pollOwner.waitForURL(BASE+"/poll/");
  await pollGuestCtx.close(); await pollOwnerCtx.close();

  // attendance
  const attOwnerCtx=await browser.newContext();
  const attOwner=await attOwnerCtx.newPage();
  await attOwner.goto(BASE+"/attendance/");
  await attOwner.locator("#attendance-title").fill("歓迎会");
  await attOwner.locator("#attendance-date").fill("10/10 19:00");
  await attOwner.locator("#attendance-place").fill("東京駅");
  await attOwner.getByRole("button",{name:"出欠確認を作成"}).click();
  await attOwner.waitForURL(/\/attendance\/\?id=/);
  const attUrl=attOwner.url().replace("&created=1","");
  const attGuestCtx=await browser.newContext();
  const attGuest=await attGuestCtx.newPage();
  await attGuest.goto(attUrl);
  await attGuest.locator("[data-name]").fill("鈴木");
  await attGuest.locator('input[name="attendance-status"][value="maybe"]').check();
  await attGuest.locator("[data-comment]").fill("調整中");
  await attGuest.getByRole("button",{name:"回答を送信"}).click();
  await attGuest.getByRole("button",{name:"回答を更新"}).waitFor({state:"visible"});
  await waitText(attGuest,"[data-count-maybe]","1");
  await attGuest.locator('input[name="attendance-status"][value="yes"]').check();
  await attGuest.getByRole("button",{name:"回答を更新"}).click();
  await waitText(attGuest,"[data-count-yes]","1");
  attGuest.once("dialog",d=>d.accept());
  await attGuest.getByRole("button",{name:"自分の回答を削除"}).click();
  await waitText(attGuest,"[data-count-yes]","0");
  attOwner.once("dialog",d=>d.accept());
  await attOwner.getByRole("button",{name:"この出欠確認を削除"}).click();
  await attOwner.waitForURL(BASE+"/attendance/");
  await attGuestCtx.close(); await attOwnerCtx.close();

  // split bill
  const splitOwnerCtx=await browser.newContext();
  const splitOwner=await splitOwnerCtx.newPage();
  await splitOwner.goto(BASE+"/split-bill/");
  await splitOwner.locator("#split-title").fill("旅行精算");
  await splitOwner.locator("#split-members").fill("田中\n鈴木\n佐藤");
  await splitOwner.getByRole("button",{name:"割り勘を作成"}).click();
  await splitOwner.waitForURL(/\/split-bill\/\?id=/);
  const splitUrl=splitOwner.url().replace("&created=1","");
  await splitOwner.locator("[data-payer]").selectOption("田中");
  await splitOwner.locator("[data-amount]").fill("12000");
  await splitOwner.locator("[data-memo]").fill("ホテル");
  await splitOwner.getByRole("button",{name:"支払いを追加"}).click();
  await waitText(splitOwner,"[data-total]","12,000円");
  assert((await splitOwner.locator("[data-settlements]").textContent())?.includes("鈴木 → 田中"),"split settlement should include Suzuki");
  assert((await splitOwner.locator("[data-settlements]").textContent())?.includes("佐藤 → 田中"),"split settlement should include Sato");

  const splitGuestCtx=await browser.newContext();
  const splitGuest=await splitGuestCtx.newPage();
  await splitGuest.goto(splitUrl);
  await splitGuest.locator("[data-payer]").selectOption("鈴木");
  await splitGuest.locator("[data-amount]").fill("3000");
  await splitGuest.locator("[data-memo]").fill("タクシー");
  const checks=splitGuest.locator("[data-members] input");
  await checks.nth(0).uncheck();
  await splitGuest.getByRole("button",{name:"支払いを追加"}).click();
  await waitText(splitGuest,"[data-total]","15,000円");
  await splitGuest.locator(".expense-edit").click();
  await splitGuest.locator("[data-amount]").fill("4000");
  await splitGuest.getByRole("button",{name:"支払いを更新"}).click();
  await waitText(splitGuest,"[data-total]","16,000円");
  await splitGuest.locator(".expense-edit").click();
  splitGuest.once("dialog",d=>d.accept());
  await splitGuest.getByRole("button",{name:"この支払いを削除"}).click();
  await waitText(splitGuest,"[data-total]","12,000円");
  splitOwner.once("dialog",d=>d.accept());
  await splitOwner.getByRole("button",{name:"この割り勘を削除"}).click();
  await splitOwner.waitForURL(BASE+"/split-bill/");
  await splitGuestCtx.close(); await splitOwnerCtx.close();

  console.log("Shared tools E2E OK: poll / attendance / split bill.");
} finally {
  await browser?.close().catch(()=>{});
  try{if(worker.pid)process.kill(-worker.pid,"SIGTERM")}catch{}
}
