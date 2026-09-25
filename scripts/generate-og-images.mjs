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
const gameArtDir = path.resolve("public/game-art");
fs.mkdirSync(gameArtDir, { recursive: true });

const gameArtCards = [
  ["lumo-sky-run", "ACTION", "Lumo's Sky Run", "走って、跳んで、空中遺跡を駆け抜けろ。", "lumo", "#22d3ee", "#2563eb"],
  ["meteor-drift", "SURVIVAL", "Meteor Drift", "隕石をかわして45秒。", "meteor", "#38bdf8", "#f97316"],
  ["neon-snake", "ARCADE", "Neon Snake", "食べて伸びる。ぶつかるまで終われない。", "snake", "#22c55e", "#06b6d4"],
  ["number-chain-10", "PUZZLE", "10をつくれ！", "数字をつないで合計10。", "number", "#facc15", "#f97316"],
  ["flash-matrix", "MEMORY", "Flash Matrix", "光った順番、どこまで覚えられる？", "matrix", "#a78bfa", "#22d3ee"],
  ["reaction-zero", "REACTION", "Reaction Zero", "光った瞬間に押せ。", "reaction", "#38bdf8", "#fb7185"],
  ["orbit-catch", "TIMING", "Orbit Catch", "回る光を黄色の中心で止めろ。", "orbit", "#fde047", "#22d3ee"],
];

function sceneMarkup(kind) {
  if (kind === "lumo") return `
    <div class="cloud c1"></div><div class="cloud c2"></div><div class="island i1"></div><div class="island i2"></div><div class="island i3"></div>
    <div class="lumo"><i></i><b></b><em></em><span></span></div><div class="trail"></div>`;
  if (kind === "meteor") return `
    <div class="planet"></div><div class="meteor m1"></div><div class="meteor m2"></div><div class="meteor m3"></div><div class="meteor m4"></div>
    <div class="ship"><i></i><b></b></div><div class="boost"></div>`;
  if (kind === "snake") return `
    <div class="neon-grid"></div><div class="food f1"></div><div class="food f2"></div><div class="snake-body">${Array.from({length:9},(_,i)=>`<i style="--n:${i}"></i>`).join("")}</div><div class="snake-head">●</div>`;
  if (kind === "number") return `
    <div class="number-grid"></div><div class="num n1">4</div><div class="num n2">1</div><div class="num n3">5</div><div class="num n4">7</div><div class="num n5">3</div><svg class="number-line" viewBox="0 0 600 350"><path d="M95 250 C190 180 225 225 300 160 S430 100 500 150"/></svg><div class="ten">= 10</div>`;
  if (kind === "matrix") return `
    <div class="matrix">${Array.from({length:16},(_,i)=>`<i class="${[1,6,10,15].includes(i)?"on":""}"></i>`).join("")}</div><div class="matrix-arrow">1 → 2 → 3 → 4</div>`;
  if (kind === "reaction") return `
    <div class="reaction-ring"><div>TAP!</div></div><div class="timer">0.183<small>sec</small></div><div class="pulse p1"></div><div class="pulse p2"></div>`;
  return `
    <div class="orbit-ring"><div class="target"></div><div class="orbit-dot"></div><div class="orbit-core">STOP</div></div><div class="orbit-path"></div>`;
}

