// Student ID sign-in against a local fake Supabase (PostgREST + Auth on 127.0.0.1). Uses the real installed
// @supabase/supabase-js. The service-role key is only used to look the account up; the password only ever goes
// to the normal Auth sign-in endpoint.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, beforeEach, test } from "node:test";
import { STUDENT_ID_PATTERN, createStudentSignIn } from "../dist/services/auth/studentSignIn.js";
import { buildStudentSignIn } from "../dist/services/auth/index.js";

const ANON = "sb_publishable_student-test";
const SERVICE = "sb_secret_student-test";
const USER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const STUDENT_ID = "12-34567-890";
const EMAIL = "juan.delacruz@neu.edu.ph";
const PASSWORD = "correct horse battery staple";

let requests = [];
let behavior;
const json = (res, status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const server = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  requests.push({ method: req.method, url: req.url, headers: req.headers, body });
  if (behavior.down) { res.destroy(); return; }
  if (req.url.startsWith("/rest/v1/profiles")) {
    const wanted = new URL(req.url, "http://x").searchParams.get("student_number");
    return json(res, 200, wanted === `eq.${STUDENT_ID}` && behavior.registered ? [{ id: USER_ID }] : []);
  }
  if (req.url === `/auth/v1/admin/users/${USER_ID}`) return json(res, 200, { id: USER_ID, aud: "authenticated", email: EMAIL, app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" });
  if (req.url.startsWith("/auth/v1/token?grant_type=password")) {
    if (behavior.tokenStatus === 429) return json(res, 429, { code: 429, error_code: "over_request_rate_limit", msg: "Request rate limit reached" });
    const { email, password } = JSON.parse(body);
    if (email === EMAIL && password === PASSWORD) {
      return json(res, 200, { access_token: "access.jwt", refresh_token: "refresh-token", expires_in: 3600, expires_at: 9999999999, token_type: "bearer", user: { id: USER_ID, aud: "authenticated", email: EMAIL, app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" } });
    }
    return json(res, 400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
  }
  json(res, 404, { message: "not found" });
});
let url;
before(async () => { await new Promise((r) => server.listen(0, "127.0.0.1", r)); url = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());
beforeEach(() => { requests = []; behavior = { registered: true, down: false, tokenStatus: 200 }; });

const signIn = (options = {}) => createStudentSignIn({ url, anonKey: ANON, serviceRoleKey: SERVICE, minDurationMs: 0, ...options });

test("the student ID format is two digits, five digits, three digits (e.g. 12-34567-890)", () => {
  for (const ok of ["12-34567-890", "00-00000-000"]) assert.ok(STUDENT_ID_PATTERN.test(ok), ok);
  for (const bad of ["1234567890", "12-3456-7890", "12-34567-89", "ab-cdefg-hij", " 12-34567-890", "12-34567-890x"]) assert.ok(!STUDENT_ID_PATTERN.test(bad), bad);
});

test("a registered student ID with the right password returns a session", async () => {
  const result = await signIn()(STUDENT_ID, PASSWORD);
  assert.deepEqual(result, { ok: true, session: { access_token: "access.jwt", refresh_token: "refresh-token", expires_in: 3600, token_type: "bearer" } });
});

test("the service-role key is only used for the lookup, and the password only goes to the sign-in endpoint", async () => {
  await signIn()(STUDENT_ID, PASSWORD);
  const lookup = requests.filter((r) => r.url.startsWith("/rest/v1/profiles") || r.url.startsWith("/auth/v1/admin/"));
  const token = requests.filter((r) => r.url.startsWith("/auth/v1/token"));
  assert.equal(lookup.length, 2);
  for (const r of lookup) {
    assert.equal(r.headers.apikey, SERVICE);
    assert.ok(!r.body.includes(PASSWORD) && !r.url.includes(encodeURIComponent(PASSWORD)));
  }
  assert.equal(token.length, 1);
  assert.equal(token[0].headers.apikey, ANON);
  assert.ok(!JSON.stringify(token[0].headers).includes(SERVICE));
});

test("an unknown student ID and a wrong password give the same answer", async () => {
  behavior.registered = false;
  const unknown = await signIn()(STUDENT_ID, PASSWORD);
  behavior.registered = true;
  const wrong = await signIn()(STUDENT_ID, "wrong password");
  assert.deepEqual(unknown, { ok: false, reason: "invalid" });
  assert.deepEqual(wrong, { ok: false, reason: "invalid" });
});

test("an unknown ID never reaches the sign-in endpoint and leaks no email", async () => {
  behavior.registered = false;
  const result = await signIn()(STUDENT_ID, PASSWORD);
  assert.ok(!JSON.stringify(result).includes("@"));
  assert.equal(requests.filter((r) => r.url.startsWith("/auth/v1/token")).length, 0);
});

test("both failure paths take at least the minimum time, so timing does not reveal which IDs exist", async () => {
  for (const registered of [false, true]) {
    behavior.registered = registered;
    const t = Date.now();
    await signIn({ minDurationMs: 250 })(STUDENT_ID, "wrong password");
    assert.ok(Date.now() - t >= 245, `registered=${registered}`);
  }
});

test("Supabase rate limiting and outages are reported as such, not as wrong credentials", async () => {
  behavior.tokenStatus = 429;
  assert.deepEqual(await signIn()(STUDENT_ID, PASSWORD), { ok: false, reason: "rate_limited" });
  behavior.tokenStatus = 200;
  behavior.down = true;
  assert.deepEqual(await signIn({ timeoutMs: 1000 })(STUDENT_ID, PASSWORD), { ok: false, reason: "unavailable" });
});


test("student ID sign-in is only switched on with a real service-role key", () => {
  const base = { supabaseUrl: "https://x.supabase.co", supabaseAnonKey: ANON };
  assert.equal(buildStudentSignIn({ ...base, supabaseServiceRoleKey: undefined }).signIn, null);
  assert.equal(buildStudentSignIn({ ...base, supabaseServiceRoleKey: "   " }).signIn, null);
  const publicKey = buildStudentSignIn({ ...base, supabaseServiceRoleKey: ANON });
  assert.equal(publicKey.signIn, null);
  assert.match(publicKey.warning, /not a service-role key/);
  assert.equal(buildStudentSignIn({ supabaseUrl: undefined, supabaseAnonKey: ANON, supabaseServiceRoleKey: SERVICE }).signIn, null);
  const on = buildStudentSignIn({ ...base, supabaseServiceRoleKey: SERVICE });
  assert.equal(typeof on.signIn, "function");
  assert.equal(on.warning, null);
  assert.ok(!JSON.stringify(publicKey.warning).includes(ANON), "the warning never prints the key");
});
