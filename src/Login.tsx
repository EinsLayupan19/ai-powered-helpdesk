import { FormEvent, useState } from "react";
import { Eagle } from "./brand";
import { savedTheme } from "./user";

// Students sign in with their student ID (e.g. 12-34567-890) and password, or with their NEU Google account.
const STUDENT_ID_RE = /^\d{2}-\d{5}-\d{3}$/;
const ENTER_ID = "Enter your student ID, for example 12-34567-890.";
type Result = Promise<string | null>;
const errorText = (error: unknown) => error instanceof Error ? error.message : "Authentication failed. Please try again.";

/** Keeps only digits and adds the dashes (12-34567-890) as the student types. */
export function formatStudentId(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 10);
  return [d.slice(0, 2), d.slice(2, 7), d.slice(7)].filter(Boolean).join("-");
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className={`auth-shell theme-${savedTheme()}`}><div className="card auth-card">{children}</div></div>;
}

export function AuthLoading() {
  return <div className={`auth-shell theme-${savedTheme()}`} role="status" aria-busy="true"><Eagle size="lg" /><span className="sr-only">Loading EagleDesk</span></div>;
}

type Outcome = Promise<{ notice?: string; error?: string }>;
const NEU_EMAIL_RE = /^[^\s@]+@neu\.edu\.ph$/i;

