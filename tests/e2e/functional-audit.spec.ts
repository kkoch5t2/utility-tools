import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
  "base64",
);

async function runText(page: any, path: string, input: string) {
  await page.goto(path);
  await page.locator("[data-source]").fill(input);
  await page.getByRole("button", { name: "処理する" }).click();
  return page.locator("[data-result]");
}

test("未検証だったテキスト・JSON・開発系処理を実入力で監査する", async ({ page }) => {
  await expect(await runText(page, "/text/json-formatter/", '{"b":2,"a":1}')).toHaveValue(/"b": 2/);
  await expect(await runText(page, "/text/fullwidth-halfwidth/", "ＡＢＣ　１２３")).toHaveValue("ABC 123");
  await expect(await runText(page, "/text/newline-converter/", "a\nb\nc")).toHaveValue("abc");

  await expect(await runText(page, "/text/line-numbers/", "alpha\nbeta")).toHaveValue("1. alpha\n2. beta");
  await expect(await runText(page, "/text/tabs-spaces/", "a\tb")).toHaveValue("a    b");
  await expect(await runText(page, "/text/sort-lines/", "c\na\nb")).toHaveValue("a\nb\nc");
  await page.goto("/text/random-lines/");
  await page.locator("[data-a]").fill("2");
  await page.locator("[data-source]").fill("a\nb\nc");
  await page.getByRole("button", { name: "処理する" }).click();
  const randomLines=(await page.locator("[data-result]").inputValue()).split("\n");
  expect(randomLines).toHaveLength(2);
  expect(randomLines.every((line)=>["a","b","c"].includes(line))).toBeTruthy();

  await expect(await runText(page, "/text/case-converter/", "Hello world")).toHaveValue("HELLO WORLD");
  await expect(await runText(page, "/text/trim-lines/", "  a  \n\tb\t")).toHaveValue("a\nb");
  await expect(await runText(page, "/json/key-list/", '{"b":1,"a":{"c":2}}')).toHaveValue("a\na.c\nb");
  const sorted=await runText(page, "/json/sort-keys/", '{"z":1,"a":{"y":2,"b":3}}');
  const sortedValue=await sorted.inputValue();
  expect(sortedValue.indexOf('"a"')).toBeLessThan(sortedValue.indexOf('"z"'));

  await page.goto("/developer/random-string/");
  await page.locator("[data-a]").fill("8");
  await page.locator("[data-b]").fill("3");
  await page.getByRole("button", { name: "処理する" }).click();
  const randomStrings=(await page.locator("[data-result]").inputValue()).split("\n");
  expect(randomStrings).toHaveLength(3);
  expect(randomStrings.every((item)=>item.length===8)).toBeTruthy();

  await page.goto("/developer/sql-values/");
  await page.locator("[data-a]").fill("2");
  await page.locator("[data-source]").fill("a,b,c,d");
  await page.getByRole("button", { name: "処理する" }).click();
  await expect(page.locator("[data-result]")).toHaveValue("('a', 'b'),\n('c', 'd')");

  await expect(await runText(page, "/developer/slug/", "Hello  World_Test")).toHaveValue("hello-world-test");
  const urlParts=await runText(page, "/developer/url-parts/", "https://example.com/a?q=1#x");
  await expect(urlParts).toHaveValue(/"host": "example.com"/);
  await expect(urlParts).toHaveValue(/"q": "1"/);

  await expect(await runText(page, "/json/array-sort/", '[10,2,1]')).toHaveValue("[\n  1,\n  2,\n  10\n]");
  const escaped=await runText(page, "/json/string-escape/", 'a"b\nc');
  await expect(escaped).toHaveValue('"a\\\"b\\nc"');
  await expect(await runText(page, "/text/reverse-lines/", "a\nb\nc")).toHaveValue("c\nb\na");

  await page.goto("/text/shuffle-lines/");
  await page.locator("[data-source]").fill("a\nb\nc");
  await page.getByRole("button", { name: "処理する" }).click();
  const shuffled=(await page.locator("[data-result]").inputValue()).split("\n").sort();
  expect(shuffled).toEqual(["a","b","c"]);

  await expect(await runText(page, "/text/word-frequency/", "Apple banana apple")).toHaveValue("apple\t2\nbanana\t1");
  await page.goto("/text/line-ending/");
  await page.locator("[data-action]").selectOption("crlf");
  await page.locator("[data-source]").fill("a\nb");
  await page.getByRole("button", { name: "処理する" }).click();
  expect(await page.locator("[data-result]").inputValue()).toBe("a\nb");

  await expect(await runText(page, "/japanese/punctuation-normalize/", "こんにちは、世界！")).toHaveValue("こんにちは,世界!");
  await expect(await runText(page, "/japanese/space-normalize/", "a　　b   c")).toHaveValue("a b c");
  const charTypes=await runText(page, "/japanese/character-types/", "あア漢A1 ");
  await expect(charTypes).toHaveValue(/ひらがな: 1/);
  await expect(charTypes).toHaveValue(/カタカナ: 1/);
  await expect(charTypes).toHaveValue(/漢字: 1/);

  await expect(await runText(page, "/developer/uuid-validate/", "550e8400-e29b-41d4-a716-446655440000")).toHaveValue("有効なUUIDです。");

  await page.goto("/date/iso-week/");
  await page.locator("[data-a]").fill("2026-01-01");
  await page.getByRole("button", { name: "処理する" }).click();
  await expect(page.locator("[data-result]")).toHaveValue("2026-W01");

  await page.goto("/calculator/percentage/");
  await page.locator("[data-a]").fill("50");
  await page.locator("[data-b]").fill("200");
  await page.getByRole("button", { name: "処理する" }).click();
  await expect(page.locator("[data-result]")).toHaveValue("25.00%");

  await page.goto("/calculator/discount/");
  await page.locator("[data-a]").fill("5000");
  await page.locator("[data-b]").fill("20");
  await page.getByRole("button", { name: "処理する" }).click();
  await expect(page.locator("[data-result]")).toHaveValue(/割引後: 4,000/);
  await expect(page.locator("[data-result]")).toHaveValue(/値引額: 1,000/);

  await page.goto("/calculator/bytes/");
  await page.locator("[data-a]").fill("1");
  await page.locator("[data-action]").selectOption("MB");
  await page.locator("[data-unit]").selectOption("KB");
  await page.getByRole("button", { name: "処理する" }).click();
  await expect(page.locator("[data-result]")).toHaveValue("1,024 KB");

  await page.goto("/developer/unix-time/");
  await page.locator("[data-value]").fill("0");
  await page.getByRole("button", { name: "変換" }).click();
  await expect(page.locator("[data-result]")).toHaveValue(/ISO: 1970-01-01T00:00:00.000Z/);
});

