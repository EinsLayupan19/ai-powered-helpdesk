// KNOWLEDGE_SOURCE parsing, service selection, the service-role guard, and real startup behavior.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import test from "node:test";

process.env.KNOWLEDGE_SOURCE = "local"; // deterministic import regardless of a developer's .env
const { parseKnowledgeSource } = await import("../dist/config.js");
const { createKnowledgeService, isPrivilegedSupabaseKey, LocalKnowledgeService, SupabaseKnowledgeService } = await import("../dist/services/knowledge/index.js");

const jwt = (payload) => ["e30", Buffer.from(JSON.stringify(payload)).toString("base64url"), "sig"].join(".");
const backendDir = fileURLToPath(new URL("..", import.meta.url));

test("KNOWLEDGE_SOURCE defaults to local and accepts only local or supabase", () => {
  assert.equal(parseKnowledgeSource(undefined), "local");
  assert.equal(parseKnowledgeSource(""), "local");
  assert.equal(parseKnowledgeSource("  "), "local");
  assert.equal(parseKnowledgeSource("local"), "local");
  assert.equal(parseKnowledgeSource(" Supabase "), "supabase");
  for (const bad of ["postgres", "supabse", "true", "remote"]) assert.throws(() => parseKnowledgeSource(bad), /Invalid KNOWLEDGE_SOURCE/);
});

test("local mode builds the local service; supabase mode builds the Supabase service", () => {
  assert.ok(createKnowledgeService({ knowledgeSource: "local" }) instanceof LocalKnowledgeService);
  const svc = createKnowledgeService({ knowledgeSource: "supabase", supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "sb_publishable_abc" });
  assert.ok(svc instanceof SupabaseKnowledgeService);
  assert.ok(createKnowledgeService({ knowledgeSource: "supabase", supabaseUrl: "https://example.supabase.co", supabaseAnonKey: jwt({ role: "anon" }) }) instanceof SupabaseKnowledgeService);
});

test("supabase mode fails clearly without URL or key", () => {
  assert.throws(() => createKnowledgeService({ knowledgeSource: "supabase" }), /requires SUPABASE_URL and SUPABASE_ANON_KEY/);
  assert.throws(() => createKnowledgeService({ knowledgeSource: "supabase", supabaseUrl: "https://x.supabase.co", supabaseAnonKey: "  " }), /requires SUPABASE_URL/);
});

test("supabase mode refuses service-role and secret keys, without echoing them", () => {
  for (const key of ["sb_secret_SHOULD_NOT_APPEAR", jwt({ role: "service_role", ref: "SHOULD_NOT_APPEAR" })]) {
    assert.equal(isPrivilegedSupabaseKey(key), true);
    assert.throws(
      () => createKnowledgeService({ knowledgeSource: "supabase", supabaseUrl: "https://x.supabase.co", supabaseAnonKey: key }),
      (error) => /never a service-role or secret key/.test(error.message) && !error.message.includes("SHOULD_NOT_APPEAR"),
    );
  }
  for (const key of ["sb_publishable_abc", jwt({ role: "anon" }), "not-a-jwt", "a.%%%.c"]) assert.equal(isPrivilegedSupabaseKey(key), false, key);
});

async function freePort() {
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}
// Runs the production entry point with a controlled environment (local-only URLs, no AI key).
function runServer(env, { waitFor, timeoutMs = 8000 }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["dist/server.js"], {
      cwd: backendDir,
      env: { ...process.env, SUPABASE_URL: "http://127.0.0.1:9", SUPABASE_ANON_KEY: "sb_publishable_startup-test", GEMINI_API_KEY: "", ...env },
    });
    let output = "";
    const finish = (result) => { clearTimeout(timer); child.kill(); resolve({ ...result, output }); };
    const timer = setTimeout(() => finish({ timedOut: true }), timeoutMs);
    const onData = (chunk) => { output += chunk; if (waitFor && output.includes(waitFor)) finish({ started: true }); };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => finish({ exitCode: code }));
  });
}

test("production startup is unchanged in local mode", async () => {
  const port = await freePort();
  const result = await runServer({ KNOWLEDGE_SOURCE: "local", PORT: String(port) }, { waitFor: `EagleDesk API listening on :${port}` });
  assert.equal(result.started, true, result.output);
});

test("an invalid KNOWLEDGE_SOURCE stops startup with a clear error", async () => {
  const result = await runServer({ KNOWLEDGE_SOURCE: "supabse", PORT: String(await freePort()) }, {});
  assert.notEqual(result.exitCode, 0);
  assert.match(result.output, /Invalid KNOWLEDGE_SOURCE/);
  assert.doesNotMatch(result.output, /listening/);
});

test("supabase mode with a secret key stops startup before listening", async () => {
  const result = await runServer({ KNOWLEDGE_SOURCE: "supabase", SUPABASE_ANON_KEY: "sb_secret_SHOULD_NOT_APPEAR", PORT: String(await freePort()) }, {});
  assert.notEqual(result.exitCode, 0);
  assert.match(result.output, /never a service-role or secret key/);
  assert.doesNotMatch(result.output, /SHOULD_NOT_APPEAR|listening/);
});
