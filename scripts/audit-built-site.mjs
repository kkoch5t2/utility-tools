import fs from "node:fs";
import path from "node:path";

const root = "dist";
const SITE = "https://utility-tools-jp.com";
const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === "index.html") htmlFiles.push(full);
  }
}

function parseAttrs(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function findTag(html, name, predicate) {
  for (const match of html.matchAll(new RegExp("<" + name + "\\b[^>]*>", "gi"))) {
    const attrs = parseAttrs(match[0]);
    if (predicate(attrs)) return attrs;
  }
  return null;
}
walk(root);
const pages = new Map();
const titles = new Map();
const descriptions = new Map();
const issues = [];
let maxInitialJsBytes = 0;
let maxInitialJsUrl = "";

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  let url = "/" + path.relative(root, path.dirname(file)).split(path.sep).join("/");
  if (url === "/.") url = "/";
  if (url !== "/" && !url.endsWith("/")) url += "/";

  const title = (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
  const description = findTag(html, "meta", (a) => a.name === "description")?.content ?? "";
  const canonical = findTag(html, "link", (a) => a.rel === "canonical")?.href ?? "";
  const robots = findTag(html, "meta", (a) => a.name === "robots")?.content ?? "";
  const ogImage = findTag(html, "meta", (a) => a.property === "og:image")?.content ?? "";
  const twitterCard = findTag(html, "meta", (a) => a.name === "twitter:card")?.content ?? "";
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  const expectedCanonical = SITE + url;
  const scriptRefs = new Set([...html.matchAll(/<script\b[^>]*src=["']([^"']+\.js)["'][^>]*>/gi)].map((m) => m[1]).filter((src) => src.startsWith("/_astro/")));
  const initialJsBytes = [...scriptRefs].reduce((sum, src) => {
    const asset = path.join(root, src.replace(/^\//, ""));
    return sum + (fs.existsSync(asset) ? fs.statSync(asset).size : 0);
  }, 0);
  if (initialJsBytes > maxInitialJsBytes) { maxInitialJsBytes = initialJsBytes; maxInitialJsUrl = url; }
  if (initialJsBytes > 50 * 1024) issues.push([url, "initial JS budget exceeded: " + initialJsBytes + " bytes"]);

  if (!title) issues.push([url, "missing title"]);
  else if (titles.has(title)) issues.push([url, "duplicate title with " + titles.get(title)]);
  else titles.set(title, url);
  if (!description) issues.push([url, "missing description"]);
  else if (descriptions.has(description)) issues.push([url, "duplicate description with " + descriptions.get(description)]);
  else descriptions.set(description, url);
  if (canonical !== expectedCanonical) issues.push([url, "canonical mismatch"]);
  if (h1Count !== 1) issues.push([url, "h1 count " + h1Count]);
  if (/noindex/i.test(robots)) issues.push([url, "unexpected noindex"]);
  if (!ogImage) issues.push([url, "missing og:image"]);
  else if (ogImage.startsWith(SITE)) {
    const imagePath = path.join(root, new URL(ogImage).pathname.replace(/^\//, ""));
    if (!fs.existsSync(imagePath)) issues.push([url, "missing OG image asset " + ogImage]);
  }
  if (twitterCard !== "summary_large_image") issues.push([url, "twitter card is not summary_large_image"]);

  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); } catch { issues.push([url, "invalid JSON-LD"]); }
  }
  pages.set(url, html);
}
for (const [url, html] of pages) {
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
    let href = match[1];
    if (href.startsWith("http")) continue;
    if (/^(mailto:|tel:|#|javascript:|\/\/)/.test(href)) continue;
    href = href.split("#", 1)[0].split("?", 1)[0];
    if (!href || !href.startsWith("/")) continue;
    if (/\.(png|jpe?g|webp|svg|ico|xml|txt|js|css|mjs)$/i.test(href)) continue;
    const target = href.endsWith("/") ? href : href + "/";
    if (!pages.has(target)) issues.push([url, "broken internal link " + href]);
  }
}

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const sitePaths = locs.map((loc) => new URL(loc).pathname);
if (locs.length !== new Set(locs).size) issues.push(["sitemap", "duplicate URL"]);

for (const url of pages.keys()) {
  if (!sitePaths.includes(url)) issues.push([url, "missing from sitemap"]);
}
for (const url of sitePaths) {
  if (!pages.has(url)) issues.push([url, "sitemap URL has no HTML page"]);
}

if (issues.length) {
  console.error("Built-site audit failed:");
  for (const [url, issue] of issues) console.error("- " + url + ": " + issue);
  process.exit(1);
}

console.log(
  "Built-site audit OK: " +
  htmlFiles.length + " pages / " +
  locs.length + " sitemap URLs / unique title+description / canonical+H1+JSON-LD+OG+links OK / max initial JS " + maxInitialJsBytes + " bytes at " + maxInitialJsUrl + "."
);