test("未検証だったCSV処理を実入力・ダウンロードまで監査する", async ({ page }) => {
  await page.goto("/csv/merge/");
  await page.locator("[data-file]").setInputFiles([
    { name:"a.csv", mimeType:"text/csv", buffer:Buffer.from("id,name\n1,Alice") },
    { name:"b.csv", mimeType:"text/csv", buffer:Buffer.from("id,name\n2,Bob") },
  ]);
  await page.getByRole("button", { name:"処理する" }).click();
  await expect(page.locator("[data-info]")).toContainText("2ファイル");
  const mergeDownload=page.waitForEvent("download");
  await page.getByRole("button", { name:"ダウンロード" }).click();
  expect((await mergeDownload).suggestedFilename()).toBe("merged.csv");

  await page.goto("/csv/columns/");
  await page.locator("[data-file]").setInputFiles({ name:"people.csv", mimeType:"text/csv", buffer:Buffer.from("name,age,city\nAlice,30,Tokyo") });
  await expect(page.locator("[data-columns]")).toHaveValue("name,age,city");
  await page.locator("[data-columns]").fill("name,city");
  await page.getByRole("button", { name:"処理する" }).click();
  const columnsDownload=page.waitForEvent("download");
  await page.getByRole("button", { name:"ダウンロード" }).click();
  expect((await columnsDownload).suggestedFilename()).toBe("people-columns.csv");

  await page.goto("/csv/encoding/");
  await page.locator("[data-file]").setInputFiles({ name:"utf8.csv", mimeType:"text/csv", buffer:Buffer.from("name\n東京","utf8") });
  await page.locator("[data-dest-encoding]").selectOption("UTF8_BOM");
  await page.getByRole("button", { name:"処理する" }).click();
  await expect(page.locator("[data-info]")).toContainText("UTF8_BOM");
  const encDownload=page.waitForEvent("download");
  await page.getByRole("button", { name:"ダウンロード" }).click();
  expect((await encDownload).suggestedFilename()).toBe("utf8-utf8_bom.csv");

  await page.goto("/csv/remove-empty-rows/");
  await page.locator("[data-source]").fill("id,name\n1,A\n,\n2,B");
  await page.getByRole("button", { name:"処理する" }).click();
  await expect(page.locator("[data-result]")).toHaveValue(/2,B/);
  await expect(page.locator("[data-result]")).not.toHaveValue(/\n,\n/);

  await page.goto("/csv/tsv-converter/");
  await page.locator("[data-source]").fill("id,name\n1,Alice");
  await page.getByRole("button", { name:"処理する" }).click();
  await expect(page.locator("[data-result]")).toHaveValue("id\tname\n1\tAlice");
});
test("CSV追加編集モードをすべて実入力で監査する", async ({ page }) => {
  const run = async (path:string, source:string, setup?:()=>Promise<void>) => {
    await page.goto(path);
    await page.locator("[data-source]").fill(source);
    if(setup) await setup();
    await page.getByRole("button", { name:"処理する" }).click();
    return page.locator("[data-result]");
  };

  await page.goto("/csv/add-row-number/");
  await page.locator("[data-source]").fill("name\nAlice\nBob");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/row_number,name\r?\n1,Alice\r?\n2,Bob/);

  await page.goto("/csv/rename-headers/");
  await page.locator("[data-source]").fill("name,age\nAlice,30");
  await page.locator("[data-rules]").fill("name=full_name\nage=years");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/full_name,years/);

  await expect(await run("/csv/transpose/","a,b\n1,2\n3,4")).toHaveValue(/a,1,3\r?\nb,2,4/);

  await page.goto("/csv/value-count/");
  await page.locator("[data-source]").fill("type\na\nb\na");
  await page.locator("[data-a]").fill("type");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/a,2/);
  await expect(page.locator("[data-result]")).toHaveValue(/b,1/);
});

