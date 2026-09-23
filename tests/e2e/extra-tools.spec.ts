import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const routes = [
  "/image/compress/","/image/resize/","/image/png-to-jpg/","/image/webp-converter/","/image/crop/","/image/target-filesize/",
  "/csv/merge/","/csv/columns/","/csv/encoding/","/csv/json-converter/",
  "/text/json-formatter/","/text/character-count/","/text/fullwidth-halfwidth/","/text/newline-converter/",
  "/pdf/merge/","/pdf/split/","/pdf/to-images/",
  "/qr/generate/","/qr/read/","/video/compress/","/video/to-mp3/",
  "/csv/find-duplicates/","/csv/remove-empty-rows/","/csv/tsv-converter/",
  "/json/jsonl-converter/","/text/invisible-characters/","/text/unicode-normalize/",
  "/japanese/hiragana-katakana/","/japanese/wareki/",
  "/developer/base64/","/developer/url-encode/","/developer/html-escape/","/developer/sha/",
  "/developer/file-hash/","/developer/jwt-decode/","/developer/sql-in/",
  "/text/line-prefix-suffix/","/text/line-numbers/","/text/remove-empty-lines/","/text/tabs-spaces/",
  "/text/sort-lines/","/text/random-lines/","/text/case-converter/","/text/trim-lines/",
  "/json/key-list/","/json/sort-keys/","/json/flatten/","/json/to-typescript/",
  "/developer/regex-tester/","/developer/random-string/","/developer/password-generator/",
  "/developer/sql-values/","/developer/slug/","/developer/url-parts/",
  "/date/difference/","/date/age/","/date/add-subtract/","/date/business-days/",
  "/calculator/percent-change/","/calculator/ratio/",
  "/developer/uuid/","/developer/unix-time/",
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

test("追加したニッチツールの主要処理が動く", async ({ page }) => {
  await page.goto("/csv/find-duplicates/");
  await page.locator("[data-source]").fill("name,age\nAlice,30\nBob,25\nAlice,30");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/__duplicate_count/);
  await expect(page.locator("[data-info]")).toHaveText(/1種類の重複行/);

  await page.goto("/json/jsonl-converter/");
  await page.locator("[data-source]").fill('{"a":1}\n{"a":2}');
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/"a": 2/);

  await page.goto("/text/invisible-characters/");
  await page.locator("[data-source]").fill("a\u200bb");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/ZERO WIDTH SPACE/);

  await page.goto("/text/unicode-normalize/");
  await page.locator("[data-source]").fill("ＡＢＣ１２３");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("ABC123");

  await page.goto("/japanese/hiragana-katakana/");
  await page.locator("[data-source]").fill("こんにちは");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("コンニチハ");

  await page.goto("/japanese/wareki/");
  await page.locator("[data-source]").fill("2026-09-23");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("令和8年9月23日");
});

test("追加した開発者ツールの主要処理が動く", async ({ page }) => {
  await page.goto("/developer/base64/");
  await page.locator("[data-source]").fill("abc");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("YWJj");

  await page.goto("/developer/url-encode/");
  await page.locator("[data-source]").fill("a b");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("a%20b");

  await page.goto("/developer/html-escape/");
  await page.locator("[data-source]").fill("<b>&");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("&lt;b&gt;&amp;");

  await page.goto("/developer/sha/");
  await page.locator("[data-source]").fill("abc");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");

  await page.goto("/developer/file-hash/");
  await page.locator("[data-file]").setInputFiles({name:"abc.txt",mimeType:"text/plain",buffer:Buffer.from("abc")});
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");

  await page.goto("/developer/jwt-decode/");
  await page.locator("[data-source]").fill("eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMiLCJuYW1lIjoiQWxpY2UifQ.");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/Alice/);

  await page.goto("/developer/sql-in/");
  await page.locator("[data-source]").fill("a\nO'Reilly");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("('a', 'O''Reilly')");
});

test("追加したTEXT・JSON・開発者ツールが動く", async ({ page }) => {
  await page.goto("/text/line-prefix-suffix/");
  await page.locator("[data-a]").fill("- ");
  await page.locator("[data-b]").fill(";");
  await page.locator("[data-source]").fill("alpha\nbeta");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("- alpha;\n- beta;");

  await page.goto("/text/remove-empty-lines/");
  await page.locator("[data-source]").fill("a\n\n   \nb");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("a\nb");

  await page.goto("/json/flatten/");
  await page.locator("[data-source]").fill('{"user":{"name":"Alice"},"tags":["a","b"]}');
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/"user.name": "Alice"/);
  await expect(page.locator("[data-result]")).toHaveValue(/"tags.1": "b"/);

  await page.goto("/json/to-typescript/");
  await page.locator("[data-source]").fill('{"name":"Alice","age":30}');
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/"name": string/);
  await expect(page.locator("[data-result]")).toHaveValue(/"age": number/);

  await page.goto("/developer/regex-tester/");
  await page.locator("[data-a]").fill("\\d+");
  await page.locator("[data-source]").fill("abc 123 def 45");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/123/);
  await expect(page.locator("[data-result]")).toHaveValue(/45/);

  await page.goto("/developer/password-generator/");
  await page.locator("[data-a]").fill("16");
  await page.locator("[data-b]").fill("3");
  await page.getByRole("button",{name:"処理する"}).click();
  const passwords=(await page.locator("[data-result]").inputValue()).trim().split("\n");
  expect(passwords).toHaveLength(3);
  expect(passwords.every((password)=>password.length===16)).toBeTruthy();
});

test("追加した日付・計算ツールが動く", async ({ page }) => {
  await page.goto("/date/difference/");
  await page.locator("[data-a]").fill("2026-09-01");
  await page.locator("[data-b]").fill("2026-09-23");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/22日/);

  await page.goto("/date/age/");
  await page.locator("[data-a]").fill("2000-10-01");
  await page.locator("[data-b]").fill("2026-09-23");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("25歳");

  await page.goto("/date/add-subtract/");
  await page.locator("[data-a]").fill("2026-09-23");
  await page.locator("[data-b]").fill("-23");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("2026-08-31");

  await page.goto("/date/business-days/");
  await page.locator("[data-a]").fill("2026-09-21");
  await page.locator("[data-b]").fill("2026-09-25");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("5営業日");

  await page.goto("/calculator/percent-change/");
  await page.locator("[data-a]").fill("100");
  await page.locator("[data-b]").fill("125");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("+25.00%");

  await page.goto("/calculator/ratio/");
  await page.locator("[data-a]").fill("1920");
  await page.locator("[data-b]").fill("1080");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/16:9/);
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
  await expect(page.locator("[data-visible-count]")).toHaveText("65件");
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(12);
  await expect(page.locator("[data-pagination]")).toBeVisible();
  await expect(page.locator("[data-page-numbers] button")).toHaveCount(6);

  await page.getByRole("button", { name: "次へ →" }).click();
  await expect(page).toHaveURL(/\?page=2$/);
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(12);
  await expect(page.getByRole("button", { name: "2ページ目" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("button", { name: "次へ →" }).click();
  await expect(page).toHaveURL(/\?page=3$/);
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(12);

  await page.getByRole("button", { name: "次へ →" }).click();
  await expect(page).toHaveURL(/\?page=4$/);
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(12);

  await page.getByRole("button", { name: "次へ →" }).click();
  await expect(page).toHaveURL(/\?page=5$/);
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(12);

  await page.getByRole("button", { name: "次へ →" }).click();
  await expect(page).toHaveURL(/\?page=6$/);
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(5);

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
