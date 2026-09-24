import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
  "base64",
);

test("画像を変換してダウンロードできる", async ({ page }) => {
  await page.goto("/image/batch-converter/");
  await page.waitForLoadState("networkidle");

  await page.locator("[data-file-input]").setInputFiles({
    name: "sample.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  });
  await expect(page.getByRole("button", { name: "変換を開始" })).toBeEnabled();
  await page.getByRole("button", { name: "変換を開始" }).click();
  await expect(page.getByText("1件の変換が完了しました。")).toBeVisible();
  await expect(page.getByText("sample-converted.webp")).toBeVisible();

  const individual = page.waitForEvent("download");
  await page.locator("[data-result-list]").getByRole("button", { name: "ダウンロード" }).click();
  expect((await individual).suggestedFilename()).toBe("sample-converted.webp");

  const zip = page.waitForEvent("download");
  await page.getByRole("button", { name: "ZIPで一括ダウンロード" }).click();
  expect((await zip).suggestedFilename()).toBe("converted-images.zip");
});

test("CSVをクォート仕様を保ったまま分割してダウンロードできる", async ({ page }) => {
  const csv = 'id,name,note\n1,"A,B","hello\nworld"\n2,"He said ""Hi""",ok\n3,,last\n';
  await page.goto("/csv/split/");

  await page.locator("[data-file-input]").setInputFiles({
    name: "sample.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "utf8"),
  });
  await page.locator("[data-rows-per-file]").fill("1");
  await page.getByRole("button", { name: "分割を開始" }).click();

  await expect(page.getByText("3行を3ファイルに分割しました。")).toBeVisible();
  await expect(page.getByText("split-001.csv")).toBeVisible();
  await expect(page.getByText("split-003.csv")).toBeVisible();

  const firstDownload = page.waitForEvent("download");
  await page.locator("[data-result-list] .result-row").first().getByRole("button", { name: "ダウンロード" }).click();
  const first = await firstDownload;
  expect(first.suggestedFilename()).toBe("split-001.csv");
  const path = await first.path();
  expect(path).not.toBeNull();
  const content = await readFile(path!, "utf8");
  expect(content).toContain("id,name,note");
  expect(content).toContain('"A,B"');
  expect(content).toContain('"hello\nworld"');

  const zipDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "ZIPで一括ダウンロード" }).click();
  expect((await zipDownload).suggestedFilename()).toBe("split-csv.zip");
});


test("テキスト重複行を条件指定で削除してTXT保存できる", async ({ page }) => {
  await page.goto("/text/remove-duplicates/");
  await page.locator("[data-source-text]").fill("  Apple  \nBanana\nApple\n\nBanana\nCherry\n");

  await page.getByRole("button", { name: "重複行を削除" }).click();

  await expect(page.getByText("2行の重複を削除しました。")).toBeVisible();
  await expect(page.locator("[data-input-count]")).toHaveText("6");
  await expect(page.locator("[data-output-count]")).toHaveText("3");
  await expect(page.locator("[data-duplicate-count]")).toHaveText("2");
  await expect(page.locator("[data-blank-count]")).toHaveText("1");
  await expect(page.locator("[data-result-text]")).toHaveValue("  Apple  \nBanana\nCherry");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "TXTをダウンロード" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("deduped-lines.txt");
  const path = await file.path();
  expect(path).not.toBeNull();
  expect(await readFile(path!, "utf8")).toBe("  Apple  \nBanana\nCherry");
});


test("不具合報告にツール情報を付けて送信できる", async ({ page }) => {
  let payload: Record<string, string> = {};
  await page.route("https://formsubmit.co/ajax/**", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: "true" }),
    });
  });

  await page.goto("/developer/base64/");
  await page.getByRole("button", { name: "不具合を報告" }).click();
  await expect(page.locator("[data-report-dialog]")).toBeVisible();
  await page.locator("[name=issue_type]").selectOption("表示がおかしい");
  await page.locator("[name=details]").fill("テスト報告");
  await page.getByRole("button", { name: "送信", exact: true }).click();

  await expect(page.locator("[data-report-status]")).toHaveText("報告を送信しました。ありがとうございます。");
  expect(payload.tool).toBe("Base64エンコード・デコード");
  expect(payload.issue_type).toBe("表示がおかしい");
  expect(payload.details).toBe("テスト報告");
  expect(payload.url).toContain("/developer/base64/");
  expect(payload.browser).toBeTruthy();
});


test("関連ツールとSEO構造化データが表示される", async ({ page }) => {
  await page.goto("/developer/base64/");

  const related = page.locator(".related-card");
  await expect(page.getByRole("heading", { name: "関連ツール" })).toBeVisible();
  await expect(related).toHaveCount(6);
  await expect(related.first()).toHaveAttribute("href", /\/developer\//);

  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "無料Web便利ツール集");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary");

  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(jsonLd.some((text) => text.includes('"@type":"WebApplication"'))).toBeTruthy();
  expect(jsonLd.some((text) => text.includes('"@type":"BreadcrumbList"'))).toBeTruthy();
  expect(jsonLd.some((text) => text.includes('"@type":"FAQPage"'))).toBeTruthy();
});

test("サイトマップがツール一覧から自動生成される", async ({ request, page }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("xml");
  const body = await response.text();
  expect(body).toContain("https://utility-tools-jp.com/developer/base64/");
  expect(body).toContain("https://utility-tools-jp.com/privacy/");

  await page.goto("/");
  const toolCount = await page.locator("[data-tool-card]").count();
  expect((body.match(/<url>/g) ?? []).length).toBe(toolCount + 2);
});
