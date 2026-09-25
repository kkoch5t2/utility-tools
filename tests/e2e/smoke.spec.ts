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
  await expect(page.getByRole("heading", { name: "Base64エンコード・デコードの使い方" })).toBeVisible();
  await expect(page.locator(".tool-guide li")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "Base64エンコード・デコードを使う場面" })).toBeVisible();
  await expect(page.locator(".seo-usecases > div")).toHaveCount(3);
  await expect(page.locator(".seo-example")).toContainText("aGVsbG8=");
  await expect(page.locator(".seo-tips li")).toHaveCount(2);
  await expect(page.locator('.breadcrumbs [aria-current="page"]')).toHaveText("Base64エンコード・デコード");
  await expect(page.locator('.footer-categories a[href="/category/developer/"]')).toHaveText("開発者");
  await expect(page.locator(".footer-categories a")).toHaveCount(16);
  await expect(page.locator('.footer-categories a[href="/category/security/"]')).toHaveText("セキュリティ");
  await expect(page.locator('.footer-categories a[href="/category/japan/"]')).toHaveText("日本向け");
  await expect(page.locator('.footer-categories a[href="/category/office/"]')).toHaveText("仕事・事務");
  await expect(page.locator('.footer-categories a[href="/category/game/"]')).toHaveText("ゲーム");
  const datlumeLink = page.locator('.footer-related a[href="https://datlume.com/"]');
  await expect(datlumeLink).toContainText("Datlume");
  await expect(datlumeLink.locator('img[src="/brand/datlume.svg"]')).toBeVisible();

  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "無料Web便利ツール集");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://utility-tools-jp.com/og/developer.png");
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", "https://utility-tools-jp.com/og/developer.png");

  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(jsonLd.some((text) => text.includes('"@type":"WebApplication"'))).toBeTruthy();
  expect(jsonLd.some((text) => text.includes('"@type":"BreadcrumbList"'))).toBeTruthy();
  expect(jsonLd.some((text) => text.includes('"@type":"FAQPage"'))).toBeTruthy();
});



test("カテゴリページからツールへ移動できる", async ({ page }) => {
  await page.goto("/category/developer/");
  await expect(page.getByRole("heading", { name: "開発者ツール一覧" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "開発者ツールはこんなときに便利" })).toBeVisible();
  await expect(page.locator(".category-usecases li")).toHaveCount(3);
  await expect(page.locator(".related-category-grid a")).toHaveCount(3);
  await expect(page.getByRole("link", { name: /Base64エンコード・デコード/ })).toHaveAttribute("href", "/developer/base64/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://utility-tools-jp.com/category/developer/");

  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(jsonLd.some((text) => text.includes('"@type":"CollectionPage"'))).toBeTruthy();
  expect(jsonLd.some((text) => text.includes('"@type":"ItemList"'))).toBeTruthy();
});

test("最近使ったツールを端末内履歴から表示・削除できる", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("utility-tools:recent"));

  await page.goto("/developer/base64/");
  await page.goto("/text/character-count/");
  await page.goto("/");

  const recent = page.locator("[data-recent-tools]");
  await expect(recent).toBeVisible();
  await expect(recent.locator(".recent-card")).toHaveCount(2);
  await expect(recent.locator(".recent-card").first()).toContainText("文字数カウント");
  await expect(recent.locator(".recent-card").nth(1)).toContainText("Base64");

  await page.getByRole("button", { name: "履歴を消す" }).click();
  await expect(recent).toBeHidden();
});

test("目的別ページから関連ツールを探せる", async ({ page }) => {
  await page.goto("/use-case/");
  await expect(page.getByRole("heading", { name: "やりたいことから探す" })).toBeVisible();
  await expect(page.locator(".purpose-card")).toHaveCount(14);
  await expect(page.locator('.purpose-card[href="/use-case/privacy-security/"]')).toContainText("個人情報");
  await expect(page.locator('.purpose-card[href="/use-case/japan-office-life/"]')).toContainText("日本の事務");
  await expect(page.locator('.purpose-card[href="/use-case/office-work/"]')).toContainText("仕事の文書");
  await expect(page.locator('.purpose-card[href="/use-case/browser-games/"]')).toContainText("ブラウザでゲーム");

  await page.goto("/use-case/video-edit/");
  await expect(page.getByRole("heading", { name: "動画を軽く・編集する" })).toBeVisible();
  await expect(page.locator(".usecase-card")).toHaveCount(9);
  await expect(page.locator(".usecase-card").filter({ hasText: "動画切り抜き・トリミング" }).locator("a")).toHaveAttribute("href", "/video/trim/");
  await expect(page.locator(".usecase-card").filter({ hasText: "動画 → GIF変換" }).locator("a")).toHaveAttribute("href", "/video/to-gif/");
  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(jsonLd.some((text) => text.includes('"@type":"CollectionPage"'))).toBeTruthy();
});

test("動画ツール9種の設定UIが表示される", async ({ page }) => {
  const cases = [
    ["/video/compress/", "[data-quality]", "動画を圧縮"],
    ["/video/to-mp3/", "[data-bitrate]", "MP3に変換"],
    ["/video/trim/", "[data-duration]", "動画を切り抜く"],
    ["/video/remove-audio/", "[data-file]", "音声を削除"],
    ["/video/resize/", "[data-width]", "動画をリサイズ"],
    ["/video/rotate/", "[data-rotate]", "動画を回転"],
    ["/video/speed/", "[data-speed]", "再生速度を変更"],
    ["/video/to-webm/", "[data-webm-quality]", "WebMに変換"],
    ["/video/to-gif/", "[data-gif-duration]", "GIFに変換"],
  ] as const;
  for (const [path, selector, action] of cases) {
    await page.goto(path);
    await expect(page.locator(selector), path).toBeVisible();
    await expect(page.getByRole("button", { name: action }), path).toBeDisabled();
  }
});

test("サイトマップがツール一覧から自動生成される", async ({ request, page }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("xml");
  const body = await response.text();
  expect(body).toContain("https://utility-tools-jp.com/developer/base64/");
  expect(body).toContain("https://utility-tools-jp.com/privacy/");
  expect(body).toContain("https://utility-tools-jp.com/category/developer/");
  expect(body).toContain("https://utility-tools-jp.com/use-case/");
  expect(body).toContain("https://utility-tools-jp.com/use-case/video-edit/");

  await page.goto("/");
  const toolCount = await page.locator("[data-tool-card]").count();
  const purposeCount = await page.locator(".purpose-links-grid > a").count();
  const categoryCount = await page.locator(".footer-categories a").count();
  expect((body.match(/<url>/g) ?? []).length).toBe(toolCount + purposeCount + categoryCount + 3);
});
