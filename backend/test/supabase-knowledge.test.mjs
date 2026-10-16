// SupabaseKnowledgeService against a local fake PostgREST (127.0.0.1 only). Uses the real installed
// @supabase/supabase-js; no Supabase project, network, or service-role key is involved.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import {
  KNOWLEDGE_COLUMNS, KnowledgeUnavailableError, SupabaseKnowledgeService, classifyKnowledgeError, toKnowledgeEntry,
} from "../dist/services/knowledge/SupabaseKnowledgeService.js";

const TOKEN = "student.jwt.token-xyz";
const ANON = "sb_publishable_test-key";
const SECRET_SQL = 'column "secret_internal" does not exist';
const LEAKS = [SECRET_SQL, "secret_internal", "SELECT", "Perhaps", TOKEN, ANON, "JWT expired", "schema cache", "\n    at "];

const row = (overrides = {}) => ({
  id: "00000000-0000-0000-0000-000000000001", slug: "student-id-replacement", title: "Lost Student ID", category: "Student ID",
  content: "Verified replacement steps.", keywords: ["student id", "lost", "replacement"], applies_to: null, source_url: null,
  verification_status: "verified", last_verified_at: "2026-10-01T00:00:00Z", ...overrides,
});

let respond = (_req, res) => json(res, 200, []);
let requests = [];
function json(res, status, body) { res.writeHead(status, { "content-type": "application/json" }); res.end(typeof body === "string" ? body : JSON.stringify(body)); }
const server = createServer((req, res) => { requests.push({ url: req.url, headers: req.headers }); respond(req, res); });
let baseUrl, deadUrl;

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  deadUrl = `http://127.0.0.1:${probe.address().port}`;
  await new Promise((resolve) => probe.close(resolve));
});
after(() => server.close());

function service(options = {}) {
  const logs = [];
  const svc = new SupabaseKnowledgeService({ url: baseUrl, anonKey: ANON, log: (line) => logs.push(line), ...options });
  return { svc, logs };
}
async function failure(promise) {
  try { await promise; } catch (error) { return error; }
  assert.fail("expected the call to fail");
}
const assertNoLeak = (text) => { for (const leak of LEAKS) assert.ok(!text.includes(leak), `leaked ${JSON.stringify(leak)} in ${text}`); };

test("forwards the student's JWT with the anon key and asks only for verified rows and approved columns", async () => {
  requests = []; respond = (_req, res) => json(res, 200, [row()]);
  const { svc } = service();
  await svc.search("I lost my student ID", { accessToken: TOKEN });
  assert.equal(requests.length, 1);
  const { url, headers } = requests[0];
  assert.equal(headers.authorization, `Bearer ${TOKEN}`);
  assert.equal(headers.apikey, ANON);
  const params = new URL(url, baseUrl).searchParams;
  assert.ok(url.startsWith("/rest/v1/knowledge_entries?"));
  assert.equal(params.get("select"), KNOWLEDGE_COLUMNS);
  assert.ok(!params.get("select").includes("*") && !params.get("select").includes("source_note"));
  assert.equal(params.get("verification_status"), "eq.verified");
  assert.equal(params.get("order"), "slug.asc");
  assert.equal(params.get("limit"), "200");
});

test("refuses to query without a verified access token (no request is made)", async () => {
  requests = [];
  const { svc, logs } = service();
  const error = await failure(svc.search("I lost my student ID", {}));
  assert.ok(error instanceof KnowledgeUnavailableError);
  assert.equal(error.reason, "unauthorized");
  assert.equal(requests.length, 0);
  assert.deepEqual(logs, ["[knowledge] unavailable reason=unauthorized"]);
});

test("returns ranked documents from verified rows; the source id is the slug", async () => {
  respond = (_req, res) => json(res, 200, [
    row(),
    row({ id: "2", slug: "student-id-first-time", title: "Student ID", content: "First-time steps.", keywords: ["student id", "get id", "new id"] }),
  ]);
  const { svc } = service();
  const results = await svc.search("I lost my student ID", { accessToken: TOKEN });
  assert.deepEqual(results.map((r) => r.document.id), ["student-id-replacement"]);
  assert.deepEqual(results[0].document, { id: "student-id-replacement", title: "Lost Student ID", category: "Student ID", content: "Verified replacement steps.", source: "knowledge_entries/student-id-replacement" });
  assert.ok(results[0].relevance > 0);
});

