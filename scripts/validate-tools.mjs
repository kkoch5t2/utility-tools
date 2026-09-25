import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const extraPath = path.join(root, "src/config/extra-tools.ts");
const source = await fs.readFile(extraPath, "utf8");

const entries = [...source.matchAll(/\{\s*id:\s*"([^"]+)",\s*mode:\s*"([^"]+)",\s*family:\s*"([^"]+)",\s*category:\s*"([^"]+)",\s*categoryKey:\s*"([^"]+)",\s*\n?\s*href:\s*"([^"]+)"/g)]
  .map((m) => ({ id:m[1], mode:m[2], family:m[3], category:m[4], categoryKey:m[5], href:m[6] }));

const allowedFamilies = new Set(["image","csv","text","pdf","qr","video","developer","utility","utilityplus","csvmore","generalmore","special","security","japan","office","game"]);
const allowedCategories = new Set(["image","csv","json","text","pdf","qr","video","japanese","developer","date","calculator","share","security","japan","office","game"]);

const errors = [];
const seenIds = new Set();
const seenHrefs = new Set();

for (const tool of entries) {
  if (seenIds.has(tool.id)) errors.push(`duplicate id: ${tool.id}`);
  if (seenHrefs.has(tool.href)) errors.push(`duplicate href: ${tool.href}`);
  seenIds.add(tool.id); seenHrefs.add(tool.href);

  if (!allowedFamilies.has(tool.family)) errors.push(`invalid family: ${tool.id} -> ${tool.family}`);
  if (!allowedCategories.has(tool.categoryKey)) errors.push(`invalid categoryKey: ${tool.id} -> ${tool.categoryKey}`);
  if (!/^\/[a-z0-9/-]+\/$/.test(tool.href)) errors.push(`invalid href: ${tool.id} -> ${tool.href}`);
}

if (entries.length < 1) errors.push("no extra tool definitions parsed");

if (errors.length) {
  console.error("Tool metadata validation failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log(`Tool metadata OK: ${entries.length} extra tools.`);
