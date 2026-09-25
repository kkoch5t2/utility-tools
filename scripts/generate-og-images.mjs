import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const outputDir = path.resolve("public/og");
fs.mkdirSync(outputDir, { recursive: true });
const logo = fs.readFileSync(path.resolve("public/utility-tools-logo-header-v2.png")).toString("base64");
const logoSrc = "data:image/png;base64," + logo;

const cards = [
  ["default", "無料Web便利ツール集", "画像・CSV・JSON・PDF・動画・ゲームなど180種類以上", "必要なときに、すぐ使える。"],
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
  ["security", "セキュリティツール", "個人情報・メタデータ確認", "機密情報を送信せずブラウザ内で確認"],
  ["japan", "日本向けツール", "郵便番号・法人番号・学歴年", "日本の事務・生活で使う処理をすぐ確認"],
  ["office", "仕事・事務ツール", "議事録・日報・残業集計", "毎日の事務作業をブラウザですばやく整理"],
  ["game", "無料ブラウザゲーム", "インストール不要ですぐ遊べる", "短時間で遊べる軽量ゲームをブラウザで"],
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
const gameCards = [
  ["game-lumo-sky-run", "Lumo's Sky Run", "RUN · JUMP · EXPLORE", "#22d3ee", "#2563eb", "ACTION"],
  ["game-meteor-drift", "Meteor Drift", "DODGE THE STORM", "#38bdf8", "#1d4ed8", "SURVIVAL"],
  ["game-neon-snake", "Neon Snake", "SWIPE · EAT · GROW", "#22c55e", "#0ea5e9", "ARCADE"],
  ["game-number-chain-10", "10をつくれ！", "CHAIN NUMBERS TO TEN", "#facc15", "#f97316", "PUZZLE"],
  ["game-flash-matrix", "Flash Matrix", "REMEMBER THE LIGHT", "#a78bfa", "#7c3aed", "MEMORY"],
  ["game-reaction-zero", "Reaction Zero", "HOW FAST ARE YOU?", "#fb7185", "#0ea5e9", "REACTION"],
  ["game-orbit-catch", "Orbit Catch", "STOP ON THE TARGET", "#fde047", "#06b6d4", "TIMING"],
];

for (const [key, heading, tagline, accent, accent2, genre] of gameCards) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif;background:#020617;color:white}
    .frame{position:relative;width:1200px;height:630px;overflow:hidden;padding:62px 72px;background:
      radial-gradient(circle at 78% 28%,${accent}33,transparent 29%),
      radial-gradient(circle at 90% 88%,${accent2}2b,transparent 28%),
      linear-gradient(140deg,#020617,#0f172a 58%,#111827)}
    .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(148,163,184,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.07) 1px,transparent 1px);background-size:44px 44px;mask-image:linear-gradient(90deg,transparent 5%,black 56%,transparent)}
    .brand{position:relative;display:flex;align-items:center;gap:14px;color:#cbd5e1;font-size:19px;font-weight:800}.brand img{width:42px;height:42px;border-radius:10px}
    .genre{position:relative;display:inline-flex;margin-top:72px;padding:8px 13px;border:1px solid ${accent}66;border-radius:999px;background:${accent}17;color:${accent};font-size:14px;font-weight:950;letter-spacing:.14em}
    h1{position:relative;max-width:850px;margin:18px 0 8px;font-size:72px;line-height:1;letter-spacing:-.045em}
    .tag{position:relative;margin:0;color:#b8c7d9;font-size:25px;font-weight:800;letter-spacing:.04em}
    .play{position:absolute;left:72px;bottom:62px;display:flex;align-items:center;gap:12px;color:#e2e8f0;font-size:16px;font-weight:800}.play b{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:${accent};color:#020617}
    .orb{position:absolute;right:84px;top:115px;width:250px;height:250px;border:2px solid ${accent}66;border-radius:50%;box-shadow:0 0 90px ${accent}28,inset 0 0 55px ${accent2}22}
    .orb:before,.orb:after{content:"";position:absolute;border-radius:50%;background:${accent};box-shadow:0 0 30px ${accent}}
    .orb:before{width:28px;height:28px;top:12px;left:98px}.orb:after{width:15px;height:15px;right:32px;bottom:47px;background:${accent2};box-shadow:0 0 22px ${accent2}}
    .line{position:absolute;right:38px;bottom:70px;width:380px;height:110px;border:2px solid ${accent2}44;border-left:0;border-bottom:0;border-radius:0 110px 0 0;transform:rotate(-9deg)}
  </style></head><body><div class="frame"><div class="grid"></div><div class="brand"><img src="${logoSrc}" alt=""><span>無料Web便利ツール集 · GAME</span></div><div class="genre">${genre}</div><h1>${heading}</h1><p class="tag">${tagline}</p><div class="play"><b>▶</b><span>FREE · NO INSTALL</span></div><div class="orb"></div><div class="line"></div></div></body></html>`);
  await page.screenshot({ path: path.join(outputDir, key + ".png"), type: "png" });
  await page.close();
  console.log("generated", key + ".png");
}
await browser.close();
