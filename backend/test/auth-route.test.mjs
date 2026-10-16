// POST /api/auth/student-sign-in through createApp with an injected sign-in function (no network).
import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

process.env.SUPABASE_URL = "http://127.0.0.1:9";
process.env.SUPABASE_ANON_KEY = "sb_publishable_route-test";
process.env.KNOWLEDGE_SOURCE = "local";

const { createApp } = await import("../dist/app.js");

const SESSION = { access_token: "access.jwt", refresh_token: "refresh-token", expires_in: 3600, token_type: "bearer" };
let calls, outcome, resets, resetOutcome;
const studentSignIn = async (studentId, password) => { calls.push({ studentId, password }); return outcome; };
const studentReset = async (studentId) => { resets.push(studentId); return resetOutcome; };
let registrations, registerOutcome;
const studentRegistration = async (input) => { registrations.push(input); return registerOutcome; };
const deps = { frontendOrigin: "http://localhost:5173", requireAuth: (_q, _s, next) => next(), knowledgeService: { findSchedule: async () => null, search: async () => [] }, getAIService: () => null };

async function listen(app) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
const on = await listen(createApp({ ...deps, studentSignIn, studentReset, studentRegistration, signInRateLimit: { perIp: 4, perStudentId: 3, windowMs: 60_000 }, registerRateLimit: { perIp: 3, windowMs: 60_000 } }));
const off = await listen(createApp({ ...deps, studentSignIn: null, studentReset: null, studentRegistration: null }));
after(() => { on.server.close(); off.server.close(); });
beforeEach(() => { calls = []; outcome = { ok: true, session: SESSION }; resets = []; resetOutcome = { ok: true }; registrations = []; registerOutcome = { ok: true }; });

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

test("without the service-role key, student ID sign-in points to Continue with Google", async () => {
  const r = await post(off, { studentId: "12-34567-890", password: "x" });
  assert.deepEqual({ status: r.status, body: r.body }, { status: 503, body: { error: { code: "STUDENT_SIGN_IN_UNAVAILABLE", message: "Student ID sign-in isn't set up yet. Use Continue with Google with your @neu.edu.ph account." } } });
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

const postReset = (target, body, ip = `10.7.0.${++ipCounter}`) =>
  fetch(`${target.base}/api/auth/student-reset`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, headers: r.headers, body: await r.json() }));
const SENT = { ok: true, message: "If that student ID has an account, a password reset link is on its way to its university email." };

test("forgot password by student ID always gives the same answer and is never cached", async () => {
  const r = await postReset(on, { studentId: " 44-44444-444 " });
  assert.deepEqual({ status: r.status, body: r.body }, { status: 200, body: SENT });
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.deepEqual(resets, ["44-44444-444"]);
});

test("forgot password rejects a badly formatted ID, and says when it is not set up", async () => {
  assert.equal((await postReset(on, { studentId: "4444444444" })).status, 400);
  assert.equal(resets.length, 0);
  const r = await postReset(off, { studentId: "44-44444-444" });
  assert.equal(r.status, 503);
  assert.equal(r.body.error.code, "STUDENT_SIGN_IN_UNAVAILABLE");
});

test("forgot password reports rate limits and outages", async () => {
  resetOutcome = { ok: false, reason: "rate_limited" };
  assert.equal((await postReset(on, { studentId: "55-55555-555" })).status, 429);
  resetOutcome = { ok: false, reason: "unavailable" };
  assert.equal((await postReset(on, { studentId: "56-55555-555" })).status, 503);
});

test("forgot password is limited per student ID", async () => {
  const statuses = [];
  for (let i = 0; i < 4; i++) statuses.push((await postReset(on, { studentId: "66-66666-666" })).status);
  assert.deepEqual(statuses, [200, 200, 200, 429]);
});

test("signing in before confirming the email gets its own message", async () => {
  outcome = { ok: false, reason: "unconfirmed" };
  const r = await post(on, { studentId: "77-77777-777", password: "x" });
  assert.deepEqual({ status: r.status, body: r.body }, { status: 403, body: { error: { code: "EMAIL_NOT_CONFIRMED", message: "Confirm your account first: open the link we sent to your NEU email, then sign in." } } });
});

