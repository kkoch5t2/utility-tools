import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const routes = [
  "/image/compress/","/image/resize/","/image/png-to-jpg/","/image/webp-converter/","/image/crop/","/image/target-filesize/",
  "/csv/merge/","/csv/columns/","/csv/encoding/","/csv/json-converter/",
  "/text/json-formatter/","/text/character-count/","/text/fullwidth-halfwidth/","/text/newline-converter/",
  "/pdf/merge/","/pdf/split/","/pdf/to-images/",
  "/qr/generate/","/qr/read/","/video/compress/","/video/to-mp3/","/video/trim/","/video/remove-audio/","/video/resize/","/video/rotate/","/video/speed/","/video/to-webm/","/video/to-gif/",
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
  "/csv/sort/","/csv/filter/","/csv/add-row-number/","/csv/rename-headers/","/csv/transpose/","/csv/value-count/",
  "/json/array-dedupe/","/json/array-sort/","/json/path-extractor/","/json/string-escape/",
  "/text/find-replace/","/text/reverse-lines/","/text/shuffle-lines/","/text/word-frequency/","/text/line-ending/",
  "/japanese/kana-normalize/","/japanese/punctuation-normalize/","/japanese/space-normalize/","/japanese/character-types/",
  "/developer/query-string/","/developer/base-converter/","/developer/uuid-validate/","/developer/ulid/",
  "/date/weekday/","/date/iso-week/",
  "/calculator/percentage/","/calculator/discount/","/calculator/statistics/","/calculator/bytes/","/calculator/aspect-ratio/",
  "/text/join-lines/","/text/split-delimiter/","/text/pad-lines/","/json/pick-keys/",
  "/developer/hex-text/","/developer/crc32/","/developer/identifier-case/","/developer/semver-compare/",
  "/date/month-difference/","/calculator/time-duration/",
  "/developer/uuid/","/developer/unix-time/",
  "/text/extract-numbers/","/text/extract-hashtags/","/developer/unicode-escape/","/developer/base64url/",
  "/date/leap-year/","/date/day-of-year/","/date/quarter/","/calculator/tax/","/calculator/compound-interest/","/calculator/temperature/",
  "/calculator/length/","/calculator/mass/","/calculator/area/","/calculator/speed/","/calculator/pressure/",
  "/date/days-in-month/","/date/fiscal-year/","/calculator/gcd-lcm/","/calculator/prime-check/","/calculator/modulo/",
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

test("さらに追加したCSV・JSON・TEXTツールが動く", async ({ page }) => {
  await page.goto("/csv/sort/");
  await page.locator("[data-source]").fill("name,age\nAlice,30\nBob,20");
  await page.locator("[data-a]").fill("age");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/Bob,20\r?\nAlice,30/);

  await page.goto("/csv/filter/");
  await page.locator("[data-source]").fill("name,status\nAlice,active\nBob,inactive");
  await page.locator("[data-a]").fill("status");
  await page.locator("[data-b]").fill("active");
  await page.locator("[data-action]").selectOption("equals");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/Alice,active/);
  await expect(page.locator("[data-result]")).not.toHaveValue(/Bob/);

  await page.goto("/json/array-dedupe/");
  await page.locator("[data-source]").fill('[1,2,1,{"a":1},{"a":1}]');
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/\[\n  1,\n  2,/);

  await page.goto("/json/path-extractor/");
  await page.locator("[data-a]").fill("user.name");
  await page.locator("[data-source]").fill('{"user":{"name":"Alice"}}');
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("Alice");

  await page.goto("/text/find-replace/");
  await page.locator("[data-a]").fill("foo");
  await page.locator("[data-b]").fill("bar");
  await page.locator("[data-source]").fill("foo foo");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("bar bar");
});

test("さらに追加した日本語・開発者・日付・計算ツールが動く", async ({ page }) => {
  await page.goto("/japanese/kana-normalize/");
  await page.locator("[data-source]").fill("ｶﾀｶﾅ ＡＢＣ");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("カタカナ ABC");

  await page.goto("/developer/query-string/");
  await page.locator("[data-source]").fill("a=1&b=hello%20world");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/"b": "hello world"/);

  await page.goto("/developer/base-converter/");
  await page.locator("[data-a]").fill("10");
  await page.locator("[data-b]").fill("16");
  await page.locator("[data-source]").fill("255");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("FF");

  await page.goto("/developer/ulid/");
  await page.locator("[data-a]").fill("3");
  await page.getByRole("button",{name:"処理する"}).click();
  const ulids=(await page.locator("[data-result]").inputValue()).trim().split("\n");
  expect(ulids).toHaveLength(3);
  expect(ulids.every((v)=>v.length===26)).toBeTruthy();

  await page.goto("/date/weekday/");
  await page.locator("[data-a]").fill("2026-09-23");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/水曜日/);

  await page.goto("/calculator/statistics/");
  await page.locator("[data-source]").fill("1,2,3,4,5");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/平均: 3/);

  await page.goto("/calculator/aspect-ratio/");
  await page.locator("[data-a]").fill("1920");
  await page.locator("[data-b]").fill("1080");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/16:9/);
});