for (const [key, genre, heading, tagline, kind, accent, accent2] of gameArtCards) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const scene = sceneMarkup(kind);
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif;background:#020617;color:#fff}
    .frame{position:relative;width:1200px;height:630px;overflow:hidden;background:radial-gradient(circle at 76% 38%,${accent}2e,transparent 29%),radial-gradient(circle at 92% 78%,${accent2}22,transparent 26%),linear-gradient(140deg,#020617,#0a1325 55%,#111827)}
    .frame:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(148,163,184,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.07) 1px,transparent 1px);background-size:44px 44px;mask-image:linear-gradient(90deg,transparent,black 48%,black)}
    .copy{position:absolute;z-index:20;left:58px;top:58px;width:430px}.genre{display:inline-flex;padding:7px 11px;border:1px solid ${accent}70;border-radius:999px;background:${accent}18;color:${accent};font-size:13px;font-weight:950;letter-spacing:.14em}.copy h1{margin:16px 0 9px;font-size:48px;line-height:1;letter-spacing:-.04em}.copy p{margin:0;color:#b8c8db;font-size:20px;font-weight:700;line-height:1.55}.play{position:absolute;left:58px;bottom:48px;display:flex;align-items:center;gap:10px;color:#dbeafe;font-size:14px;font-weight:850}.play i{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:${accent};color:#020617;font-style:normal}
    .scene{position:absolute;z-index:3;right:0;top:0;width:720px;height:630px;overflow:hidden}.scene:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#07111f 0%,transparent 24%,transparent 85%,rgba(2,6,23,.18))}
    .cloud{position:absolute;width:190px;height:54px;border-radius:999px;background:rgba(255,255,255,.68);filter:blur(1px)}.cloud:before,.cloud:after{content:"";position:absolute;border-radius:50%;background:inherit}.cloud:before{width:90px;height:90px;left:35px;bottom:0}.cloud:after{width:72px;height:72px;left:105px;bottom:0}.c1{right:42px;top:86px;opacity:.72}.c2{right:310px;top:420px;opacity:.42;transform:scale(.8)}
    .island{position:absolute;height:34px;border-radius:8px;background:linear-gradient(#9ca3af,#475569);box-shadow:0 13px 0 -3px #334155,0 30px 28px rgba(0,0,0,.3)}.island:before{content:"";position:absolute;inset:-6px 8px auto;height:8px;border-radius:8px;background:#86efac}.i1{width:250px;right:20px;bottom:115px;transform:rotate(-4deg)}.i2{width:190px;right:330px;bottom:260px;transform:rotate(5deg)}.i3{width:140px;right:180px;top:145px;transform:rotate(-8deg)}
    .lumo{position:absolute;right:250px;top:230px;width:120px;height:140px;transform:rotate(-12deg);filter:drop-shadow(0 18px 18px rgba(0,0,0,.34))}.lumo i{position:absolute;left:22px;top:0;width:78px;height:62px;border:5px solid #e2e8f0;border-radius:28px 28px 20px 20px;background:#0f172a;box-shadow:inset 0 -8px 18px #1d4ed8}.lumo i:before,.lumo i:after{content:"";position:absolute;top:22px;width:13px;height:21px;border-radius:50%;background:#67e8f9;box-shadow:0 0 15px #22d3ee}.lumo i:before{left:17px}.lumo i:after{right:17px}.lumo b{position:absolute;left:30px;top:59px;width:62px;height:58px;border-radius:17px;background:linear-gradient(145deg,#f8fafc,#94a3b8)}.lumo em,.lumo span{position:absolute;top:72px;width:46px;height:16px;border-radius:9px;background:#cbd5e1}.lumo em{left:-5px;transform:rotate(-30deg)}.lumo span{right:-3px;transform:rotate(35deg)}.trail{position:absolute;right:360px;top:315px;width:220px;height:18px;border-radius:50%;background:${accent};filter:blur(8px);opacity:.55;transform:rotate(-12deg)}
    .planet{position:absolute;right:-130px;top:-90px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#60a5fa,#1e40af 52%,#0f172a 72%);box-shadow:0 0 80px #2563eb55}.meteor{position:absolute;border-radius:50%;background:radial-gradient(circle at 35% 30%,#9ca3af,#475569 55%,#1f2937);box-shadow:-35px 0 42px #f9731666}.meteor:after{content:"";position:absolute;left:-100px;top:35%;width:110px;height:28px;border-radius:50%;background:linear-gradient(90deg,transparent,#f97316);filter:blur(5px)}.m1{width:105px;height:105px;right:110px;top:390px}.m2{width:70px;height:70px;right:450px;top:110px}.m3{width:58px;height:58px;right:350px;top:420px}.m4{width:42px;height:42px;right:90px;top:210px}.ship{position:absolute;right:285px;top:250px;width:150px;height:90px;clip-path:polygon(0 50%,72% 0,100% 50%,72% 100%);background:linear-gradient(90deg,#e2e8f0,#38bdf8);transform:rotate(-12deg);filter:drop-shadow(0 0 20px #38bdf899)}.ship i{position:absolute;right:30px;top:27px;width:44px;height:36px;border-radius:50%;background:#0f172a;box-shadow:inset 0 0 15px #2563eb}.boost{position:absolute;right:430px;top:292px;width:185px;height:26px;border-radius:50%;background:linear-gradient(90deg,transparent,#22d3ee);filter:blur(5px);transform:rotate(-12deg)}
    .neon-grid{position:absolute;inset:80px 20px 30px 80px;transform:perspective(500px) rotateX(58deg);transform-origin:center bottom;background-image:linear-gradient(#22d3ee44 2px,transparent 2px),linear-gradient(90deg,#22d3ee44 2px,transparent 2px);background-size:58px 58px;box-shadow:inset 0 0 60px #22d3ee22}.snake-body i{position:absolute;width:54px;height:54px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#86efac,#22c55e 60%,#15803d);box-shadow:0 0 18px #22c55e99;right:calc(80px + var(--n)*48px);top:260px}.snake-body i:nth-child(2n){transform:translateY(-14px)}.snake-body i:nth-child(3n){transform:translateY(12px)}.snake-head{position:absolute;right:75px;top:240px;width:78px;height:78px;border-radius:50%;background:#22c55e;color:#fff;font-size:30px;display:grid;place-items:center;box-shadow:0 0 25px #22c55e}.food{position:absolute;width:34px;height:34px;border-radius:50%;background:#fde047;box-shadow:0 0 22px #facc15}.f1{right:110px;top:120px}.f2{right:530px;top:390px;background:#f472b6;box-shadow:0 0 22px #ec4899}
    .number-grid{position:absolute;inset:70px 20px 40px 80px;background-image:linear-gradient(#38bdf822 1px,transparent 1px),linear-gradient(90deg,#38bdf822 1px,transparent 1px);background-size:64px 64px}.num{position:absolute;display:grid;place-items:center;width:108px;height:108px;border:2px solid #ffffff55;border-radius:20px;color:#fff;font-size:46px;font-weight:950;box-shadow:0 18px 28px rgba(0,0,0,.28),0 0 24px currentColor}.n1{right:490px;top:350px;background:#7c3aed}.n2{right:365px;top:240px;background:#0ea5e9}.n3{right:230px;top:145px;background:#f97316}.n4{right:110px;top:330px;background:#2563eb}.n5{right:75px;top:105px;background:#22c55e}.number-line{position:absolute;right:0;top:50px;width:620px;height:400px;fill:none;stroke:#fde047;stroke-width:10;filter:drop-shadow(0 0 12px #facc15)}.ten{position:absolute;right:95px;bottom:65px;font-size:76px;font-weight:950;color:#fde047;text-shadow:0 0 24px #facc15}
    .matrix{position:absolute;right:95px;top:95px;display:grid;grid-template-columns:repeat(4,92px);gap:14px;transform:perspective(900px) rotateY(-10deg) rotateX(4deg)}.matrix i{width:92px;height:92px;border:2px solid #64748b;border-radius:14px;background:#172033;box-shadow:inset 0 0 20px #020617}.matrix i.on{border-color:#fde047;background:#facc15;box-shadow:0 0 30px #facc1599}.matrix-arrow{position:absolute;right:150px;bottom:62px;color:#a5f3fc;font-size:28px;font-weight:900;letter-spacing:.08em}
    .reaction-ring{position:absolute;right:150px;top:135px;width:330px;height:330px;border:28px solid #0ea5e9;border-radius:50%;box-shadow:0 0 60px #38bdf877,inset 0 0 60px #38bdf855;display:grid;place-items:center}.reaction-ring div{display:grid;place-items:center;width:210px;height:210px;border-radius:50%;background:#0284c7;color:#fff;font-size:60px;font-weight:950;box-shadow:0 0 40px #38bdf8}.timer{position:absolute;right:390px;top:80px;padding:13px 18px;border:1px solid #38bdf866;border-radius:12px;background:#0f172acc;color:#67e8f9;font-size:40px;font-weight:950}.timer small{margin-left:5px;font-size:14px}.pulse{position:absolute;right:145px;top:130px;width:340px;height:340px;border:3px solid #38bdf844;border-radius:50%;animation:none}.p1{transform:scale(1.15)}.p2{transform:scale(1.34);opacity:.45}
    .orbit-ring{position:absolute;right:110px;top:92px;width:420px;height:420px;border:28px solid #2563eb;border-radius:50%;box-shadow:0 0 50px #22d3ee55,inset 0 0 40px #0ea5e944}.target{position:absolute;left:66px;top:-32px;width:110px;height:38px;border-radius:20px;background:#fde047;box-shadow:0 0 28px #facc15}.orbit-dot{position:absolute;right:-35px;top:185px;width:54px;height:54px;border-radius:50%;background:#67e8f9;box-shadow:0 0 28px #22d3ee}.orbit-core{position:absolute;inset:90px;display:grid;place-items:center;border-radius:50%;background:#111827;color:#fde047;font-size:36px;font-weight:950}.orbit-path{position:absolute;right:44px;top:26px;width:550px;height:550px;border:2px dashed #67e8f955;border-radius:50%}
  </style></head><body><div class="frame">
    <div class="copy"><div class="genre">${genre}</div><h1>${heading}</h1><p>${tagline}</p></div>
    <div class="play"><i>▶</i><span>FREE · NO INSTALL</span></div>
    <div class="scene">${scene}</div>
  </div></body></html>`);
  await page.screenshot({ path: path.join(gameArtDir, key + ".jpg"), type: "jpeg", quality: 78 });
  await page.close();
  console.log("generated game-art", key + ".jpg");
}
await browser.close();
