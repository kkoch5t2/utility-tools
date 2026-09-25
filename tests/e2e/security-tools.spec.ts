import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

test("SECURITYカテゴリの主要テキスト処理が動く", async ({ page }) => {
  await page.goto("/security/password-strength/");
  await page.locator("[data-password]").fill("Example-Phrase-2026!");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/文字種: 4 \/ 4/);

  await page.goto("/security/log-mask/");
  await page.locator("[data-source]").fill("user@example.com 090-1234-5678 192.168.1.25");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/u\*\*\*@example\.com/);
  await expect(page.locator("[data-result]")).toHaveValue(/\*\*\*-\*\*\*\*-5678/);
  await expect(page.locator("[data-result]")).toHaveValue(/192\.168\.xxx\.xxx/);

  await page.goto("/security/url-privacy/");
  await page.locator("[data-url]").fill("https://example.com/page?utm_source=test&foo=bar");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/utm_source/);
  await expect(page.locator("[data-result]")).toHaveValue(/https:\/\/example\.com\/page\?foo=bar/);

  await page.goto("/security/secret-scan/");
  await page.locator("[data-source]").fill("api_key=example_value_123456789");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/秘密値らしい代入/);
});

test("ファイルハッシュ比較と画像メタデータ確認が動く", async ({ page }) => {
  await page.goto("/security/file-hash-compare/");
  const same=Buffer.from("same-file-content");
  await page.locator("[data-file-a]").setInputFiles({name:"a.txt",mimeType:"text/plain",buffer:same});
  await page.locator("[data-file-b]").setInputFiles({name:"b.txt",mimeType:"text/plain",buffer:same});
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/同一内容です/);

  await page.goto("/security/image-metadata-check/");
  const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1v8AAAAASUVORK5CYII=","base64");
  await page.locator("[data-file]").setInputFiles({name:"tiny.png",mimeType:"image/png",buffer:png});
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/eXIfチャンク: なし/);
});

test("PDFメタデータ確認と削除保存が動く", async ({ page }) => {
  const pdf=await PDFDocument.create();
  pdf.addPage([200,200]);
  pdf.setTitle("Sample title");
  pdf.setAuthor("Sample author");
  const bytes=Buffer.from(await pdf.save());

  await page.goto("/security/pdf-metadata/");
  await page.locator("[data-file]").setInputFiles({name:"sample.pdf",mimeType:"application/pdf",buffer:bytes});
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/タイトル: Sample title/);
  await expect(page.locator("[data-result]")).toHaveValue(/作成者: Sample author/);
  await expect(page.locator("[data-remove-pdf]")).toBeVisible();
  const download=page.waitForEvent("download");
  await page.locator("[data-remove-pdf]").click();
  expect((await download).suggestedFilename()).toBe("sample-metadata-removed.pdf");
});
