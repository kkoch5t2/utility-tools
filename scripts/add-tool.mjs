import fs from "node:fs/promises";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=")];
}));

const required = ["id","mode","family","category","categoryKey","href","name","title","description","faqQuestion","faqAnswer"];
for (const key of required) {
  if (!args[key]) {
    console.error(`Missing --${key}=...`);
    process.exit(1);
  }
}

const validFamilies = new Set(["image","csv","text","pdf","qr","video","developer","utility","utilityplus","csvmore","generalmore"]);
const validCategories = new Set(["image","csv","json","text","pdf","qr","video","japanese","developer","date","calculator"]);
if (!validFamilies.has(args.family)) throw new Error(`Unsupported family: ${args.family}`);
if (!validCategories.has(args.categoryKey)) throw new Error(`Unsupported categoryKey: ${args.categoryKey}`);
if (!/^\/[a-z0-9/-]+\/$/.test(args.href)) throw new Error("href must look like /category/tool-slug/");

const file = path.join(process.cwd(), "src/config/extra-tools.ts");
let source = await fs.readFile(file, "utf8");

if (source.includes(`id: "${args.id}"`)) throw new Error(`id already exists: ${args.id}`);
if (source.includes(`href: "${args.href}"`)) throw new Error(`href already exists: ${args.href}`);

const q = (value) => JSON.stringify(value);
const entry = `  {
    id: ${q(args.id)}, mode: ${q(args.mode)}, family: ${q(args.family)}, category: ${q(args.category)}, categoryKey: ${q(args.categoryKey)},
    href: ${q(args.href)}, name: ${q(args.name)},
    title: ${q(args.title)},
    description: ${q(args.description)},
    faqs: [[${q(args.faqQuestion)}, ${q(args.faqAnswer)}], privacyFaq],
  },
`;

const marker = "export const extraTools: ExtraToolMeta[] = [\n";
if (!source.includes(marker)) throw new Error("Could not find extraTools array");
source = source.replace(marker, marker + entry);
if (args.dryRun === "true") {
  console.log(`Dry run OK for ${args.name} (${args.href})`);
  process.exit(0);
}
await fs.writeFile(file, source);

console.log(`Added metadata for ${args.name} (${args.href})`);
console.log("Next: implement the mode in its family component/script if the mode is new.");
console.log("Then run: npm run verify:full");