test("100ツール突破分の追加機能が動く", async ({ page }) => {
  await page.goto("/text/join-lines/");
  await page.locator("[data-a]").fill(" | ");
  await page.locator("[data-source]").fill("a\nb\nc");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("a | b | c");

  await page.goto("/text/split-delimiter/");
  await page.locator("[data-a]").fill(",");
  await page.locator("[data-source]").fill("a, b,c");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("a\nb\nc");

  await page.goto("/text/pad-lines/");
  await page.locator("[data-a]").fill("5");
  await page.locator("[data-source]").fill("a\nabc");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("a    \nabc  ");

  await page.goto("/json/pick-keys/");
  await page.locator("[data-a]").fill("name,status");
  await page.locator("[data-source]").fill('[{"name":"Alice","age":30,"status":"active"}]');
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/"name": "Alice"/);
  await expect(page.locator("[data-result]")).not.toHaveValue(/"age"/);

  await page.goto("/developer/hex-text/");
  await page.locator("[data-source]").fill("あ");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("e3 81 82");

  await page.goto("/developer/crc32/");
  await page.locator("[data-source]").fill("123456789");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("CBF43926");

  await page.goto("/developer/identifier-case/");
  await page.locator("[data-action]").selectOption("snake");
  await page.locator("[data-source]").fill("helloWorld test");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("hello_world_test");

  await page.goto("/developer/semver-compare/");
  await page.locator("[data-a]").fill("1.2.3-alpha");
  await page.locator("[data-b]").fill("1.2.3");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("1.2.3-alpha < 1.2.3");

  await page.goto("/date/month-difference/");
  await page.locator("[data-a]").fill("2026-01-15");
  await page.locator("[data-b]").fill("2026-03-20");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/2か月 5日/);

  await page.goto("/calculator/time-duration/");
  await page.locator("[data-a]").fill("23:30");
  await page.locator("[data-b]").fill("01:15");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/1時間 45分/);
  await expect(page.locator("[data-info]")).toHaveText(/翌日/);
});

test("新しい抽出・変換・日付・計算ツールが動く", async ({ page }) => {
  await page.goto("/text/extract-numbers/");
  await page.locator("[data-source]").fill("abc -12.5 xyz 30");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("-12.5\n30");

  await page.goto("/text/extract-hashtags/");
  await page.locator("[data-source]").fill("#東京 #AI #東京");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("#東京\n#AI");

  await page.goto("/developer/unicode-escape/");
  await page.locator("[data-source]").fill("あA");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("\\u3042A");
  await page.locator("[data-action]").selectOption("decode");
  await page.locator("[data-source]").fill("\\u3042");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("あ");

  await page.goto("/developer/base64url/");
  await page.locator("[data-source]").fill("abc?");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("YWJjPw");

  await page.goto("/date/leap-year/");
  await page.locator("[data-a]").fill("2028");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/うるう年/);

  await page.goto("/date/day-of-year/");
  await page.locator("[data-a]").fill("2026-01-31");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/31日目/);

  await page.goto("/date/quarter/");
  await page.locator("[data-a]").fill("2026-09-24");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/第3四半期/);

  await page.goto("/calculator/tax/");
  await page.locator("[data-a]").fill("1000");
  await page.locator("[data-b]").fill("10");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/税込価格: 1,100/);

  await page.goto("/calculator/compound-interest/");
  await page.locator("[data-a]").fill("1000");
  await page.locator("[data-b]").fill("10");
  await page.locator("[data-c]").fill("2");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/将来金額: 1,210/);

  await page.goto("/calculator/temperature/");
  await page.locator("[data-a]").fill("0");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("32 ℉");
});

