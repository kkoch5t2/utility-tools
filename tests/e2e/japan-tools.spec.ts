import { test, expect } from "@playwright/test";

test("郵便番号・電話番号・住所・都道府県コードを整形できる", async ({ page }) => {
  await page.goto("/japan/postal-code/");
  await page.locator("[data-input]").fill("１００－０００１");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/100-0001/);
  await expect(page.locator("[data-result]")).toHaveValue(/1000001/);

  await page.goto("/japan/phone-number/");
  await page.locator("[data-input]").fill("+81 90 1234 5678");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/090-1234-5678/);
  await expect(page.locator("[data-result]")).toHaveValue(/\+819012345678/);

  await page.goto("/japan/address-normalize/");
  await page.locator("[data-input]").fill("東京都　千代田区　１−２−３");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue("東京都 千代田区 1-2-3");

  await page.goto("/japan/prefecture-code/");
  await page.locator("[data-input]").fill("東京");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/都道府県コード: 13/);
  await expect(page.locator("[data-result]")).toHaveValue(/都道府県名: 東京都/);
});
test("法人番号のチェックデジットを国税庁の例どおり計算できる", async ({ page }) => {
  await page.goto("/japan/corporate-number/");
  await page.locator("[data-input]").fill("700110005901");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/チェックデジット: 8/);
  await expect(page.locator("[data-result]")).toHaveValue(/法人番号: 8700110005901/);

  await page.locator("[data-input]").fill("8700110005901");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/チェックデジット一致/);
});

test("4月1日と4月2日の学年境界を正しく計算できる", async ({ page }) => {
  await page.goto("/japan/school-year/");
  await page.locator("[data-birthdate]").fill("2001-04-01");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/小学校 入学: 2007年4月/);
  await expect(page.locator("[data-result]")).toHaveValue(/2000年4月2日〜2001年4月1日/);

  await page.locator("[data-birthdate]").fill("2001-04-02");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/小学校 入学: 2008年4月/);
  await expect(page.locator("[data-result]")).toHaveValue(/2001年4月2日〜2002年4月1日/);

  await page.goto("/category/japan/");
  await expect(page.getByRole("heading", { name: "日本向けツール一覧" })).toBeVisible();
  await expect(page.locator(".category-card")).toHaveCount(6);

  await page.goto("/use-case/japan-office-life/");
  await expect(page.getByRole("heading", { name: "日本の事務・生活データを整える" })).toBeVisible();
  await expect(page.locator(".usecase-card")).toHaveCount(9);
});