test("adds 'Applies to' to the context only when the entry states a scope", async () => {
  respond = (_req, res) => json(res, 200, [row({ applies_to: "CICS students", source_url: "https://neu.edu.ph/main/student-services" })]);
  const { svc } = service();
  const [result] = await svc.search("I lost my student ID", { accessToken: TOKEN });
  assert.equal(result.document.content, "Verified replacement steps.\n\nApplies to: CICS students");
  assert.equal(result.document.source, "https://neu.edu.ph/main/student-services");
});

test("ignores unverified and malformed rows before ranking", async () => {
  const bad = [
    row({ slug: "draft-row", verification_status: "draft" }), row({ slug: "review-row", verification_status: "needs_review" }),
    row({ slug: "retired-row", verification_status: "retired" }), row({ slug: "no-status", verification_status: undefined }),
    row({ slug: "blank-title", title: "   " }), row({ slug: "blank-content", content: "\n" }), row({ slug: "no-id", id: undefined }),
    row({ slug: "Bad Slug" }), row({ slug: "keywords-string", keywords: "lost" }), row({ slug: "keyword-number", keywords: ["lost", 7] }),
    row({ slug: "http-url", source_url: "http://neu.edu.ph" }), row({ slug: "no-date", last_verified_at: null }),
    row({ slug: "bad-date", last_verified_at: "not a date" }), row({ slug: "blank-scope", applies_to: "  " }), null, "text", [row()],
  ];
  respond = (_req, res) => json(res, 200, [...bad, row({ slug: "good-row" })]);
  const { svc, logs } = service();
  const entries = await svc.fetchVerifiedEntries(TOKEN);
  assert.deepEqual(entries.map((e) => e.slug), ["good-row"]);
  assert.deepEqual(logs, [`[knowledge] ignored ${bad.length} unverified or malformed row(s)`]);
  assert.equal(toKnowledgeEntry(row({ verification_status: "draft" })), null);
});

test("drafts never reach ranking even when their keywords match perfectly", async () => {
  respond = (_req, res) => json(res, 200, [row({ verification_status: "draft" })]);
  const { svc } = service();
  assert.deepEqual(await svc.search("I lost my student ID replacement", { accessToken: TOKEN }), []);
});

test("an empty result is [] and is not an error", async () => {
  respond = (_req, res) => json(res, 200, []);
  const { svc, logs } = service();
  assert.deepEqual(await svc.search("I lost my student ID", { accessToken: TOKEN }), []);
  assert.deepEqual(logs, []);
});

test("verified rows that do not match the question return []", async () => {
  respond = (_req, res) => json(res, 200, [row()]);
  const { svc } = service();
  assert.deepEqual(await svc.search("What is HTML?", { accessToken: TOKEN }), []);
});

test("a slow database times out on schedule", async () => {
  respond = (_req, res) => setTimeout(() => json(res, 200, []), 3000);
  const { svc, logs } = service({ timeoutMs: 250 });
  const started = performance.now();
  const error = await failure(svc.search("I lost my student ID", { accessToken: TOKEN }));
  const elapsed = performance.now() - started;
  assert.equal(error.reason, "timeout");
  assert.ok(elapsed >= 200 && elapsed < 1500, `took ${Math.round(elapsed)} ms`);
  assert.deepEqual(logs, ["[knowledge] unavailable reason=timeout"]);
});

test("connection refused is a fast network error without retry delays", async () => {
  const logs = [];
  const svc = new SupabaseKnowledgeService({ url: deadUrl, anonKey: ANON, log: (line) => logs.push(line) });
  const started = performance.now();
  const error = await failure(svc.search("I lost my student ID", { accessToken: TOKEN }));
  assert.equal(error.reason, "network");
  assert.ok(performance.now() - started < 1500);
  assert.deepEqual(logs, ["[knowledge] unavailable reason=network"]);
});

