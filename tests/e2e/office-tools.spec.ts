import { test, expect } from "@playwright/test";

test("議事録・日報・報告書・稟議書テンプレートを作成できる", async ({ page }) => {
  await page.goto("/office/meeting-minutes/");
  await page.locator("[data-title]").fill("週次定例");
  await page.locator("[data-agenda]").fill("進捗確認\n次週計画");
  await page.locator("[data-decisions]").fill("A案で進める");
  await page.locator("[data-todos]").fill("田中 / 資料更新 / 9月30日");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/# 週次定例 議事録/);
  await expect(page.locator("[data-result]")).toHaveValue(/・A案で進める/);

  await page.goto("/office/daily-report/");
  await page.locator("[data-date]").fill("2026-09-25");
  await page.locator("[data-done]").fill("データ更新\nテスト実施");
  await page.locator("[data-next]").fill("本番確認");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/## 本日の実施内容/);
  await expect(page.locator("[data-result]")).toHaveValue(/・データ更新/);

  await page.goto("/office/report-template/");
  await page.locator("[data-title]").fill("進捗報告");
  await page.locator("[data-summary]").fill("予定どおり進行中");
  await page.locator("[data-facts]").fill("開発完了\nE2E成功");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/# 進捗報告/);
  await expect(page.locator("[data-result]")).toHaveValue(/・E2E成功/);

  await page.goto("/office/approval-request/");
  await page.locator("[data-title]").fill("開発ツール導入");
  await page.locator("[data-purpose]").fill("作業効率化");
  await page.locator("[data-cost]").fill("月額10,000円");
  await page.locator("[data-benefit]").fill("作業時間削減");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/# 稟議: 開発ツール導入/);
  await expect(page.locator("[data-result]")).toHaveValue(/ご承認をお願いいたします/);
});
test("メール件名とビジネス敬語を生成できる", async ({ page }) => {
  await page.goto("/office/email-subject/");
  await page.locator("[data-purpose]").fill("資料確認");
  await page.locator("[data-project]").fill("A案件");
  await page.locator("[data-deadline]").fill("9月30日まで");
  await page.locator("[data-tone]").selectOption("request");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/【ご依頼】A案件：資料確認/);
  await expect(page.locator("[data-result]")).toHaveValue(/9月30日まで/);

  await page.goto("/office/business-keigo/");
  await page.locator("[data-source]").fill("了解しました。資料を見てください。すみません。");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/承知いたしました/);
  await expect(page.locator("[data-result]")).toHaveValue(/ご確認ください/);
  await expect(page.locator("[data-result]")).toHaveValue(/申し訳ございません/);
});

test("残業集計と時給・月給・年収換算が動く", async ({ page }) => {
  await page.goto("/office/overtime-sum/");
  await page.locator("[data-values]").fill("1:30\n0:45\n2.25");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/合計残業時間: 4時間30分/);
  await expect(page.locator("[data-result]")).toHaveValue(/平均: 1時間30分/);

  await page.goto("/office/salary-converter/");
  await page.locator("[data-type]").selectOption("hourly");
  await page.locator("[data-value]").fill("1500");
  await page.locator("[data-hours]").fill("8");
  await page.locator("[data-days]").fill("20");
  await page.locator("[data-run]").click();
  await expect(page.locator("[data-result]")).toHaveValue(/月給換算: 240,000円/);
  await expect(page.locator("[data-result]")).toHaveValue(/年収換算: 2,880,000円/);
});
test("仕事・事務カテゴリと目的別ページから関連ツールへ移動できる", async ({ page }) => {
  await page.goto("/category/office/");
  await expect(page.getByRole("heading", { name: "仕事・事務ツール一覧" })).toBeVisible();
  await expect(page.locator(".category-card")).toHaveCount(8);

  await page.goto("/use-case/office-work/");
  await expect(page.getByRole("heading", { name: "仕事の文書・時間を整理する" })).toBeVisible();
  await expect(page.locator(".usecase-card")).toHaveCount(10);
});
