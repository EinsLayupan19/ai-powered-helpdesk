// GeminiProvider with an injected fake client: retry on busy, real cancellation on timeout, token budget.
// No network: the fake stands in for the @google/genai client.
import assert from "node:assert/strict";
import { test } from "node:test";

const { GeminiProvider } = await import("../dist/services/ai/GeminiProvider.js");
const { config } = await import("../dist/config.js");

const busy = (status) => Object.assign(new Error("busy"), { name: "ApiError", status });

function fakeClient(steps) {
  const calls = [];
  return {
    calls,
    models: {
      generateContent: async (params) => {
        calls.push(params);
        const step = steps[Math.min(calls.length - 1, steps.length - 1)];
        return step(params);
      },
    },
  };
}

test("the default model is one that answered reliably in live checks", () => {
  if (!process.env.GEMINI_MODEL) assert.equal(config.geminiModel, "gemini-3.5-flash-lite");
});

test("returns the trimmed answer", async () => {
  const client = fakeClient([async () => ({ text: "  Restart the router.  " })]);
  const p = new GeminiProvider("k", "m", { client, retryDelayMs: 0 });
  assert.equal(await p.generateAnswer({ message: "wifi?" }), "Restart the router.");
});

test("leaves room for full answers (output budget above 512 tokens)", async () => {
  const client = fakeClient([async () => ({ text: "ok" })]);
  await new GeminiProvider("k", "m", { client, retryDelayMs: 0 }).generateAnswer({ message: "x" });
  assert.ok(client.calls[0].config.maxOutputTokens >= 1024);
});

test("retries once when Gemini is busy (503 or 500), then succeeds", async () => {
  for (const status of [503, 500]) {
    const client = fakeClient([async () => { throw busy(status); }, async () => ({ text: "Back." })]);
    const answer = await new GeminiProvider("k", "m", { client, retryDelayMs: 0 }).generateAnswer({ message: "x" });
    assert.equal(answer, "Back.");
    assert.equal(client.calls.length, 2);
  }
});

test("gives up after one retry and keeps the provider status for the route", async () => {
  const client = fakeClient([async () => { throw busy(503); }]);
  await assert.rejects(new GeminiProvider("k", "m", { client, retryDelayMs: 0 }).generateAnswer({ message: "x" }), (e) => e.status === 503);
  assert.equal(client.calls.length, 2);
});

test("does not retry errors that will not change (for example 400 or 429)", async () => {
  for (const status of [400, 429]) {
    const client = fakeClient([async () => { throw busy(status); }]);
    await assert.rejects(new GeminiProvider("k", "m", { client, retryDelayMs: 0 }).generateAnswer({ message: "x" }));
    assert.equal(client.calls.length, 1);
  }
});

test("a timeout aborts the underlying request and reports AI_TIMEOUT", async () => {
  let signal;
  const client = fakeClient([
    (params) => new Promise((_, reject) => {
      signal = params.config.abortSignal;
      signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    }),
  ]);
  const p = new GeminiProvider("k", "m", { client, retryDelayMs: 0, timeoutMs: 50 });
  await assert.rejects(p.generateAnswer({ message: "x" }), (e) => e.code === "AI_TIMEOUT");
  assert.ok(signal, "an abort signal was passed to the SDK");
  assert.equal(signal.aborted, true, "the SDK request was cancelled, not left running");
});

test("an empty answer is an error, not a blank reply", async () => {
  const client = fakeClient([async () => ({ text: "   " })]);
  await assert.rejects(new GeminiProvider("k", "m", { client, retryDelayMs: 0 }).generateAnswer({ message: "x" }), (e) => e.code === "AI_EMPTY_RESPONSE");
});
