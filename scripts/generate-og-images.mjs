import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const outputDir = path.resolve("public/og");
fs.mkdirSync(outputDir, { recursive: true });
const logo = fs.readFileSync(path.resolve("public/utility-tools-logo-header-v2.png")).toString("base64");
const logoSrc = "data:image/png;base64," + logo;

const cards = [
  ["default", "無料Web便利ツール集", "画像・CSV・JSON・PDF・動画など150種類以上", "必要なときに、すぐ使える。"],
  ["image", "画像ツール", "圧縮・リサイズ・形式変換", "画像をブラウザ内で手軽に処理"],
  ["csv", "CSVツール", "分割・結合・変換・整形", "CSV作業をもっと手軽に"],
  ["json", "JSONツール", "整形・変換・抽出", "開発・データ処理を素早く"],
  ["text", "テキストツール", "文字数・整形・抽出", "文章やログの処理を手軽に"],
  ["pdf", "PDFツール", "結合・分割・画像変換", "PDFをアップロードせずブラウザ内で処理"],
  ["qr", "QRコードツール", "生成・読み取り", "URLやテキストをすぐQRコードに"],
  ["video", "動画ツール", "圧縮・MP3変換", "動画を端末内で処理"],
  ["japanese", "日本語ツール", "全角半角・かな・和暦変換", "日本語テキストをまとめて整形"],
  ["date", "日付ツール", "曜日・期間・週番号", "日付計算をすばやく確認"],
  ["calculator", "計算ツール", "割合・割引・単位換算", "日常の計算をシンプルに"],
  ["developer", "開発者向けツール", "Base64・UUID・URL変換など", "開発中のちょっとした作業をすぐ処理"],
  ["share", "共有・調整ツール", "日程調整・出欠確認", "URLを共有してみんなで回答"],
];

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || chromium.executablePath(),
});
for (const [key, heading, subheading, tagline] of cards) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html>
  <html lang="ja"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box} html,body{margin:0;width:1200px;height:630px}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP","Yu Gothic",sans-serif;background:#f5f8fd;color:#10223c}
    .frame{position:relative;width:1200px;height:630px;overflow:hidden;padding:72px 82px;background:
      radial-gradient(circle at 87% 10%,rgba(11,91,211,.16),transparent 34%),
      linear-gradient(135deg,#f8fbff 0%,#eef5ff 100%)}
    .frame:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(11,91,211,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(11,91,211,.045) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(to right,transparent,black)}
    .brand{position:relative;display:flex;align-items:center;gap:16px;font-size:26px;font-weight:800}
    .brand img{width:52px;height:52px;border-radius:12px}
    .badge{position:relative;display:inline-flex;margin-top:62px;padding:9px 15px;border-radius:999px;background:#e3efff;color:#0b5bd3;font-size:19px;font-weight:800}
    h1{position:relative;margin:18px 0 10px;font-size:68px;line-height:1.08;letter-spacing:-.035em}
    .sub{position:relative;margin:0;font-size:30px;font-weight:750;color:#29486e}
    .tag{position:relative;margin:24px 0 0;font-size:20px;color:#5f7189}
    .chips{position:absolute;left:82px;bottom:62px;display:flex;gap:12px}
    .chip{padding:9px 14px;border:1px solid #cddcf0;border-radius:10px;background:rgba(255,255,255,.82);font-size:17px;font-weight:700;color:#3e5879}
    .mark{position:absolute;right:-35px;bottom:-90px;width:360px;height:360px;border:76px solid rgba(11,91,211,.08);border-radius:50%}
  </style></head><body><div class="frame">
    <div class="brand"><img src="${logoSrc}" alt=""><span>無料Web便利ツール集</span></div>
    <div class="badge">${heading}</div>
    <h1>${subheading}</h1>
    <p class="sub">${tagline}</p>
    <div class="chips"><span class="chip">無料</span><span class="chip">登録不要</span><span class="chip">${key === "share" ? "共有URL" : "ブラウザ内処理"}</span></div>
    <div class="mark"></div>
  </div></body></html>`);
  await page.screenshot({ path: path.join(outputDir, key + ".png"), type: "png" });
  await page.close();
  console.log("generated", key + ".png");
}
await browser.close();
