import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const PORT = 8791;
const BASE = `http://127.0.0.1:${PORT}`;
const CONFIG = "wrangler.jsonc";

const wranglerCli = "node_modules/wrangler/bin/wrangler.js";
const worker = spawn(
  process.execPath,
  [wranglerCli, "dev", "--config", CONFIG, "--local", "--port", String(PORT)],
  { stdio: ["ignore", "pipe", "pipe"], detached: true },
);

let workerLog = "";
worker.stdout.on("data", (chunk) => { workerLog += chunk.toString(); });
worker.stderr.on("data", (chunk) => { workerLog += chunk.toString(); });

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE + "/api/health");
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Schedule test server did not start.\n" + workerLog);
}

function assert(value, message) {
  if (!value) throw new Error(message);
}
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });

  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  await owner.goto(BASE + "/schedule/");
  await owner.locator("[data-create-view]").waitFor({ state: "visible" });
  assert(await owner.locator("[data-loading]").isHidden(), "Initial loader must disappear on create page");
  await owner.locator("#schedule-title").fill("共有機能テスト");
  await owner.locator("#schedule-organizer").fill("主催者");
  await owner.locator("#schedule-description").fill("自動テスト");
  await owner.locator("#schedule-options").fill("候補A\n候補B\n候補C");
  await owner.getByRole("button", { name: "日程調整を作成" }).click();
  await owner.waitForURL(/\/schedule\/\?id=/);

  const shareUrl = owner.url().replace("&created=1", "");
  await owner.locator("[data-event-title]").waitFor({ state: "visible" });
  assert((await owner.locator(".answer-row").count()) === 3, "Owner should see three options");

  await owner.locator("[data-response-name]").fill("主催者");
  const ownerRows = owner.locator(".answer-row");
  await ownerRows.nth(0).locator('input[value="yes"]').check();
  await ownerRows.nth(1).locator('input[value="maybe"]').check();
  await ownerRows.nth(2).locator('input[value="no"]').check();
  await owner.getByRole("button", { name: "回答を送信" }).click();
  await owner.getByRole("button", { name: "回答を更新" }).waitFor({ state: "visible" });

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(shareUrl);
  await guest.locator("[data-event-title]").waitFor({ state: "visible" });
  await guest.locator("[data-response-name]").fill("参加者");
  const guestRows = guest.locator(".answer-row");
  await guestRows.nth(0).locator('input[value="no"]').check();
  await guestRows.nth(1).locator('input[value="yes"]').check();
  await guestRows.nth(2).locator('input[value="maybe"]').check();
  await guest.getByRole("button", { name: "回答を送信" }).click();
  await guest.getByRole("button", { name: "回答を更新" }).waitFor({ state: "visible" });
  await owner.getByRole("button", { name: "最新の状態に更新" }).click();
  await owner.waitForTimeout(150);
  assert((await owner.locator("[data-response-count]").textContent()) === "2", "Two responses should be visible");
  assert((await owner.locator("[data-best-label]").textContent()) === "候補B", "Candidate B should rank first");

  guest.once("dialog", async (dialog) => dialog.accept());
  await guest.getByRole("button", { name: "自分の回答を削除" }).click();
  await guest.waitForTimeout(150);
  assert((await guest.locator("[data-response-count]").textContent()) === "1", "Guest response should be deleted");

  owner.once("dialog", async (dialog) => dialog.accept());
  await owner.getByRole("button", { name: "この日程調整を削除" }).click();
  await owner.waitForURL(BASE + "/schedule/");

  await guest.goto(shareUrl);
  await guest.locator("[data-error-view]").waitFor({ state: "visible" });
  assert(await guest.locator("[data-error-view]").isVisible(), "Deleted schedule must not be readable");

  await guestContext.close();
  await ownerContext.close();
  console.log("Schedule sharing E2E OK: create / share / answer / aggregate / delete.");
} finally {
  await browser?.close().catch(() => {});
  try {
    if (worker.pid) process.kill(-worker.pid, "SIGTERM");
  } catch {}
}