test("単位換算・年度・整数計算ツールが動く", async ({ page }) => {
  await page.goto("/calculator/length/");
  await page.locator("[data-a]").fill("1000");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("1 km");

  await page.goto("/calculator/mass/");
  await page.locator("[data-a]").fill("2");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("2,000 g");

  await page.goto("/calculator/area/");
  await page.locator("[data-a]").fill("3.3057851239669422");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("1 坪");

  await page.goto("/calculator/speed/");
  await page.locator("[data-a]").fill("36");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("10 m/s");

  await page.goto("/calculator/pressure/");
  await page.locator("[data-a]").fill("1000");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("1 kPa");

  await page.goto("/date/days-in-month/");
  await page.locator("[data-a]").fill("2028");
  await page.locator("[data-b]").fill("2");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/29日まで/);

  await page.goto("/date/fiscal-year/");
  await page.locator("[data-a]").fill("2027-02-01");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue(/2026年度/);

  await page.goto("/calculator/gcd-lcm/");
  await page.locator("[data-a]").fill("12");
  await page.locator("[data-b]").fill("18");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("最大公約数: 6\n最小公倍数: 36");

  await page.goto("/calculator/prime-check/");
  await page.locator("[data-a]").fill("97");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("97 は素数です。");

  await page.goto("/calculator/modulo/");
  await page.locator("[data-a]").fill("17");
  await page.locator("[data-b]").fill("5");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("商: 3\n余り: 2");
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
  const allCount = await page.locator("[data-tool-card]").count();
  const totalPages = Math.ceil(allCount / 12);
  const lastPageCount = allCount - (totalPages - 1) * 12;
  await expect(page.locator("[data-visible-count]")).toHaveText(allCount + "件");
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(12);
  await expect(page.locator("[data-pagination]")).toBeVisible();
  await expect(page.locator("[data-page-numbers] button")).toHaveCount(totalPages);

  for (let pageNumber = 2; pageNumber <= totalPages; pageNumber++) {
    await page.getByRole("button", { name: "次へ →" }).click();
    expect(new URL(page.url()).searchParams.get("page")).toBe(String(pageNumber));
    await expect(page.locator("[data-tool-card]:visible")).toHaveCount(pageNumber === totalPages ? lastPageCount : 12);
  }

  await page.locator("[data-filter-select]").selectOption("pdf");
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(3);
  await expect(page.locator("[data-visible-count]")).toHaveText("3件");
  await expect(page.locator("[data-pagination]")).toBeHidden();
  await expect(page.locator("[data-filter-select]")).toHaveValue("pdf");
  await expect(page).toHaveURL(/\?category=pdf$/);

  await page.locator("[data-filter-select]").selectOption("image");
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(9);
  await expect(page.locator("[data-visible-count]")).toHaveText("9件");

  await page.locator("[data-filter-select]").selectOption("all");
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(12);
  await expect(page).toHaveURL(/\/$/);
});


test("追加したニッチテキスト・開発者ツールが動く", async ({ page }) => {
  await page.goto("/text/trim-each-line/");
  await page.locator("[data-source]").fill("  alpha  \n\tbeta\t");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("alpha\nbeta");

  await page.goto("/text/collapse-blank-lines/");
  await page.locator("[data-source]").fill("a\n\n   \n\nb");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("a\n\nb");

  await page.goto("/text/extract-emails/");
  await page.locator("[data-source]").fill("a@example.com x a@example.com y b@test.jp");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("a@example.com\nb@test.jp");

  await page.goto("/text/extract-urls/");
  await page.locator("[data-source]").fill("see https://example.com/test and http://example.org/a.");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("https://example.com/test\nhttp://example.org/a");

  await page.goto("/text/remove-html-tags/");
  await page.locator("[data-source]").fill("<p>Hello <strong>world</strong></p>");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("Hello world");

  await page.goto("/developer/regex-escape/");
  await page.locator("[data-source]").fill("a+b.c?");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("a\\+b\\.c\\?");

  await page.goto("/text/quote-lines/");
  await page.locator("[data-source]").fill("a\nb");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue('"a"\n"b"');

  await page.goto("/text/unquote-lines/");
  await page.locator("[data-source]").fill('"a"\n"b"');
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("a\nb");

  await page.goto("/developer/normalize-slashes/");
  await page.locator("[data-source]").fill("C:\\Users\\kota\\file.txt");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("C:/Users/kota/file.txt");

  await page.goto("/text/sort-lines-by-length/");
  await page.locator("[data-source]").fill("cccc\na\nbb");
  await page.getByRole("button",{name:"処理する"}).click();
  await expect(page.locator("[data-result]")).toHaveValue("a\nbb\ncccc");
});


