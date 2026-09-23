import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const routes = [
  "/image/compress/","/image/resize/","/image/png-to-jpg/","/image/webp-converter/","/image/crop/","/image/target-filesize/",
  "/csv/merge/","/csv/columns/","/csv/encoding/","/csv/json-converter/",
  "/text/json-formatter/","/text/character-count/","/text/fullwidth-halfwidth/","/text/newline-converter/",
  "/pdf/merge/","/pdf/split/","/pdf/to-images/",
  "/qr/generate/","/qr/read/","/video/compress/","/video/to-mp3/","/developer/uuid/","/developer/unix-time/",
];

test("追加ツールの全ページが表示できる", async ({ page }) => {
  for (const route of routes) {
    const errors:string[]=[];
    page.removeAllListeners("pageerror");
    page.on("pageerror", e=>errors.push(e.message));
    const response=await page.goto(route);
    expect(response?.ok(), route).toBeTruthy();
    await expect(page.locator(".tool-heading h1")).toBeVisible();
    expect(errors, route).toEqual([]);
  }
});

test("CSVとJSONを相互変換できる", async ({ page }) => {
  await page.goto("/csv/json-converter/");

  await page.locator("[data-file]").setInputFiles({
    name:"people.csv",
    mimeType:"text/csv",
    buffer:Buffer.from("name,age\nAlice,30\nBob,25"),
  });
  await expect(page.locator("[data-source]")).toHaveValue(/Alice,30/);
  await expect(page.locator("[data-direction]")).toHaveValue("csv-json");
  const jsonDownload=page.waitForEvent("download");
  await page.getByRole("button",{name:"変換"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/"name": "Alice"/);
  await page.getByRole("button",{name:"ダウンロード"}).click();
  expect((await jsonDownload).suggestedFilename()).toBe("people.json");

  await page.locator("[data-file]").setInputFiles({
    name:"people.json",
    mimeType:"application/json",
    buffer:Buffer.from('[{"name":"Alice","age":30}]'),
  });
  await expect(page.locator("[data-direction]")).toHaveValue("json-csv");
  const csvDownload=page.waitForEvent("download");
  await page.getByRole("button",{name:"変換"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/name,age/);
  await page.getByRole("button",{name:"ダウンロード"}).click();
  expect((await csvDownload).suggestedFilename()).toBe("people.csv");
});

test("文字数カウントとUUID生成が動く", async ({ page }) => {
  await page.goto("/text/character-count/");
  await page.locator("[data-source]").fill("abc\nあいう");
  await expect(page.locator("[data-chars]")).toHaveText("7");
  await expect(page.locator("[data-lines]")).toHaveText("2");
  await page.goto("/developer/uuid/");
  await page.locator("[data-count]").fill("3");
  await page.getByRole("button",{name:"UUIDを生成"}).click();
  const value=await page.locator("[data-result]").inputValue();
  expect(value.trim().split("\n")).toHaveLength(3);
});

test("QRコードを生成できる", async ({ page }) => {
  await page.goto("/qr/generate/");
  await page.locator("[data-source]").fill("https://utility-tools-jp.com/");
  await page.getByRole("button",{name:"QRコードを生成"}).click();
  await expect(page.locator("[data-preview]")).toBeVisible();
  expect(await page.locator("[data-canvas]").evaluate((c:HTMLCanvasElement)=>c.width)).toBeGreaterThan(0);
});

test("PDFの結合と画像化が動く", async ({ page }) => {
  const makePdf=async(text:string)=>{
    const pdf=await PDFDocument.create();
    const p=pdf.addPage([200,200]);
    p.drawText(text,{x:20,y:100});
    return Buffer.from(await pdf.save());
  };
  const a=await makePdf("A"), b=await makePdf("B");
  await page.goto("/pdf/merge/");
  await page.locator("[data-file]").setInputFiles([
    {name:"a.pdf",mimeType:"application/pdf",buffer:a},
    {name:"b.pdf",mimeType:"application/pdf",buffer:b},
  ]);
  const merged=page.waitForEvent("download");
  await page.getByRole("button",{name:"処理する"}).click();
  expect((await merged).suggestedFilename()).toBe("merged.pdf");

  await page.goto("/pdf/to-images/");
  await page.locator("[data-file]").setInputFiles({name:"a.pdf",mimeType:"application/pdf",buffer:a});
  const images=page.waitForEvent("download");
  await page.getByRole("button",{name:"処理する"}).click();
  expect((await images).suggestedFilename()).toBe("a-images.zip");
});


test("トップページでカテゴリ絞り込みとページングができる", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-visible-count]")).toHaveText("26件");
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(12);
  await expect(page.locator("[data-pagination]")).toBeVisible();
  await expect(page.locator("[data-page-numbers] button")).toHaveCount(3);

  await page.getByRole("button", { name: "次へ →" }).click();
  await expect(page).toHaveURL(/\?page=2$/);
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(12);
  await expect(page.getByRole("button", { name: "2ページ目" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("button", { name: "次へ →" }).click();
  await expect(page).toHaveURL(/\?page=3$/);
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(2);

  await page.getByRole("button", { name: /PDF/ }).click();
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(3);
  await expect(page.locator("[data-visible-count]")).toHaveText("3件");
  await expect(page.locator("[data-pagination]")).toBeHidden();
  await expect(page.getByRole("button", { name: /PDF/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/\?category=pdf$/);

  await page.getByRole("button", { name: /IMAGE/ }).click();
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(7);
  await expect(page.locator("[data-visible-count]")).toHaveText("7件");

  await page.getByRole("button", { name: /すべて/ }).click();
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(12);
  await expect(page).toHaveURL(/\/$/);
});
