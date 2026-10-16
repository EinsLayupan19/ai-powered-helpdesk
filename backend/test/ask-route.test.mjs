// HTTP behavior of POST /api/ask through createApp(deps). The real requireAuth middleware talks to a local
// fake Supabase Auth server; knowledge and AI are injected fakes. Nothing leaves 127.0.0.1.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, beforeEach, test } from "node:test";

const GOOD_TOKEN = "good-student-token";
const USER = { id: "4f6b2c1e-8a3d-4b7e-9c21-5d0e7a9b3f10", aud: "authenticated", role: "authenticated", email: "student@neu.edu.ph", app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" };

// Fake Supabase Auth: GET /auth/v1/user accepts GOOD_TOKEN, plus valid sessions of accounts outside NEU.
const OUTSIDERS = {
  "gmail-token": { ...USER, id: "0b6c8f0e-1d2a-4c3b-9e8f-7a6b5c4d3e2f", email: "someone@gmail.com" },
  "lookalike-token": { ...USER, id: "1c7d9a1f-2e3b-4d4c-8f9a-8b7c6d5e4f3a", email: "x@neu.edu.ph.evil.com" },
  "no-email-token": { ...USER, id: "2d8eab20-3f4c-4e5d-9a0b-9c8d7e6f5a4b", email: undefined },
};
const TOKENS = { [GOOD_TOKEN]: USER, "upper-token": { ...USER, email: "Student@NEU.EDU.PH" }, ...OUTSIDERS };
const authServer = createServer((req, res) => {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1];
  const user = req.url?.startsWith("/auth/v1/user") ? TOKENS[token] : undefined;
  res.writeHead(user ? 200 : 401, { "content-type": "application/json" });
  res.end(JSON.stringify(user ?? { code: 401, error_code: "bad_jwt", msg: "invalid JWT" }));
});
await new Promise((resolve) => authServer.listen(0, "127.0.0.1", resolve));

// Must be set before the modules load (process.loadEnvFile never overrides variables that are already set).
process.env.SUPABASE_URL = `http://127.0.0.1:${authServer.address().port}`;
process.env.SUPABASE_ANON_KEY = "sb_publishable_route-test";
process.env.KNOWLEDGE_SOURCE = "local";

const { createApp } = await import("../dist/app.js");
const { requireAuth } = await import("../dist/middleware/auth.js");
const { LocalKnowledgeService, KnowledgeUnavailableError } = await import("../dist/services/knowledge/index.js");

const FALLBACK = "I don't have enough verified information to answer that accurately.";
const local = new LocalKnowledgeService();
const doc = { id: "student-id-replacement", title: "Lost Student ID", category: "Student ID", content: "Verified replacement steps.", source: "knowledge_entries/student-id-replacement" };

let searchImpl, searchCalls, aiCalls, aiEnabled;
const knowledgeService = {
  findSchedule: (query) => local.findSchedule(query),
  search: (query, context) => { searchCalls.push({ query, context }); return searchImpl(query, context); },
};
const ai = { generateAnswer: async (input) => { aiCalls.push(input); return "AI answer"; } };
const app = createApp({ frontendOrigin: "http://localhost:5173", requireAuth, knowledgeService, getAIService: () => (aiEnabled ? ai : null) });
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
after(() => { server.close(); authServer.close(); });

beforeEach(() => { searchImpl = async () => []; searchCalls = []; aiCalls = []; aiEnabled = true; });