test("画像6モードを実ファイルで処理・保存まで監査する", async ({ page }) => {
  const processPng = async (path:string, expectedName:string, setup?:()=>Promise<void>) => {
    await page.goto(path);
    await page.locator("[data-file]").setInputFiles({name:"sample.png",mimeType:"image/png",buffer:onePixelPng});
    if(setup) await setup();
    await page.getByRole("button",{name:"処理する"}).click();
    await expect(page.locator("[data-result]")).toBeVisible();
    const download=page.waitForEvent("download");
    await page.getByRole("button",{name:"ダウンロード"}).click();
    expect((await download).suggestedFilename()).toBe(expectedName);
  };

  await processPng("/image/compress/","sample-compressed.webp");
  await processPng("/image/resize/","sample-resized.png",async()=>{
    await page.locator("[data-width]").fill("2");
    await page.locator("[data-height]").fill("2");
  });
  await processPng("/image/png-to-jpg/","sample.jpg");
  await processPng("/image/crop/","sample-cropped.png");
  await processPng("/image/target-filesize/","sample-target.jpg");

  await page.goto("/image/webp-converter/");
  const webpData=await page.evaluate(()=>{
    const canvas=document.createElement("canvas"); canvas.width=2; canvas.height=2;
    const ctx=canvas.getContext("2d")!; ctx.fillRect(0,0,2,2);
    return canvas.toDataURL("image/webp").split(",")[1];
  });
  await page.locator("[data-file]").setInputFiles({name:"sample.webp",mimeType:"image/webp",buffer:Buffer.from(webpData,"base64")});
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toBeVisible();
  const webpDownload=page.waitForEvent("download");
  await page.getByRole("button",{name:"ダウンロード"}).click();
  expect((await webpDownload).suggestedFilename()).toBe("sample.jpg");
});
test("PDF分割とQR読み取りを実ファイルで監査する", async ({ page }) => {
  const pdf=await PDFDocument.create();
  pdf.addPage([200,200]); pdf.addPage([200,200]); pdf.addPage([200,200]);
  const bytes=Buffer.from(await pdf.save());

  await page.goto("/pdf/split/");
  await page.locator("[data-file]").setInputFiles({name:"three.pdf",mimeType:"application/pdf",buffer:bytes});
  await page.locator("[data-ranges]").fill("1-2,3");
  const splitDownload=page.waitForEvent("download");
  await page.getByRole("button",{name:"処理する"}).click();
  expect((await splitDownload).suggestedFilename()).toBe("three-split.zip");
  await expect(page.locator("[data-success-box]")).toContainText("2個のPDF");

  await page.goto("/qr/generate/");
  await page.locator("[data-source]").fill("https://example.com/qr-test");
  await page.getByRole("button",{name:"QRコードを生成"}).click();
  await expect(page.locator("[data-success-box]")).toContainText("QRコードを生成しました");
  const qrPng=await page.locator("[data-canvas]").evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL("image/png").split(",")[1]);

  await page.goto("/qr/read/");
  await page.locator("[data-file]").setInputFiles({name:"qr.png",mimeType:"image/png",buffer:Buffer.from(qrPng,"base64")});
  await page.getByRole("button",{name:"QRコードを読み取る"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("https://example.com/qr-test");
});
