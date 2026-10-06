import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { authConfigured, supabase } from "./lib/supabase";

const NOT_CONFIGURED = "Sign-in is not configured for this deployment.";

function friendly(error: unknown): string {
  const authError = error as { message?: unknown; status?: unknown; name?: unknown } | null;
  const message = typeof authError?.message === "string" ? authError.message.trim() : "";
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Incorrect email or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email before signing in.";
  if (authError?.status === 429 || m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a moment and try again.";
  if (authError?.status === 0 || authError?.name === "AuthRetryableFetchError" || m.includes("fetch")) return "Can't reach the sign-in service. Check your connection and try again.";
  // Keep Supabase's diagnostic message visible instead of hiding unknown auth failures.
  return message || (error instanceof Error ? error.message : "Authentication failed. Please try again.");
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(authConfigured);
  const [recovery, setRecovery] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let live = true;
    // Restores a persisted session on refresh (refreshing the token first if it has expired).
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setSessionError(friendly(error));
        else setSession(data.session);
      })
      .catch((error: unknown) => { if (live) setSessionError(friendly(error)); })
      .finally(() => { if (live) setLoading(false); });
    // Only set state in here; calling other supabase methods inside this callback can deadlock.
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") setRecovery(false);
      if (s) setSessionError(null);
      setSession(s);
    });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);

  /** Each action resolves to an error message, or null on success. */
  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return NOT_CONFIGURED;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? friendly(error) : null;
    } catch (error: unknown) {
      return friendly(error);
    }
  }, []);

  const sendResetEmail = useCallback(async (email: string) => {
    if (!supabase) return NOT_CONFIGURED;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      return error ? friendly(error) : null;
    } catch (error: unknown) {
      return friendly(error);
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

  return { configured: authConfigured, loading, session, recovery, sessionError, signIn, sendResetEmail, setNewPassword, signOut };
}
