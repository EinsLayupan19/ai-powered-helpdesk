// Production behavior of createApp: serving the built frontend from the same origin as /api, security
// headers, proxy awareness, and the per-student /api/ask rate limit. Real requireAuth against a local fake
// Supabase Auth server; knowledge and AI are injected fakes. Nothing leaves 127.0.0.1.
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const TOKENS = { "token-a": "11111111-1111-4111-8111-111111111111", "token-b": "22222222-2222-4222-8222-222222222222" };
const authServer = createServer((req, res) => {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1];
  const id = req.url?.startsWith("/auth/v1/user") ? TOKENS[token] : undefined;
  res.writeHead(id ? 200 : 401, { "content-type": "application/json" });
  res.end(JSON.stringify(id ? { id, aud: "authenticated", role: "authenticated", email: `${id}@neu.edu.ph`, app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" } : { code: 401, msg: "invalid JWT" }));
});
await new Promise((resolve) => authServer.listen(0, "127.0.0.1", resolve));
process.env.SUPABASE_URL = `http://127.0.0.1:${authServer.address().port}`;
process.env.SUPABASE_ANON_KEY = "sb_publishable_deploy-test";
process.env.KNOWLEDGE_SOURCE = "local";

const { createApp } = await import("../dist/app.js");
const { requireAuth } = await import("../dist/middleware/auth.js");

// A stand-in for the Vite build output (dist/).
const staticDir = mkdtempSync(join(tmpdir(), "eagledesk-dist-"));
mkdirSync(join(staticDir, "assets"));
writeFileSync(join(staticDir, "index.html"), "<!doctype html><title>EagleDesk</title><div id=root></div>");
writeFileSync(join(staticDir, "assets", "index-abc123.js"), "console.log('app')");

const knowledgeService = { findSchedule: async () => null, search: async () => [] };
const ai = { generateAnswer: async () => "AI answer" };
const deps = { frontendOrigin: "http://localhost:5173", requireAuth, knowledgeService, getAIService: () => ai };

async function listen(app) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
const withStatic = await listen(createApp({ ...deps, staticDir, askRateLimit: { limit: 2, windowMs: 60_000 } }));
const apiOnly = await listen(createApp(deps));
after(() => {
  withStatic.server.close();
  apiOnly.server.close();
  authServer.close();
  rmSync(staticDir, { recursive: true, force: true });
});

const ask = (base, token) =>
  fetch(`${base}/api/ask`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ message: "What is HTML?" }) });

test("serves the built frontend at / with no-cache so new deploys show up", async () => {
  const res = await fetch(`${withStatic.base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  assert.match(res.headers.get("cache-control"), /no-cache/);
  assert.match(await res.text(), /<title>EagleDesk<\/title>/);
});

test("hashed assets are cached long-term", async () => {
  const res = await fetch(`${withStatic.base}/assets/index-abc123.js`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("cache-control"), /max-age=31536000/);
  assert.match(res.headers.get("cache-control"), /immutable/);
});

test("unknown page paths fall back to the app (e.g. links from password-reset emails)", async () => {
  const res = await fetch(`${withStatic.base}/reset?type=recovery`, { headers: { accept: "text/html" } });
  assert.equal(res.status, 200);
  assert.match(await res.text(), /<title>EagleDesk<\/title>/);
});

test("a missing asset is a real 404, not the app page", async () => {
  assert.equal((await fetch(`${withStatic.base}/assets/missing-file.js`)).status, 404);
});

test("unknown /api routes are still JSON 404s when the frontend is served", async () => {
  const res = await fetch(`${withStatic.base}/api/nope`);
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: { code: "NOT_FOUND", message: "Not found." } });
});

test("API-only mode (no build present) is unchanged: / is not served", async () => {
  assert.equal((await fetch(`${apiOnly.base}/`)).status, 404);
  assert.deepEqual(await (await fetch(`${apiOnly.base}/api/health`)).json(), { ok: true });
});

test("security headers are set on pages and API responses", async () => {
  for (const url of [`${withStatic.base}/`, `${withStatic.base}/api/health`]) {
    const res = await fetch(url);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-frame-options"), "DENY");
    assert.equal(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.equal(res.headers.get("x-powered-by"), null);
  }
});

test("trusts one proxy hop (hosting platforms terminate HTTPS in front of the app)", () => {
  assert.equal(createApp(deps).get("trust proxy"), 1);
});

test("rate-limits /api/ask per student, with Retry-After, without affecting other students", async () => {
  assert.equal((await ask(withStatic.base, "token-a")).status, 200);
  assert.equal((await ask(withStatic.base, "token-a")).status, 200);
  const limited = await ask(withStatic.base, "token-a");
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.deepEqual(await limited.json(), { error: { code: "RATE_LIMITED", message: "You're sending questions too quickly. Please wait a few minutes and try again." } });
  assert.equal((await ask(withStatic.base, "token-b")).status, 200);
});

test("unauthenticated requests are rejected before they count against anyone", async () => {
  assert.equal((await ask(withStatic.base, "forged")).status, 401);
  assert.equal((await ask(withStatic.base, "token-b")).status, 200);
});
