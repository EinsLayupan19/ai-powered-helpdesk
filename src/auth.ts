import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { authConfigured, supabase } from "./lib/supabase";
import { NEU_EMAIL_DOMAIN, NOT_NEU_MESSAGE, isNeuEmail } from "./lib/neu";

const NOT_CONFIGURED = "Sign-in is not configured for this deployment.";

function friendly(error: unknown): string {
  const authError = error as { message?: unknown; status?: unknown; name?: unknown } | null;
  const message = typeof authError?.message === "string" ? authError.message.trim() : "";
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Incorrect student ID or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email before signing in.";
  if (authError?.status === 429 || m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a moment and try again.";
  if (authError?.status === 0 || authError?.name === "AuthRetryableFetchError" || m.includes("fetch")) return "Can't reach the sign-in service. Check your connection and try again.";
  // Keep Supabase's diagnostic message visible instead of hiding unknown auth failures.
  return message || (error instanceof Error ? error.message : "Authentication failed. Please try again.");
}

/** An error Supabase or Google sent back in the URL after "Continue with Google" (then removed from the URL). */
function takeRedirectError(): string | null {
  const params = new URLSearchParams(window.location.search);
  new URLSearchParams(window.location.hash.replace(/^#/, "")).forEach((value, key) => { if (!params.has(key)) params.set(key, value); });
  const description = params.get("error_description") ?? params.get("error");
  if (!description) return null;
  window.history.replaceState(null, "", window.location.pathname);
  return `Google sign-in did not finish: ${description.replace(/\+/g, " ")}`;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(authConfigured);
  const [recovery, setRecovery] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let live = true;
    const redirectError = takeRedirectError();
    if (redirectError) setSessionError(redirectError);

    // Only @neu.edu.ph accounts may stay signed in (Google can offer any account; the hd hint is not a guarantee).
    const rejectOutsider = () => {
      setSession(null);
      setSessionError(NOT_NEU_MESSAGE);
      // Deferred: calling Supabase from inside onAuthStateChange can deadlock.
      setTimeout(() => { void client.auth.signOut({ scope: "local" }); }, 0);
    };

    // Restores a persisted session on refresh (refreshing the token first if it has expired).
    client.auth.getSession()
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setSessionError(friendly(error));
        else if (data.session && !isNeuEmail(data.session.user.email)) rejectOutsider();
        else setSession(data.session);
      })
      .catch((error: unknown) => { if (live) setSessionError(friendly(error)); })
      .finally(() => { if (live) setLoading(false); });
    // Only set state in here; calling other supabase methods inside this callback can deadlock.
    const { data } = client.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") setRecovery(false);
      if (s && !isNeuEmail(s.user.email)) return rejectOutsider();
      if (s) setSessionError(null);
      setSession(s);
    });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);

  /** Each action resolves to an error message, or null on success.
   *  Student ID sign-in: the backend finds the account and returns a session, which is stored like any other. */
  const signInWithStudentId = useCallback(async (studentId: string, password: string) => {
    if (!supabase) return NOT_CONFIGURED;
    try {
      const response = await fetch("/api/auth/student-sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: studentId.trim(), password }),
      });
      const payload = await response.json().catch(() => null) as { session?: { access_token?: unknown; refresh_token?: unknown }; error?: { message?: unknown } } | null;
      if (!response.ok) return typeof payload?.error?.message === "string" ? payload.error.message : "Sign-in failed. Please try again.";
      const access_token = payload?.session?.access_token, refresh_token = payload?.session?.refresh_token;
      if (typeof access_token !== "string" || typeof refresh_token !== "string") return "Sign-in failed. Please try again.";
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      return error ? friendly(error) : null;
    } catch (error: unknown) {
      return friendly(error);
    }
  }, []);

  /** Continue with Google: Google shows NEU accounts first (hd), and only @neu.edu.ph sessions are kept. */
  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return NOT_CONFIGURED;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin, queryParams: { hd: NEU_EMAIL_DOMAIN, prompt: "select_account" } },
      });
      return error ? friendly(error) : null;
    } catch (error: unknown) {
      return friendly(error);
    }
  }, []);

  /** Create an account with a student ID: the backend creates it and Supabase emails a confirmation link. */
  const registerWithStudentId = useCallback(async (input: { studentId: string; email: string; password: string; fullName: string }): Promise<{ notice?: string; error?: string }> => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json().catch(() => null) as { message?: unknown; error?: { message?: unknown } } | null;
      if (!response.ok) return { error: typeof payload?.error?.message === "string" ? payload.error.message : "Could not create the account. Please try again." };
      return { notice: typeof payload?.message === "string" ? payload.message : "Account created. Check your NEU email to confirm it, then sign in." };
    } catch (error: unknown) {
      return { error: friendly(error) };
    }
  }, []);

  /** Forgot password by student ID: the backend emails the reset link to the account's university address. */
  const resetWithStudentId = useCallback(async (studentId: string): Promise<{ notice?: string; error?: string }> => {
    try {
      const response = await fetch("/api/auth/student-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: studentId.trim() }),
      });
      const payload = await response.json().catch(() => null) as { message?: unknown; error?: { message?: unknown } } | null;
      if (!response.ok) return { error: typeof payload?.error?.message === "string" ? payload.error.message : "Could not send a reset link. Please try again." };
      return { notice: typeof payload?.message === "string" ? payload.message : "If that student ID has an account, a password reset link is on its way." };
    } catch (error: unknown) {
      return { error: friendly(error) };
    }
  }, []);

  const setNewPassword = useCallback(async (password: string) => {
    if (!supabase) return NOT_CONFIGURED;
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return friendly(error);
      setRecovery(false);
      return null;
    } catch (error: unknown) {
      return friendly(error);
    }
  }, []);

  const signOut = useCallback(async () => {
    // "local" ends this browser's session without signing the student out on other devices.
    if (!supabase) return NOT_CONFIGURED;
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) return friendly(error);
      setRecovery(false);
      setSession(null);
      setSessionError(null);
      return null;
    } catch (error: unknown) {
      return friendly(error);
    }
  }, []);

  return { configured: authConfigured, loading, session, recovery, sessionError, signInWithStudentId, signInWithGoogle, registerWithStudentId, resetWithStudentId, setNewPassword, signOut };
}
