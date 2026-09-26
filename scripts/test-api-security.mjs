import { spawn } from "node:child_process";

const PORT = 8794;
const BASE = `http://127.0.0.1:${PORT}`;
const wranglerCli = "node_modules/wrangler/bin/wrangler.js";
const worker = spawn(
  process.execPath,
  [wranglerCli, "dev", "--config", "wrangler.jsonc", "--local", "--port", String(PORT)],
  { stdio: ["ignore", "pipe", "pipe"], detached: true },
);
let log = "";
worker.stdout.on("data", (chunk) => { log += chunk.toString(); });
worker.stderr.on("data", (chunk) => { log += chunk.toString(); });

const assert = (value, message) => { if (!value) throw new Error(message); };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitServer() {
  const end = Date.now() + 30000;
  while (Date.now() < end) {
    try { const r = await fetch(BASE + "/api/health"); if (r.ok) return; } catch {}
    await wait(250);
  }
  throw new Error("security test server did not start\n" + log);
}
function headers(ip = "198.51.100.77", extra = {}) {
  return { origin: BASE, "content-type": "application/json", "cf-connecting-ip": ip, ...extra };
}
async function createPoll(ip, body = { title: "security-test", options: ["A", "B"] }, extra = {}) {
  return fetch(BASE + "/api/polls", {
    method: "POST",
    headers: headers(ip, extra),
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

try {
  await waitServer();

  const valid = await createPoll("198.51.100.10");
  assert(valid.status === 201, `same-origin JSON must work, got ${valid.status}`);

  const evil = await fetch(BASE + "/api/polls", {
    method: "POST",
    headers: { origin: "https://evil.example", "content-type": "application/json", "cf-connecting-ip": "198.51.100.11" },
    body: JSON.stringify({ title: "blocked", options: ["A", "B"] }),
  });
  assert(evil.status === 403, `cross-origin mutation must be 403, got ${evil.status}`);

  const noOrigin = await fetch(BASE + "/api/polls", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.12" },
    body: JSON.stringify({ title: "blocked", options: ["A", "B"] }),
  });
  assert(noOrigin.status === 403, `origin-less mutation must be 403, got ${noOrigin.status}`);

  const wrongType = await createPoll("198.51.100.13", "hello", { "content-type": "text/plain" });
  assert(wrongType.status === 415, `non-JSON mutation must be 415, got ${wrongType.status}`);

  const large = await createPoll("198.51.100.14", JSON.stringify({ title: "x".repeat(40000), options: ["A", "B"] }));
  assert(large.status === 413, `oversized mutation must be 413, got ${large.status}`);

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(JSON.stringify({ title: "x".repeat(40000), options: ["A", "B"] })));
      controller.close();
    },
  });
  const chunked = await fetch(BASE + "/api/polls", {
    method: "POST",
    headers: headers("198.51.100.15"),
    body: stream,
    duplex: "half",
  });
  assert(chunked.status === 413, `chunked oversized mutation must be 413, got ${chunked.status}`);

  const statuses = [];
  for (let i = 0; i < 24; i += 1) statuses.push((await createPoll("198.51.100.99")).status);
  const limitedAt = statuses.findIndex((status) => status === 429);
  assert(limitedAt >= 0, `create rate limit must return 429, got ${statuses.join(",")}`);
  const limited = await createPoll("198.51.100.99");
  assert(limited.status === 429, `continued abuse must remain 429, got ${limited.status}`);
  assert(limited.headers.get("retry-after") === "60", "429 must include Retry-After: 60");

  const health = await fetch(BASE + "/api/health");
  assert(health.ok, "health endpoint must remain available");
  console.log("API security OK: origin / JSON / 32KiB body / rate limit / health bypass.");
} finally {
  try { if (worker.pid) process.kill(-worker.pid, "SIGTERM"); } catch {}
}