test("a database 503 is attempted exactly once (no retries)", async () => {
  requests = []; respond = (_req, res) => json(res, 503, { code: "PGRST002", message: "Could not query the database for the schema cache. Retrying.", details: null, hint: null });
  const { svc } = service();
  const started = performance.now();
  const error = await failure(svc.search("I lost my student ID", { accessToken: TOKEN }));
  assert.equal(error.reason, "query_failed");
  assert.equal(error.code, "PGRST002");
  assert.equal(requests.length, 1);
  assert.ok(performance.now() - started < 1000);
});

test("SQL errors are redacted to a safe code in the error and the log", async () => {
  respond = (_req, res) => json(res, 400, { code: "42703", message: SECRET_SQL, details: "SELECT secret_internal FROM public.knowledge_entries", hint: "Perhaps you meant ..." });
  const { svc, logs } = service();
  const error = await failure(svc.search("I lost my student ID", { accessToken: TOKEN }));
  assert.equal(error.reason, "query_failed");
  assert.equal(error.code, "42703");
  assert.equal(error.message, "Knowledge retrieval is unavailable.");
  assertNoLeak(JSON.stringify({ ...error, message: error.message }));
  assert.deepEqual(logs, ["[knowledge] unavailable reason=query_failed code=42703"]);
  assertNoLeak(logs.join("\n"));
});

test("an expired or invalid JWT is reported as unauthorized", async () => {
  respond = (_req, res) => json(res, 401, { code: "PGRST303", message: "JWT expired", details: null, hint: null });
  const { svc, logs } = service();
  const error = await failure(svc.search("I lost my student ID", { accessToken: TOKEN }));
  assert.equal(error.reason, "unauthorized");
  assert.deepEqual(logs, ["[knowledge] unavailable reason=unauthorized code=PGRST303"]);
});

test("a missing table (PGRST205) is a query failure with a diagnosable code", async () => {
  respond = (_req, res) => json(res, 404, { code: "PGRST205", message: "Could not find the table 'public.knowledge_entries' in the schema cache", details: null, hint: null });
  const { svc, logs } = service();
  const error = await failure(svc.search("I lost my student ID", { accessToken: TOKEN }));
  assert.equal(error.reason, "query_failed");
  assert.equal(error.code, "PGRST205");
  assertNoLeak(logs.join("\n"));
});

test("an unreadable response body is an error, never an empty success", async () => {
  respond = (_req, res) => json(res, 200, "{not json");
  const { svc } = service();
  const error = await failure(svc.search("I lost my student ID", { accessToken: TOKEN }));
  assert.ok(error instanceof KnowledgeUnavailableError);
});

test("unsafe error codes are dropped rather than logged", () => {
  assert.equal(classifyKnowledgeError({ code: "<script>alert(1)</script>", message: "x" }, 400).code, undefined);
  assert.equal(classifyKnowledgeError({ code: "42P01", message: "x" }, 400).code, "42P01");
  assert.equal(classifyKnowledgeError({ name: "TimeoutError", message: "The operation was aborted due to timeout" }, 0).reason, "timeout");
  assert.equal(classifyKnowledgeError(null, 0).reason, "network");
});

test("logs a warning when the row limit is reached", async () => {
  respond = (_req, res) => json(res, 200, Array.from({ length: 200 }, (_, i) => row({ id: String(i), slug: `entry-${i}` })));
  const { svc, logs } = service();
  await svc.fetchVerifiedEntries(TOKEN);
  assert.ok(logs.some((line) => line.startsWith("[knowledge] row limit reached (200)")));
});

test("schedule lookups still use the local 3BSIT-1 matcher (no database request)", async () => {
  requests = [];
  const { svc } = service();
  const match = await svc.findSchedule("What is the schedule of 3BSIT-1?");
  assert.equal(match?.section, "3BSIT-1");
  assert.equal(match?.entries.length, 6);
  assert.equal(requests.length, 0);
});
