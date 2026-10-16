import { createClient } from "@supabase/supabase-js";

/** NEU student ID, e.g. 12-34567-890 (matches profiles.student_number exactly). */
export const STUDENT_ID_PATTERN = /^\d{2}-\d{5}-\d{3}$/;

export type StudentSession = { access_token: string; refresh_token: string; expires_in: number; token_type: string };
export type StudentSignInResult = { ok: true; session: StudentSession } | { ok: false; reason: "invalid" | "rate_limited" | "unavailable" };
export type StudentSignIn = (studentId: string, password: string) => Promise<StudentSignInResult>;

export type StudentSignInOptions = {
  url: string;
  anonKey: string;
  /** Used only to find the account for a student ID. Backend only; never sent to the browser. */
  serviceRoleKey: string;
  /** Every attempt takes at least this long, so response time does not reveal which student IDs exist. */
  minDurationMs?: number;
  timeoutMs?: number;
};

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/**
 * Signs a student in with their student ID and password. The ID is looked up in profiles.student_number with
 * the service-role key; the password is checked by Supabase Auth's normal password sign-in. The caller only
 * ever learns "signed in" or a generic failure: never whether an ID exists, and never the account's email.
 */
export function createStudentSignIn({ url, anonKey, serviceRoleKey, minDurationMs = 700, timeoutMs = 8000 }: StudentSignInOptions): StudentSignIn {
  const timedFetch: typeof fetch = (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const lookup = createClient(url, serviceRoleKey, { ...noSession, global: { fetch: timedFetch } });

  async function attempt(studentId: string, password: string): Promise<StudentSignInResult> {
    const { data: profile, error: profileError } = await lookup
      .from("profiles")
      .select("id")
      .eq("student_number", studentId)
      .retry(false) // a single attempt: a sign-in should fail fast, not hang through retries
      .maybeSingle<{ id: string }>();
    if (profileError) return { ok: false, reason: "unavailable" };
    if (!profile?.id) return { ok: false, reason: "invalid" };

    const { data: found, error: userError } = await lookup.auth.admin.getUserById(profile.id);
    if (userError) return { ok: false, reason: userError.status === 404 ? "invalid" : "unavailable" };
    const email = found.user?.email;
    if (!email) return { ok: false, reason: "invalid" };

    // A fresh client per attempt: no session is kept on the server.
    const auth = createClient(url, anonKey, { ...noSession, global: { fetch: timedFetch } });
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.status === 429) return { ok: false, reason: "rate_limited" };
      if (error.status === 400 || error.status === 401 || error.status === 422) return { ok: false, reason: "invalid" };
      return { ok: false, reason: "unavailable" };
    }
    const s = data.session;
    if (!s) return { ok: false, reason: "invalid" };
    return { ok: true, session: { access_token: s.access_token, refresh_token: s.refresh_token, expires_in: s.expires_in, token_type: s.token_type } };
  }

  return async (studentId, password) => {
    const started = Date.now();
    let result: StudentSignInResult;
    try {
      result = await attempt(studentId, password);
    } catch {
      result = { ok: false, reason: "unavailable" };
    }
    const wait = minDurationMs - (Date.now() - started);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    return result;
  };
}
