import { mkdir, writeFile } from "node:fs/promises";

const API = "https://api.cloudflare.com/client/v4";
const HOST = "utility-tools-jp.com";
const DAYS = 7;
const LIMIT = 6;
const token = process.env.CLOUDFLARE_API_TOKEN;

if (!token) throw new Error("CLOUDFLARE_API_TOKEN is not configured.");

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function requestJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers ?? {}) } });
  const body = await response.json();
  if (!response.ok || body.success === false || body.errors?.length) {
    const errors = body.errors?.map((error) => error.message).join("; ") || response.statusText;
    throw new Error(`Cloudflare API error (${response.status}): ${errors}`);
  }
  return body;
}

const configuredAccountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
let accountIds = configuredAccountId ? [configuredAccountId] : [];

if (!accountIds.length) {
  const accounts = await requestJson(`${API}/accounts`);
  accountIds = (accounts.result ?? []).map((account) => account.id).filter(Boolean);
}
if (!accountIds.length) throw new Error("No Cloudflare account is available to this token.");

const end = new Date();
const start = new Date(end.getTime() - DAYS * 24 * 60 * 60 * 1000);
const iso = (date) => date.toISOString();

function graphqlFor(accountId) {
  return `query {
    viewer {
      accounts(filter: { accountTag: "${accountId}" }) {
        topPaths: rumPerformanceEventsAdaptiveGroups(
          limit: 500
          orderBy: [count_DESC]
          filter: {
            datetime_geq: "${iso(start)}"
            datetime_leq: "${iso(end)}"
            requestHost: "${HOST}"
          }
        ) {
          count
          dimensions { requestPath requestHost siteTag }
        }
      }
    }
  }`;
}

let rows = [];
for (const accountId of accountIds) {
  const result = await requestJson(`${API}/graphql`, {
    method: "POST",
    body: JSON.stringify({ query: graphqlFor(accountId) }),
  });
  const accountRows = result.data?.viewer?.accounts?.[0]?.topPaths ?? [];
  if (accountRows.length) {
    rows = accountRows;
    break;
  }
}

const toolPattern = /^(?:\/(schedule|poll|attendance|split-bill)\/?|\/(image|csv|json|text|pdf|qr|video|japanese|developer|date|calculator)\/[a-z0-9-]+\/?)$/;
const totals = new Map();

for (const row of rows) {
  let path = row.dimensions?.requestPath;
  if (typeof path !== "string") continue;
  path = path.split("?")[0];
  if (!toolPattern.test(path)) continue;
  if (!path.endsWith("/")) path += "/";
  totals.set(path, (totals.get(path) ?? 0) + Number(row.count || 0));
}

const items = [...totals.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, LIMIT)
  .map(([path]) => ({ path }));

if (!items.length) {
  console.log("No tool page views yet; keeping the existing popularity ranking unchanged.");
  process.exit(0);
}

const output = {
  generatedAt: end.toISOString(),
  periodDays: DAYS,
  items,
};

await mkdir("src/data", { recursive: true });
await writeFile("src/data/popular-tools.json", JSON.stringify(output, null, 2) + "\n");
console.log(`Updated popular tools: ${items.map((item) => item.path).join(", ")}`);
