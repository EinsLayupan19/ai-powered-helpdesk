import { createClient } from "@supabase/supabase-js";

export type RegistrationInput = { studentId: string; email: string; password: string; fullName: string };
export type RegistrationFailure = "id_taken" | "id_pending" | "email_taken" | "weak_password" | "rate_limited" | "disabled" | "unavailable";
export type RegistrationResult = { ok: true } | { ok: false; reason: RegistrationFailure };
export type StudentRegistration = (input: RegistrationInput) => Promise<RegistrationResult>;

export type RegistrationOptions = {
  url: string;
  anonKey: string;
  /** Used to check and write profiles.student_number, which students cannot write themselves. Backend only. */
  serviceRoleKey: string;
  timeoutMs?: number;
  /** An unconfirmed sign-up holding a student ID longer than this is released, so a fake sign-up cannot block the owner. */
  pendingReleaseMs?: number;
  now?: () => number;
};

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/**
 * Creates an account for a student ID. Supabase sends a confirmation link to the @neu.edu.ph address, so only
 * someone who can open that inbox can use the account; the server then links the student ID to it.
 * Each student ID belongs to one account. A student ID itself cannot be checked against NEU records here.
 */
export function createStudentRegistration({ url, anonKey, serviceRoleKey, timeoutMs = 8000, pendingReleaseMs = 60 * 60_000, now = Date.now }: RegistrationOptions): StudentRegistration {
  const timedFetch: typeof fetch = (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const admin = createClient(url, serviceRoleKey, { ...noSession, global: { fetch: timedFetch } });

  async function holderOf(studentId: string): Promise<"free" | "taken" | "pending" | "unavailable"> {
    const { data: profile, error } = await admin.from("profiles").select("id").eq("student_number", studentId).retry(false).maybeSingle<{ id: string }>();
    if (error) return "unavailable";
    if (!profile?.id) return "free";
    const { data, error: userError } = await admin.auth.admin.getUserById(profile.id);
    if (userError) return userError.status === 404 ? "free" : "unavailable";
    const holder = data.user;
    if (holder.email_confirmed_at || holder.confirmed_at) return "taken";
    if (now() - Date.parse(holder.created_at) < pendingReleaseMs) return "pending";
    // Never confirmed and older than the confirmation window: release the ID.
    const { error: deleteError } = await admin.auth.admin.deleteUser(holder.id);
    return deleteError ? "unavailable" : "free";
  }

  return async ({ studentId, email, password, fullName }) => {
    try {
      const holder = await holderOf(studentId);
      if (holder === "taken") return { ok: false, reason: "id_taken" };
      if (holder === "pending") return { ok: false, reason: "id_pending" };
      if (holder === "unavailable") return { ok: false, reason: "unavailable" };

      const anon = createClient(url, anonKey, { ...noSession, global: { fetch: timedFetch } });
      // No emailRedirectTo: the confirmation link returns to the project's Site URL (the deployed address, see README).
      const { data, error } = await anon.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
      if (error) {
        if (error.status === 429) return { ok: false, reason: "rate_limited" };
        if (error.code === "weak_password") return { ok: false, reason: "weak_password" };
        if (error.code === "signup_disabled") return { ok: false, reason: "disabled" }; // "Allow new users to sign up" is off
        if (error.code === "user_already_exists" || error.code === "email_exists") return { ok: false, reason: "email_taken" };
        return { ok: false, reason: "unavailable" };
      }
      const created = data.user;
      if (!created) return { ok: false, reason: "unavailable" };
      // Supabase answers an existing email with a user that has no identities (it does not say so outright).
      if (!created.identities?.length) return { ok: false, reason: "email_taken" };

      const { data: linked, error: linkError } = await admin
        .from("profiles")
        .update({ student_number: studentId, full_name: fullName })
        .eq("id", created.id)
        .select("id");
      if (linkError || !linked?.length) {
        // Keep things consistent: an account without its student ID would be unusable, so remove it.
        await admin.auth.admin.deleteUser(created.id);
        return { ok: false, reason: linkError?.code === "23505" ? "id_taken" : "unavailable" };
      }
      return { ok: true };
    } catch {
      return { ok: false, reason: "unavailable" };
    }
  };
}