const postRegister = (target, body, ip = `10.6.0.${++ipCounter}`) =>
  fetch(`${target.base}/api/auth/register`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, headers: r.headers, body: await r.json() }));
const valid = { studentId: "12-34567-890", email: "juan.delacruz@neu.edu.ph", password: "longenough1", fullName: "  Juan Dela Cruz  " };

test("creating an account sends the student to their NEU inbox", async () => {
  const r = await postRegister(on, valid);
  assert.deepEqual({ status: r.status, body: r.body }, { status: 201, body: { ok: true, message: "Account created. Open the confirmation link we sent to juan.delacruz@neu.edu.ph, then sign in with your student ID." } });
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.deepEqual(registrations, [{ studentId: "12-34567-890", email: "juan.delacruz@neu.edu.ph", password: "longenough1", fullName: "Juan Dela Cruz" }]);
});

test("account details are checked before anything is created", async () => {
  const bad = [
    [{ ...valid, studentId: "1234567890" }, "Enter your student ID, for example 12-34567-890."],
    [{ ...valid, email: "juan@gmail.com" }, "Use your NEU email address (ending in @neu.edu.ph)."],
    [{ ...valid, email: "juan@neu.edu.ph.evil.com" }, "Use your NEU email address (ending in @neu.edu.ph)."],
    [{ ...valid, password: "short" }, "Choose a password with at least 8 characters."],
    [{ ...valid, password: "x".repeat(73) }, "Choose a password with at least 8 characters."],
    [{ ...valid, fullName: "   " }, "Enter your full name."],
    [{ ...valid, fullName: "x".repeat(161) }, "Enter your full name."],
  ];
  for (const [body, message] of bad) {
    const r = await postRegister(on, body);
    assert.deepEqual({ status: r.status, body: r.body }, { status: 400, body: { error: { code: "INVALID_REQUEST", message } } }, JSON.stringify(body));
  }
  assert.equal(registrations.length, 0);
});

test("each registration outcome has a clear message", async () => {
  const cases = [
    ["id_taken", 409, "STUDENT_ID_TAKEN", "That student ID already has an account. If it's yours, use Forgot password on the sign-in page, or contact your faculty."],
    ["id_pending", 409, "STUDENT_ID_PENDING", "That student ID was just used for an account that isn't confirmed yet. Check your NEU email, or try again in an hour."],
    ["email_taken", 409, "EMAIL_TAKEN", "That NEU email already has an account. Sign in, or use Forgot password."],
    ["weak_password", 400, "WEAK_PASSWORD", "Choose a stronger password (at least 8 characters, not easy to guess)."],
    ["rate_limited", 429, "RATE_LIMITED", "Too many attempts. Please wait a while and try again."],
    ["unavailable", 503, "AUTH_UNAVAILABLE", "Could not reach the sign-in service. Try again."],
    ["disabled", 503, "REGISTRATION_UNAVAILABLE", "Creating an account isn't set up yet. Use Continue with Google with your @neu.edu.ph account."],
  ];
  for (const [reason, status, code, message] of cases) {
    registerOutcome = { ok: false, reason };
    const r = await postRegister(on, valid);
    assert.deepEqual({ status: r.status, body: r.body }, { status, body: { error: { code, message } } }, reason);
  }
});

test("without the service-role key, creating an account points to Continue with Google", async () => {
  const r = await postRegister(off, valid);
  assert.deepEqual({ status: r.status, body: r.body }, { status: 503, body: { error: { code: "REGISTRATION_UNAVAILABLE", message: "Creating an account isn't set up yet. Use Continue with Google with your @neu.edu.ph account." } } });
});

test("account creation is limited per device", async () => {
  const ip = "10.5.5.5";
  const statuses = [];
  for (let i = 0; i < 4; i++) statuses.push((await postRegister(on, valid, ip)).status);
  assert.deepEqual(statuses, [201, 201, 201, 429]);
});
