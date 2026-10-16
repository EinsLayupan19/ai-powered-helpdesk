import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isNeuEmail } from "./neu.js";

/** NEU student ID, e.g. 12-34567-890 (matches profiles.student_number exactly). */
export const STUDENT_ID_PATTERN = /^\d{2}-\d{5}-\d{3}$/;

export type StudentSession = { access_token: string; refresh_token: string; expires_in: number; token_type: string };
export type StudentSignInResult = { ok: true; session: StudentSession } | { ok: false; reason: "invalid" | "rate_limited" | "unavailable" };
export type StudentSignIn = (studentId: string, password: string) => Promise<StudentSignInResult>;
export type StudentResetResult = { ok: true } | { ok: false; reason: "rate_limited" | "unavailable" };
export type StudentPasswordReset = (studentId: string) => Promise<StudentResetResult>;

export type StudentAuthOptions = {
  url: string;
  anonKey: string;
  /** Used only to find the account for a student ID. Backend only; never sent to the browser. */
  serviceRoleKey: string;
  /** Every attempt takes at least this long, so response time does not reveal which student IDs exist. */
  minDurationMs?: number;
  timeoutMs?: number;
};

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

function clients({ url, anonKey, serviceRoleKey, timeoutMs = 8000 }: StudentAuthOptions) {
  const timedFetch: typeof fetch = (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  return {
    lookup: createClient(url, serviceRoleKey, { ...noSession, global: { fetch: timedFetch } }),
    // A fresh anon client per attempt: no session is kept on the server.
    anon: () => createClient(url, anonKey, { ...noSession, global: { fetch: timedFetch } }),
  };
}

/** The account email for a student ID, if it exists and is an @neu.edu.ph account. */
async function emailFor(lookup: SupabaseClient, studentId: string): Promise<{ email: string } | "none" | "unavailable"> {
  const { data: profile, error } = await lookup
    .from("profiles")
    .select("id")
    .eq("student_number", studentId)
    .retry(false) // a single attempt: sign-in and reset should fail fast, not hang through retries
    .maybeSingle<{ id: string }>();
  if (error) return "unavailable";
  if (!profile?.id) return "none";
  const { data, error: userError } = await lookup.auth.admin.getUserById(profile.id);
  if (userError) return userError.status === 404 ? "none" : "unavailable";
  const email = data.user?.email;
  return email && isNeuEmail(email) ? { email } : "none";
}

/** Runs fn, never throws, and takes at least minDurationMs. */
async function padded<T>(minDurationMs: number, fallback: T, fn: () => Promise<T>): Promise<T> {
  const started = Date.now();
  let result: T;
  try {
    result = await fn();
  } catch {
    result = fallback;
  }
  const wait = minDurationMs - (Date.now() - started);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  return result;
}

/**
 * Signs a student in with their student ID and password. The ID is looked up in profiles.student_number with
 * the service-role key; the password is checked by Supabase Auth's normal password sign-in. The caller only
 * ever learns "signed in" or a generic failure: never whether an ID exists, and never the account's email.
 */
export function createStudentSignIn(options: StudentAuthOptions): StudentSignIn {
  const { lookup, anon } = clients(options);
  const minDurationMs = options.minDurationMs ?? 700;
  return (studentId, password) =>
    padded<StudentSignInResult>(minDurationMs, { ok: false, reason: "unavailable" }, async () => {
      const found = await emailFor(lookup, studentId);
      if (found === "unavailable") return { ok: false, reason: "unavailable" };
      if (found === "none") return { ok: false, reason: "invalid" };
      const { data, error } = await anon().auth.signInWithPassword({ email: found.email, password });
      if (error) {
        if (error.status === 429) return { ok: false, reason: "rate_limited" };
        if (error.status === 400 || error.status === 401 || error.status === 422) return { ok: false, reason: "invalid" };
        return { ok: false, reason: "unavailable" };
      }
      const s = data.session;
      if (!s) return { ok: false, reason: "invalid" };
      return { ok: true, session: { access_token: s.access_token, refresh_token: s.refresh_token, expires_in: s.expires_in, token_type: s.token_type } };
    });
}

/**
 * Sends a password reset link to the university email of a student ID's account. Unknown IDs and non-NEU accounts
 * get the same { ok: true } (and nothing is sent), so the answer never reveals which IDs exist.
 */
export function createStudentPasswordReset(options: StudentAuthOptions): StudentPasswordReset {
  const { lookup, anon } = clients(options);
  const minDurationMs = options.minDurationMs ?? 700;
  return (studentId) =>
    padded<StudentResetResult>(minDurationMs, { ok: false, reason: "unavailable" }, async () => {
      const found = await emailFor(lookup, studentId);
      if (found === "unavailable") return { ok: false, reason: "unavailable" };
      if (found === "none") return { ok: true };
      // No redirectTo: Supabase uses the project's Site URL (set to the deployed address, see README).
      const { error } = await anon().auth.resetPasswordForEmail(found.email);
      if (!error) return { ok: true };
      return error.status === 429 ? { ok: false, reason: "rate_limited" } : { ok: false, reason: "unavailable" };
    });
}