test("トップページで検索とお気に入りが使える", async ({ page }) => {
  await page.goto("/");
  const allCount = await page.locator("[data-tool-card]").count();

  const search = page.locator("[data-tool-search]");
  await search.fill("Base64エンコード・デコード");
  await expect(page.locator("[data-visible-count]")).toHaveText("1件");
  await expect(page.locator("[data-tool-card]:visible")).toHaveCount(1);
  await expect(page.locator("[data-tool-card]:visible h3")).toHaveText("Base64エンコード・デコード");
  await expect(page).toHaveURL(/q=Base64/);

  const base64Card = page.locator("[data-tool-card]").filter({ hasText: "Base64エンコード・デコード" });
  await base64Card.locator("[data-favorite]").click();
  await page.locator("[data-search-clear]").click();
  await expect(page.locator("[data-visible-count]")).toHaveText(allCount + "件");
  await expect(base64Card.locator("[data-favorite]")).toHaveAttribute("aria-pressed", "true");

  await page.locator("[data-favorites-only]").click();
  await expect(page.locator("[data-visible-count]")).toHaveText("1件");
  await expect(page.locator("[data-tool-card]:visible h3")).toHaveText("Base64エンコード・デコード");
  await expect(page).toHaveURL(/favorites=1/);

  await page.reload();
  await expect(page.locator("[data-visible-count]")).toHaveText("1件");
  await expect(page.locator("[data-tool-card]:visible h3")).toHaveText("Base64エンコード・デコード");

  await page.locator("[data-favorites-only]").click();
  await expect(page.locator("[data-visible-count]")).toHaveText(allCount + "件");
});

test("150ツール化で追加したJSON・テキスト・計算ツールが動く", async ({ page }) => {
  const runText = async (path: string, input: string) => {
    await page.goto(path);
    await page.locator("[data-source]").fill(input);
    await page.getByRole("button", { name: "処理する" }).click();
    return page.locator("[data-result]");
  };

  await expect(await runText("/json/minify/", '{\n  "a": 1,\n  "b": [2, 3]\n}')).toHaveValue('{"a":1,"b":[2,3]}');
  await expect(await runText("/json/validate/", '{"ok":true}')).toHaveValue(/有効なJSONです/);

  await page.goto("/json/remove-keys/");
  await page.locator("#json-remove-keys").fill("password,token");
  await page.locator("[data-source]").fill('{"name":"a","password":"x","nested":{"token":"y","keep":1}}');
  await page.getByRole("button", { name: "処理する" }).click();
  await expect(page.locator("[data-result]")).toHaveValue('{\n  "name": "a",\n  "nested": {\n    "keep": 1\n  }\n}');

  await expect(await runText("/json/element-count/", '{"a":[1,2],"b":{"c":3}}')).toHaveValue(/キー: 3/);
  await expect(await runText("/text/extract-ipv4/", "ok 192.168.1.1 bad 999.1.1.1 ok 8.8.8.8")).toHaveValue("192.168.1.1\n8.8.8.8");
  await expect(await runText("/text/extract-domains/", "https://www.example.com/a and test.jp")).toHaveValue("example.com\ntest.jp");
  await expect(await runText("/text/remove-duplicate-words/", "a b a c b")).toHaveValue("a b c");

  await page.goto("/text/truncate/");
  await page.locator("#truncate-length").fill("3");
  await page.locator("[data-source]").fill("abcdef");
  await page.getByRole("button", { name: "処理する" }).click();
  await expect(page.locator("[data-result]")).toHaveValue("abc");

  await expect(await runText("/developer/rot13/", "Hello")).toHaveValue("Uryyb");

  await page.goto("/developer/color-converter/");
  await page.locator("[data-source]").fill("#336699");
  await page.getByRole("button", { name: "処理する" }).click();
  await expect(page.locator("[data-result]")).toHaveValue("51, 102, 153");
  await page.locator("[data-action]").selectOption("rgb-hex");
  await page.locator("[data-source]").fill("51,102,153");
  await page.getByRole("button", { name: "処理する" }).click();
  await expect(page.locator("[data-result]")).toHaveValue("#336699");

  await page.goto("/calculator/volume/");
  await page.locator("#volume-value").fill("1");
  await page.getByRole("button", { name: "処理する" }).click();
  await expect(page.locator("[data-result]")).toHaveValue(/1,000 mL/);

  await page.goto("/calculator/energy/");
  await page.locator("#energy-value").fill("4.184");
  await page.getByRole("button", { name: "処理する" }).click();
  await expect(page.locator("[data-result]")).toHaveValue("1 kcal");

  await page.goto("/calculator/power/");
  await page.locator("#power-value").fill("1");
  await page.getByRole("button", { name: "処理する" }).click();
  await expect(page.locator("[data-result]")).toHaveValue(/1,000 W/);

  await page.goto("/calculator/pace/");
  await page.locator("#pace-distance").fill("10");
  await page.locator("#pace-minutes").fill("50");
  await page.getByRole("button", { name: "処理する" }).click();
  await expect(page.locator("[data-result]")).toHaveValue("ペース: 5:00 /km\n平均速度: 12.00 km/h");

  await page.goto("/calculator/bill-split/");
  await page.locator("#bill-total").fill("10000");
  await page.locator("#bill-tip").fill("10");
  await page.locator("#bill-people").fill("2");
  await page.getByRole("button", { name: "処理する" }).click();
  await expect(page.locator("[data-result]")).toHaveValue(/1人あたり: 5,500/);
});
