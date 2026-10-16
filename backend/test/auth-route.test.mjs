// POST /api/auth/student-sign-in through createApp with an injected sign-in function (no network).
import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

process.env.SUPABASE_URL = "http://127.0.0.1:9";
process.env.SUPABASE_ANON_KEY = "sb_publishable_route-test";
process.env.KNOWLEDGE_SOURCE = "local";

const { createApp } = await import("../dist/app.js");

const SESSION = { access_token: "access.jwt", refresh_token: "refresh-token", expires_in: 3600, token_type: "bearer" };
let calls, outcome;
const studentSignIn = async (studentId, password) => { calls.push({ studentId, password }); return outcome; };
const deps = { frontendOrigin: "http://localhost:5173", requireAuth: (_q, _s, next) => next(), knowledgeService: { findSchedule: async () => null, search: async () => [] }, getAIService: () => null };

async function listen(app) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
const on = await listen(createApp({ ...deps, studentSignIn, signInRateLimit: { perIp: 4, perStudentId: 3, windowMs: 60_000 } }));
const off = await listen(createApp({ ...deps, studentSignIn: null }));
after(() => { on.server.close(); off.server.close(); });
beforeEach(() => { calls = []; outcome = { ok: true, session: SESSION }; });

let ipCounter = 0;
const post = (target, body, ip = `10.9.0.${++ipCounter}`) =>
  fetch(`${target.base}/api/auth/student-sign-in`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, headers: r.headers, body: await r.json() }));

test("a valid student ID and password returns the session and is never cached", async () => {
  const r = await post(on, { studentId: "12-34567-890", password: "secret" });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { session: SESSION });
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.deepEqual(calls, [{ studentId: "12-34567-890", password: "secret" }]);
});

test("surrounding spaces in the ID are ignored", async () => {
  await post(on, { studentId: "  12-34567-890 ", password: "secret" });
  assert.equal(calls[0].studentId, "12-34567-890");
});

test("a badly formatted ID or missing password is rejected before any lookup", async () => {
  for (const body of [{ studentId: "1234567890", password: "x" }, { studentId: "12-34567-890" }, { studentId: "12-34567-890", password: "" }, { password: "x" }, {}, { studentId: "12-34567-890", password: "x".repeat(201) }]) {
    const r = await post(on, body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.deepEqual(r.body, { error: { code: "INVALID_REQUEST", message: "Enter your student ID (for example 12-34567-890) and your password." } });
  }
  assert.equal(calls.length, 0);
});

test("wrong credentials get one generic message", async () => {
  outcome = { ok: false, reason: "invalid" };
  const r = await post(on, { studentId: "12-34567-890", password: "wrong" });
  assert.deepEqual({ status: r.status, body: r.body }, { status: 401, body: { error: { code: "INVALID_CREDENTIALS", message: "Incorrect student ID or password." } } });
});

test("Supabase rate limits and outages have their own messages", async () => {
  // Its own student ID: earlier tests already used up the attempts for 12-34567-890 on this server.
  outcome = { ok: false, reason: "rate_limited" };
  assert.equal((await post(on, { studentId: "33-33333-333", password: "x" })).status, 429);
  outcome = { ok: false, reason: "unavailable" };
  const down = await post(on, { studentId: "33-33333-333", password: "x" });
  assert.deepEqual({ status: down.status, body: down.body }, { status: 503, body: { error: { code: "AUTH_UNAVAILABLE", message: "Could not reach the sign-in service. Try again." } } });
});

test("without the service-role key, student ID sign-in says to use the university email", async () => {
  const r = await post(off, { studentId: "12-34567-890", password: "x" });
  assert.deepEqual({ status: r.status, body: r.body }, { status: 503, body: { error: { code: "STUDENT_SIGN_IN_UNAVAILABLE", message: "Student ID sign-in isn't set up yet. Sign in with your university email." } } });
});

test("attempts are limited per student ID, even from different devices", async () => {
  outcome = { ok: false, reason: "invalid" };
  const id = "11-11111-111";
  const statuses = [];
  for (let i = 0; i < 4; i++) statuses.push((await post(on, { studentId: id, password: "guess" })).status);
  assert.deepEqual(statuses, [401, 401, 401, 429]);
  assert.equal(calls.length, 3);
});

test("attempts are limited per device across different student IDs, with Retry-After", async () => {
  outcome = { ok: false, reason: "invalid" };
  const ip = "10.8.8.8";
  const results = [];
  for (let i = 0; i < 5; i++) results.push(await post(on, { studentId: `22-2222${i}-222`, password: "guess" }, ip));
  assert.deepEqual(results.map((r) => r.status), [401, 401, 401, 401, 429]);
  const limited = results[4];
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.deepEqual(limited.body, { error: { code: "RATE_LIMITED", message: "Too many sign-in attempts. Please wait a few minutes and try again." } });
});
