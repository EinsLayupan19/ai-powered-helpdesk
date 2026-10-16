import { config, type KnowledgeSource } from "../../config.js";
import type { KnowledgeService } from "./types.js";
import { LocalKnowledgeService } from "./LocalKnowledgeService.js";
import { SupabaseKnowledgeService } from "./SupabaseKnowledgeService.js";

export type KnowledgeSettings = { knowledgeSource: KnowledgeSource; supabaseUrl?: string; supabaseAnonKey?: string };

/** True for keys that must never be used here: new-style secret keys and legacy JWTs with role=service_role. */
export function isPrivilegedSupabaseKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;
  const payload = key.split(".")[1];
  if (!payload) return false;
  try {
    return (JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { role?: unknown }).role === "service_role";
  } catch {
    return false;
  }
}

/** Builds the configured knowledge service. Throws a clear startup error for unusable Supabase settings. */
export function createKnowledgeService(settings: KnowledgeSettings): KnowledgeService {
  if (settings.knowledgeSource === "local") return new LocalKnowledgeService();
  const url = settings.supabaseUrl?.trim(), anonKey = settings.supabaseAnonKey?.trim();
  if (!url || !anonKey) throw new Error("KNOWLEDGE_SOURCE=supabase requires SUPABASE_URL and SUPABASE_ANON_KEY.");
  if (isPrivilegedSupabaseKey(anonKey)) throw new Error("KNOWLEDGE_SOURCE=supabase must use the anon/publishable key, never a service-role or secret key.");
  return new SupabaseKnowledgeService({ url, anonKey });
}

let knowledgeService: KnowledgeService | null = null;

export function getKnowledgeService(): KnowledgeService {
  knowledgeService ??= createKnowledgeService(config);
  return knowledgeService;
}

export type { KnowledgeDocument, KnowledgeResult, KnowledgeService, ScheduleEntry, ScheduleMatch, SearchContext } from "./types.js";
export { LocalKnowledgeService, requiresVerifiedKnowledge } from "./LocalKnowledgeService.js";
export { KnowledgeUnavailableError, SupabaseKnowledgeService, classifyKnowledgeError, toKnowledgeEntry } from "./SupabaseKnowledgeService.js";
export { rankEntries } from "./ranking.js";
