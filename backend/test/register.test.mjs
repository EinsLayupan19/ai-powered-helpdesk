// Creating an account with a student ID, against a local fake Supabase (Auth + PostgREST on 127.0.0.1).
// Uses the real installed @supabase/supabase-js. Supabase emails a confirmation link to the NEU address; the
// student ID is linked by the server with the service-role key (students cannot write it themselves).
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, beforeEach, test } from "node:test";
import { createStudentRegistration } from "../dist/services/auth/registration.js";

const ANON = "sb_publishable_register-test";
const SERVICE = "sb_secret_register-test";
const NEW_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const OLD_ID = "bbbbbbbb-0000-4000-8000-000000000002";
const good = { studentId: "12-34567-890", email: "juan.delacruz@neu.edu.ph", password: "longenough1", fullName: "Juan Dela Cruz" };

let requests, state;
const json = (res, status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const user = (id, email, confirmed, createdAt = "2026-10-16T00:00:00Z") => ({ id, aud: "authenticated", email, app_metadata: {}, user_metadata: {}, identities: [{ id, provider: "email" }], created_at: createdAt, email_confirmed_at: confirmed ? "2026-10-16T00:05:00Z" : null });
const server = createServer(async (req, res) => {
  let body = "";
  for await (const c of req) body += c;
  requests.push({ method: req.method, url: req.url, headers: req.headers, body });
  if (state.down) return res.destroy();
  const u = new URL(req.url, "http://x");
  if (req.method === "GET" && u.pathname === "/rest/v1/profiles") {
    const wanted = u.searchParams.get("student_number");
    return json(res, 200, state.holder && wanted === `eq.${good.studentId}` ? [{ id: state.holder.id }] : []);
  }
  if (req.method === "PATCH" && u.pathname === "/rest/v1/profiles") {
    if (state.linkConflict) return json(res, 409, { code: "23505", message: "duplicate key value violates unique constraint" });
    state.linked = { id: u.searchParams.get("id"), ...JSON.parse(body) };
    return json(res, 200, [{ id: u.searchParams.get("id").replace(/^eq\./, "") }]);
  }
  if (req.method === "GET" && state.holder && u.pathname === `/auth/v1/admin/users/${state.holder.id}`) return json(res, 200, state.holder);
  if (req.method === "DELETE" && u.pathname.startsWith("/auth/v1/admin/users/")) { state.deleted.push(u.pathname.split("/").pop()); return json(res, 200, {}); }
  if (req.method === "POST" && u.pathname === "/auth/v1/signup") {
    if (state.signupStatus === 429) return json(res, 429, { code: 429, error_code: "over_email_send_rate_limit", msg: "email rate limit exceeded" });
    if (state.signupStatus === 422) return json(res, 422, { code: 422, error_code: "signup_disabled", msg: "Signups not allowed for this instance" });
    const { email } = JSON.parse(body);
    if (state.emailTaken) return json(res, 200, { ...user(NEW_ID, email, false), identities: [] }); // Supabase hides existing emails this way
    return json(res, 200, user(NEW_ID, email, false));
  }
  json(res, 404, { message: "not found" });
});
let url;
before(async () => { await new Promise((r) => server.listen(0, "127.0.0.1", r)); url = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());
beforeEach(() => { requests = []; state = { holder: null, linked: null, deleted: [], emailTaken: false, signupStatus: 200, linkConflict: false, down: false }; });

const register = (opts = {}) => createStudentRegistration({ url, anonKey: ANON, serviceRoleKey: SERVICE, now: () => Date.parse("2026-10-16T12:00:00Z"), ...opts });

test("a new student ID creates the account, sends the confirmation email, and links the ID and name", async () => {
  assert.deepEqual(await register()(good), { ok: true });
  const signup = requests.find((r) => r.url.startsWith("/auth/v1/signup"));
  assert.equal(JSON.parse(signup.body).email, good.email);
  assert.equal(signup.headers.apikey, ANON, "sign-up uses the public key, like a normal sign-up");
  assert.deepEqual(state.linked, { id: `eq.${NEW_ID}`, student_number: good.studentId, full_name: good.fullName });
  const patch = requests.find((r) => r.method === "PATCH");
  assert.equal(patch.headers.apikey, SERVICE, "only the server can write the student ID");
});

test("an ID already linked to a confirmed account is refused, and no account is created", async () => {
  state.holder = user(OLD_ID, "someone@neu.edu.ph", true);
  assert.deepEqual(await register()(good), { ok: false, reason: "id_taken" });
  assert.equal(requests.filter((r) => r.url.startsWith("/auth/v1/signup")).length, 0);
});

test("an ID held by a recent unconfirmed sign-up is still refused (it may be the real owner, confirming now)", async () => {
  state.holder = user(OLD_ID, "someone@neu.edu.ph", false, "2026-10-16T11:30:00Z"); // 30 minutes old
  assert.deepEqual(await register()(good), { ok: false, reason: "id_pending" });
  assert.deepEqual(state.deleted, []);
});

test("an ID held by an unconfirmed sign-up older than an hour is released and registered", async () => {
  state.holder = user(OLD_ID, "someone@neu.edu.ph", false, "2026-10-16T10:00:00Z"); // 2 hours old
  assert.deepEqual(await register()(good), { ok: true });
  assert.deepEqual(state.deleted, [OLD_ID]);
  assert.equal(state.linked.student_number, good.studentId);
});

test("an email that already has an account is reported without creating anything", async () => {
  state.emailTaken = true;
  assert.deepEqual(await register()(good), { ok: false, reason: "email_taken" });
  assert.equal(state.linked, null);
});

test("if linking the ID fails (e.g. someone took it a moment ago), the new account is removed again", async () => {
  state.linkConflict = true;
  assert.deepEqual(await register()(good), { ok: false, reason: "id_taken" });
  assert.deepEqual(state.deleted, [NEW_ID]);
});

test("Supabase email limits and outages are reported as such", async () => {
  state.signupStatus = 429;
  assert.deepEqual(await register()(good), { ok: false, reason: "rate_limited" });
  state.signupStatus = 200;
  state.down = true;
  assert.deepEqual(await register({ timeoutMs: 1000 })(good), { ok: false, reason: "unavailable" });
});

test("sign-ups turned off in Supabase are reported as such, not as an outage", async () => {
  state.signupStatus = 422;
  assert.deepEqual(await register()(good), { ok: false, reason: "disabled" });
});
