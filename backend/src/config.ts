// Loads backend/.env when present (Node built-in; no extra dependency).
try { process.loadEnvFile(); } catch { /* no .env file; use the real environment */ }

export type KnowledgeSource = "local" | "supabase";

/** Unset or blank means "local". Anything other than "local" or "supabase" stops startup with a clear error. */
export function parseKnowledgeSource(value: string | undefined): KnowledgeSource {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized || normalized === "local") return "local";
  if (normalized === "supabase") return "supabase";
  throw new Error('Invalid KNOWLEDGE_SOURCE. Use "local" (default) or "supabase".');
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  // gemini-3.8-flash returned 503 "high demand" or timed out on every live check (2026-10-16); flash-lite answered in ~2.5s.
  geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
  knowledgeSource: parseKnowledgeSource(process.env.KNOWLEDGE_SOURCE),
};