async function ask(body, token = GOOD_TOKEN) {
  const headers = { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) };
  const response = await fetch(`${base}/api/ask`, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

test("authentication is still enforced by the real middleware", async () => {
  assert.equal((await ask({ message: "What is HTML?" }, null)).status, 401);
  const bad = await ask({ message: "What is HTML?" }, "forged-token");
  assert.deepEqual(bad, { status: 401, body: { error: { code: "UNAUTHENTICATED", message: "Your session is invalid or has expired." } } });
  assert.equal(searchCalls.length, 0);
});

test("the knowledge service receives the token that auth verified", async () => {
  await ask({ message: "I lost my student ID" });
  assert.equal(searchCalls.length, 1);
  assert.deepEqual(searchCalls[0], { query: "I lost my student ID", context: { accessToken: GOOD_TOKEN } });
});

test("schedule questions still use schedule matching and skip knowledge search and Gemini", async () => {
  const { status, body } = await ask({ message: "What is the schedule of 3BSIT-1?" });
  assert.equal(status, 200);
  assert.equal(body.answer, "Here is the schedule for 3BSIT-1.");
  assert.deepEqual(body.sources, [{ id: "schedule-3bsit-1", title: "3BSIT-1 Class Schedule", category: "Class Schedule" }]);
  assert.equal(body.schedule.entries.length, 6);
  assert.equal(searchCalls.length, 0);
  assert.equal(aiCalls.length, 0);
  const second = await ask({ message: "What is the schedule of 3BSIT-2?" });
  assert.equal(second.body.answer, "Here is the schedule for 3BSIT-2.");
  assert.deepEqual(second.body.sources, [{ id: "schedule-3bsit-2", title: "3BSIT-2 Class Schedule", category: "Class Schedule" }]);
  assert.ok(second.body.schedule.entries.every((e) => e.section === "3BSIT-2"));
});

test("a schedule question without a section asks for the section and points to Automate", async () => {
  const { status, body } = await ask({ message: "What is my class schedule?" });
  assert.equal(status, 200);
  assert.equal(body.answer, 'Which section are you in? I have the class schedules for 3BSIT-1 to 3BSIT-6, so ask for example "schedule for 3BSIT-1". You can check your class schedule through Automate while at school.');
  assert.deepEqual(body.sources, []);
  assert.equal(aiCalls.length, 0);
});

test("a section or course that is not in the knowledge base gets the exact fallback plus the Automate hint", async () => {
  const hint = `${FALLBACK} You can check your class schedule through Automate while at school.`;
  assert.deepEqual(await ask({ message: "What is the schedule of 3BSIT-7?" }), { status: 200, body: { answer: hint, sources: [] } });
  assert.deepEqual(await ask({ message: "What time is ITL999-18 for 3BSIT-1?" }), { status: 200, body: { answer: hint, sources: [] } });
  assert.equal(aiCalls.length, 0);
});

test("a single-course answer says when the source lists no room", async () => {
  const { body } = await ask({ message: "What time is ITL314-18 for 3BSIT-5?" });
  assert.equal(body.answer, "ITL314-18 — System Analysis and Design (Lab)\nWednesday\n10:00 AM – 1:00 PM\nRoom not listed in the source");
});

test("matched knowledge goes to Gemini as context and comes back as sources (contract unchanged)", async () => {
  searchImpl = async () => [{ document: doc, relevance: 2.5 }];
  const { status, body } = await ask({ message: "I lost my student ID", history: [{ role: "user", content: "Hi" }] });
  assert.equal(status, 200);
  assert.deepEqual(body, { answer: "AI answer", sources: [{ id: doc.id, title: doc.title, category: doc.category }] });
  assert.equal(aiCalls.length, 1);
  assert.deepEqual(aiCalls[0], { message: "I lost my student ID", history: [{ role: "user", content: "Hi" }], verifiedContext: [doc] });
});

test("no match on a school question returns the verified-information fallback without calling Gemini", async () => {
  assert.deepEqual(await ask({ message: "How can I get a replacement school ID?" }), { status: 200, body: { answer: FALLBACK, sources: [] } });
  assert.equal(aiCalls.length, 0);
});

test("no match on a general question still goes to Gemini without school context", async () => {
  const { status, body } = await ask({ message: "What is HTML?" });
  assert.deepEqual({ status, body }, { status: 200, body: { answer: "AI answer", sources: [] } });
  assert.deepEqual(aiCalls[0].verifiedContext, []);
});

const UNAVAILABLE = { error: { code: "KNOWLEDGE_UNAVAILABLE", message: "School information is temporarily unavailable. Please try again." } };

test("retrieval failure on a school question is a 503, not an empty answer", async () => {
  for (const reason of ["timeout", "network", "query_failed"]) {
    searchImpl = async () => { throw new KnowledgeUnavailableError(reason, reason === "query_failed" ? "42703" : undefined); };
    const result = await ask({ message: "How can I get a replacement school ID?" });
    assert.deepEqual(result, { status: 503, body: UNAVAILABLE }, reason);
  }
  assert.equal(aiCalls.length, 0);
});

test("retrieval failure on a general question still answers through Gemini without context", async () => {
  searchImpl = async () => { throw new KnowledgeUnavailableError("timeout"); };
  assert.deepEqual(await ask({ message: "What is HTML?" }), { status: 200, body: { answer: "AI answer", sources: [] } });
  assert.deepEqual(aiCalls[0].verifiedContext, []);
});

test("a knowledge-side authorization failure is a 401", async () => {
  searchImpl = async () => { throw new KnowledgeUnavailableError("unauthorized", "PGRST303"); };
  assert.deepEqual(await ask({ message: "What is HTML?" }), { status: 401, body: { error: { code: "UNAUTHENTICATED", message: "Your session is invalid or has expired." } } });
  assert.equal(aiCalls.length, 0);
});

test("unexpected knowledge errors are a generic 500 that leaks nothing", async () => {
  const originalError = console.error; const logged = [];
  console.error = (...args) => logged.push(args.join(" "));
  try {
    searchImpl = async () => { throw new Error('select secret_internal from knowledge_entries: column "secret_internal" does not exist'); };
    const result = await ask({ message: "I lost my student ID" });
    assert.deepEqual(result, { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred." } } });
  } finally { console.error = originalError; }
  assert.deepEqual(logged, ["[ask] unexpected knowledge service failure"]);
});

test("local mode answers school questions from the knowledge base and general ones without it", async () => {
  searchImpl = (query, context) => local.search(query, context);
  const id = await ask({ message: "How can I get a replacement school ID?" });
  assert.equal(id.status, 200);
  assert.equal(id.body.answer, "AI answer");
  assert.ok(id.body.sources.some((s) => s.id === "lost-student-id"), JSON.stringify(id.body.sources));
  assert.ok(aiCalls[0].verifiedContext.some((d) => d.id === "lost-student-id"));
  assert.deepEqual(await ask({ message: "What is HTML?" }), { status: 200, body: { answer: "AI answer", sources: [] } });
  const unknown = await ask({ message: "Who is the university president's secretary?" });
  assert.deepEqual(unknown, { status: 200, body: { answer: FALLBACK, sources: [] } });
});

test("AI not configured is still a 503 AI_NOT_CONFIGURED", async () => {
  aiEnabled = false;
  assert.deepEqual(await ask({ message: "What is HTML?" }), { status: 503, body: { error: { code: "AI_NOT_CONFIGURED", message: "The AI service is not configured on this server." } } });
});

test("request validation is unchanged", async () => {
  assert.deepEqual(await ask({ message: "   " }), { status: 400, body: { error: { code: "INVALID_REQUEST", message: "A non-empty message is required." } } });
  assert.deepEqual(await ask([1]), { status: 400, body: { error: { code: "INVALID_REQUEST", message: "Send a JSON object with a message." } } });
  assert.equal((await ask({ message: "x".repeat(4001) })).status, 400);
  assert.equal((await ask({ message: "Hi", history: [{ role: "system", content: "x" }] })).status, 400);
  assert.deepEqual(await ask("{bad json"), { status: 400, body: { error: { code: "INVALID_REQUEST", message: "Request body must be valid JSON." } } });
  assert.equal(searchCalls.length, 0);
});

test("health and unknown routes are unchanged", async () => {
  assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { ok: true });
  const missing = await fetch(`${base}/api/nope`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: { code: "NOT_FOUND", message: "Not found." } });
  const me = await fetch(`${base}/api/me`, { headers: { authorization: `Bearer ${GOOD_TOKEN}` } });
  assert.deepEqual(await me.json(), { id: USER.id, email: USER.email });
});

test("only New Era University accounts (@neu.edu.ph) can use the API", async () => {
  const NOT_NEU = { error: { code: "NOT_NEU_ACCOUNT", message: "Only New Era University accounts (@neu.edu.ph) can use EagleDesk." } };
  for (const token of Object.keys(OUTSIDERS)) {
    assert.deepEqual(await ask({ message: "What is HTML?" }, token), { status: 403, body: NOT_NEU }, token);
    const me = await fetch(`${base}/api/me`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(me.status, 403, token);
  }
  assert.equal(aiCalls.length, 0);
  assert.equal((await ask({ message: "What is HTML?" }, "upper-token")).status, 200, "the domain check ignores letter case");
});
