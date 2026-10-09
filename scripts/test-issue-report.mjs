import assert from "node:assert/strict";
import worker from "../worker/index.js";

const origin = "https://utility-tools-jp.com";
const recipient = "private@example.invalid";
const forwarded = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  forwarded.push({ url: String(url), body: JSON.parse(options.body) });
  return Response.json({ success: "true" });
};

const env = {
  ISSUE_REPORT_EMAIL: recipient,
  API_REPORT_RATE_LIMITER: { limit: async () => ({ success: true }) },
};
function send(body, headers = { origin, "content-type": "application/json" }, overrides = env) {
  return worker.fetch(new Request(origin + "/api/issue-report", {
    method: "POST", headers, body: JSON.stringify(body),
  }), overrides);
}

try {
  const body = { issue_type: "その他", details: "画面が表示されない", tool: "テスト", url: origin, browser: "test-agent" };
  assert.equal((await send(body, { origin: "https://other.example", "content-type": "application/json" })).status, 403);
  assert.equal((await send(body, undefined, { ...env, ISSUE_REPORT_EMAIL: undefined })).status, 503);
  assert.equal((await send({ ...body, _honey: "bot" })).status, 200);
  assert.equal(forwarded.length, 0);
  assert.equal((await send({ ...body, issue_type: "unknown" })).status, 400);
  assert.equal((await send({ ...body, details: "x".repeat(1001) })).status, 400);
  assert.equal((await send({ ...body, email: "attacker@example.invalid" })).status, 200);
  assert.equal(forwarded.length, 1);
  assert.equal(forwarded[0].url, "https://formsubmit.co/ajax/" + encodeURIComponent(recipient));
  assert.equal(forwarded[0].body.email, undefined);
  assert.equal(forwarded[0].body.details, body.details);
  console.log("Issue report API OK: origin, private recipient, validation, honeypot, forwarding.");
} finally {
  globalThis.fetch = originalFetch;
}