export function Login({ configured, initialError, onStudentSignIn, onForgotPassword, onGoogleSignIn, onRegister }: {
  configured: boolean; initialError?: string | null;
  onStudentSignIn: (studentId: string, password: string) => Result;
  /** Resolves to { notice } on success or { error } on failure. */
  onForgotPassword: (studentId: string) => Outcome;
  onGoogleSignIn: () => Result;
  onRegister: (input: { studentId: string; email: string; password: string; fullName: string }) => Outcome;
}) {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError || "");
  const [notice, setNotice] = useState("");

  async function run(action: () => Promise<void>) {
    setError(""); setNotice(""); setBusy(true);
    try {
      await action();
    } catch (err: unknown) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setNotice("");
    if (!studentId || !password) return setError("Enter your student ID and password.");
    if (!STUDENT_ID_RE.test(studentId)) return setError(ENTER_ID);
    void run(async () => {
      const err = await onStudentSignIn(studentId, password);
      if (err) setError(err);
    });
  }

  function forgot() {
    setNotice("");
    if (!STUDENT_ID_RE.test(studentId)) return setError("Enter your student ID above (for example 12-34567-890), then choose Forgot password.");
    void run(async () => {
      const result = await onForgotPassword(studentId);
      if (result.error) setError(result.error); else if (result.notice) setNotice(result.notice);
    });
  }

  function google() {
    // On success the browser leaves for Google, so busy stays on until the page changes.
    setError(""); setNotice(""); setBusy(true);
    onGoogleSignIn().then((err) => { if (err) { setError(err); setBusy(false); } }, (err: unknown) => { setError(errorText(err)); setBusy(false); });
  }

  function switchTo(next: "signin" | "register") {
    setMode(next); setError(""); setNotice(""); setPassword(""); setConfirm("");
  }

  // Same rules as the server (POST /api/auth/register), so most mistakes are caught before sending.
  function register(e: FormEvent) {
    e.preventDefault();
    setNotice("");
    const name = fullName.trim().replace(/\s+/g, " ");
    const mail = email.trim();
    if (!name) return setError("Enter your full name.");
    if (!STUDENT_ID_RE.test(studentId)) return setError(ENTER_ID);
    if (!NEU_EMAIL_RE.test(mail)) return setError("Use your NEU email address (ending in @neu.edu.ph).");
    if (password.length < 8 || password.length > 72) return setError("Choose a password with at least 8 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");
    void run(async () => {
      const result = await onRegister({ studentId, email: mail, password, fullName: name });
      if (result.error) return setError(result.error);
      // Back to sign-in with the student ID filled in, and the "check your email" notice.
      setMode("signin"); setPassword(""); setConfirm("");
      setNotice(result.notice ?? "Account created. Check your NEU email to confirm it, then sign in.");
    });
  }

  const head = mode === "signin"
    ? { title: "Welcome to EagleDesk", text: "Sign in with your university account to continue." }
    : { title: "Create your account", text: "Use your student ID and your NEU email. We will email you a link to confirm it." };

  return (
    <Shell>
      <div className="auth-head"><div className="orb" aria-hidden="true"><Eagle size="lg" /></div><h1>{head.title}</h1><p>{head.text}</p></div>
      {!configured && <div className="auth-message auth-error" role="alert">Sign-in is not configured for this deployment (missing Supabase settings).</div>}
      {mode === "register" ? (
        <form className="auth-form" onSubmit={register} noValidate>
          <label>Full name<input type="text" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={160} disabled={busy || !configured} /></label>
          <label>Student ID<input type="text" inputMode="numeric" autoComplete="username" spellCheck={false} maxLength={12} value={studentId} onChange={e => setStudentId(formatStudentId(e.target.value))} placeholder="12-34567-890" disabled={busy || !configured} /></label>
          <label>NEU email<input type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={e => setEmail(e.target.value)} placeholder="name@neu.edu.ph" disabled={busy || !configured} /></label>
          <label>Password<input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy || !configured} /></label>
          <label>Confirm password<input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy || !configured} /></label>
          <p className="auth-hint">At least 8 characters.</p>
          {error && <div className="auth-message auth-error" role="alert">{error}</div>}
          <button className="button button-primary" type="submit" disabled={busy || !configured}>{busy ? "Please wait…" : "Create account"}</button>
          <button className="button button-ghost" type="button" onClick={() => switchTo("signin")} disabled={busy}>Already have an account? Sign in</button>
        </form>
      ) : (
      <form className="auth-form" onSubmit={submit} noValidate>
        <label>Student ID<input type="text" inputMode="numeric" autoComplete="username" spellCheck={false} maxLength={12} value={studentId} onChange={e => setStudentId(formatStudentId(e.target.value))} placeholder="12-34567-890" disabled={busy || !configured} /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy || !configured} /></label>
        {error && <div className="auth-message auth-error" role="alert">{error}</div>}
        {notice && <div className="auth-message auth-notice" role="status">{notice}</div>}
        <button className="button button-primary" type="submit" disabled={busy || !configured}>{busy ? "Please wait…" : "Sign in"}</button>
        <button className="button button-ghost" type="button" onClick={forgot} disabled={busy || !configured}>Forgot password?</button>
      </form>
      )}
      <div className="auth-divider"><span>or</span></div>
      <button className="button button-secondary auth-sso" type="button" onClick={google} disabled={busy || !configured}>Continue with Google</button>
      <p className="auth-sso-note">NEU Google accounts (@neu.edu.ph) only.</p>
      {mode === "signin" && (
        <p className="auth-switch">New to EagleDesk? <button className="auth-link" type="button" onClick={() => switchTo("register")} disabled={busy}>Create an account</button></p>
      )}
    </Shell>
  );
}

export function SetNewPassword({ onSubmit, onCancel }: { onSubmit: (password: string) => Result; onCancel: () => Result }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== confirm) return setError("The passwords don't match.");
    setError(""); setBusy(true);
    try {
      const err = await onSubmit(pw);
      if (err) setError(err);
    } catch (err: unknown) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setError(""); setBusy(true);
    try {
      const err = await onCancel();
      if (err) setError(err);
    } catch (err: unknown) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="auth-head"><div className="orb" aria-hidden="true"><Eagle size="lg" /></div><h1>Set a new password</h1><p>Choose a new password for your EagleDesk account.</p></div>
      <form className="auth-form" onSubmit={submit} noValidate>
        <label>New password<input type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} disabled={busy} /></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy} /></label>
        {error && <div className="auth-message auth-error" role="alert">{error}</div>}
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Please wait…" : "Update password"}</button>
        <button className="button button-ghost" type="button" onClick={cancel} disabled={busy}>Cancel and sign out</button>
      </form>
    </Shell>
  );
}
