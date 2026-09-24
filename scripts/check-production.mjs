const base = "https://utility-tools-jp.com";
const timeoutMs = 10000;
const concurrency = 12;

async function fetchWithTimeout(url) {
  return fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "utility-tools-production-monitor/1.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

const sitemapResponse = await fetchWithTimeout(base + "/sitemap.xml");
if (!sitemapResponse.ok) {
  throw new Error(`sitemap.xml: HTTP ${sitemapResponse.status}`);
}

const xml = await sitemapResponse.text();
const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
const failures = [];

for (let i = 0; i < urls.length; i += concurrency) {
  const batch = urls.slice(i, i + concurrency);
  const results = await Promise.allSettled(batch.map(async (url) => {
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }));

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      failures.push(`${batch[index]} - ${reason}`);
    }
  });
}

console.log(`Checked ${urls.length} production URLs.`);

if (failures.length > 0) {
  console.error("Production URL failures:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("All production URLs are healthy.");
