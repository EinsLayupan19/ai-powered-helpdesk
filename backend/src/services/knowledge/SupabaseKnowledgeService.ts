import { createClient } from "@supabase/supabase-js";
import { LocalKnowledgeService } from "./LocalKnowledgeService.js";
import { rankEntries } from "./ranking.js";
import type { KnowledgeDocument, KnowledgeResult, KnowledgeService, ScheduleMatch, SearchContext } from "./types.js";

/** The only columns granted to authenticated users (see the knowledge_entries migration). Never select "*". */
export const KNOWLEDGE_COLUMNS = "id,slug,title,category,content,keywords,applies_to,source_url,verification_status,last_verified_at";
export const KNOWLEDGE_ROW_LIMIT = 200;
export const KNOWLEDGE_TIMEOUT_MS = 4000;

export type KnowledgeFailureReason = "timeout" | "network" | "query_failed" | "unauthorized";

/** Retrieval failed (as opposed to succeeding with no matches). Carries no SQL text, details, or stack from the database. */
export class KnowledgeUnavailableError extends Error {
  readonly reason: KnowledgeFailureReason;
  readonly code?: string;

  constructor(reason: KnowledgeFailureReason, code?: string) {
    super("Knowledge retrieval is unavailable.");
    this.name = "KnowledgeUnavailableError";
    this.reason = reason;
    this.code = code;
  }
}

/** A verified, well-formed knowledge_entries row. */
export type KnowledgeEntry = {
  id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  keywords: string[];
  appliesTo: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: string;
};

// Postgres SQLSTATE (e.g. 42703) or PostgREST code (e.g. PGRST205). Anything else is dropped, never logged.
const SAFE_CODE = /^[A-Z0-9]{2,10}$/;
const AUTH_CODES = new Set(["PGRST301", "PGRST302", "PGRST303"]);

export function classifyKnowledgeError(error: unknown, status: number): KnowledgeUnavailableError {
  const failure = (typeof error === "object" && error !== null ? error : {}) as { name?: unknown; message?: unknown; code?: unknown };
  const name = typeof failure.name === "string" ? failure.name : "";
  const message = typeof failure.message === "string" ? failure.message : "";
  const code = typeof failure.code === "string" && SAFE_CODE.test(failure.code) ? failure.code : undefined;
  if (name === "AbortError" || name === "TimeoutError" || /^(AbortError|TimeoutError)\b/.test(message)) return new KnowledgeUnavailableError("timeout");
  if (status === 401 || (code !== undefined && AUTH_CODES.has(code))) return new KnowledgeUnavailableError("unauthorized", code);
  if (!status) return new KnowledgeUnavailableError("network");
  return new KnowledgeUnavailableError("query_failed", code);
}

const hasText = (value: unknown, max: number): value is string => typeof value === "string" && /\S/.test(value) && value.length <= max;

/** Returns the entry only when the row is verified and matches the table's constraints; otherwise null. */
export function toKnowledgeEntry(row: unknown): KnowledgeEntry | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const r = row as Record<string, unknown>;
  if (r.verification_status !== "verified") return null;
  if (typeof r.id !== "string" || !r.id || typeof r.slug !== "string" || r.slug.length > 80 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug)) return null;
  if (!hasText(r.title, 240) || !hasText(r.category, 120) || !hasText(r.content, 12000)) return null;
  if (!Array.isArray(r.keywords) || r.keywords.length > 40 || !r.keywords.every((keyword) => hasText(keyword, 1200))) return null;
  if (r.applies_to != null && !hasText(r.applies_to, 240)) return null;
  if (r.source_url != null && !(typeof r.source_url === "string" && r.source_url.length <= 2000 && /^https:\/\/\S+$/.test(r.source_url))) return null;
  if (typeof r.last_verified_at !== "string" || Number.isNaN(Date.parse(r.last_verified_at))) return null;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    category: r.category,
    content: r.content,
    keywords: r.keywords as string[],
    appliesTo: (r.applies_to as string | null | undefined) ?? null,
    sourceUrl: (r.source_url as string | null | undefined) ?? null,
    lastVerifiedAt: r.last_verified_at,
  };
}

/** Gemini sees title, category, and content; the scope is appended only when the entry states one. */
function toDocument(entry: KnowledgeEntry): KnowledgeDocument {
  return {
    id: entry.slug,
    title: entry.title,
    category: entry.category,
    content: entry.appliesTo ? `${entry.content}\n\nApplies to: ${entry.appliesTo}` : entry.content,
    source: entry.sourceUrl ?? `knowledge_entries/${entry.slug}`,
  };
}

export type SupabaseKnowledgeOptions = {
  url: string;
  /** The anon/publishable key. Never a service-role or secret key. */
  anonKey: string;
  timeoutMs?: number;
  schedule?: Pick<KnowledgeService, "findSchedule">;
  log?: (line: string) => void;
};

/**
 * Reads verified knowledge_entries as the signed-in student (their JWT, so RLS applies) and ranks them.
 * Schedule lookups stay with the local 3BSIT-1 matcher.
 */
export class SupabaseKnowledgeService implements KnowledgeService {
  private readonly schedule: Pick<KnowledgeService, "findSchedule">;
  private readonly log: (line: string) => void;

  constructor(private readonly options: SupabaseKnowledgeOptions) {
    this.schedule = options.schedule ?? new LocalKnowledgeService();
    this.log = options.log ?? ((line) => console.warn(line));
  }

  findSchedule(query: string): Promise<ScheduleMatch | null> {
    return this.schedule.findSchedule(query);
  }

  async search(query: string, context: SearchContext = {}): Promise<KnowledgeResult[]> {
    const entries = await this.fetchVerifiedEntries(context.accessToken);
    return rankEntries(query, entries).map(({ entry, score }) => ({ document: toDocument(entry), relevance: score }));
  }

  async fetchVerifiedEntries(accessToken: string | undefined): Promise<KnowledgeEntry[]> {
    if (!accessToken) throw this.fail(new KnowledgeUnavailableError("unauthorized"));
    const client = createClient(this.options.url, this.options.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    let result: { data: unknown; error: unknown; status: number };
    try {
      result = await client
        .from("knowledge_entries")
        .select(KNOWLEDGE_COLUMNS)
        .eq("verification_status", "verified")
        .order("slug")
        .limit(KNOWLEDGE_ROW_LIMIT)
        .retry(false) // a single attempt; the abort signal bounds the whole call
        .abortSignal(AbortSignal.timeout(this.options.timeoutMs ?? KNOWLEDGE_TIMEOUT_MS));
    } catch (error: unknown) {
      throw this.fail(classifyKnowledgeError(error, 0));
    }
    if (result.error) throw this.fail(classifyKnowledgeError(result.error, result.status));
    if (!Array.isArray(result.data)) throw this.fail(new KnowledgeUnavailableError("query_failed"));

    const rows: unknown[] = result.data;
    if (rows.length >= KNOWLEDGE_ROW_LIMIT) this.log(`[knowledge] row limit reached (${KNOWLEDGE_ROW_LIMIT}); some verified entries were not considered`);
    const entries = rows.flatMap((row) => { const entry = toKnowledgeEntry(row); return entry ? [entry] : []; });
    if (entries.length < rows.length) this.log(`[knowledge] ignored ${rows.length - entries.length} unverified or malformed row(s)`);
    return entries;
  }

  private fail(error: KnowledgeUnavailableError): KnowledgeUnavailableError {
    this.log(`[knowledge] unavailable reason=${error.reason}${error.code ? ` code=${error.code}` : ""}`);
    return error;
  }
}
