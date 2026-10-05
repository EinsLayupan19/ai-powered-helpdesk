import { FormEvent, useState } from "react";
import { Eagle } from "./brand";
import { savedTheme } from "./user";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Result = Promise<string | null>;
const errorText = (error: unknown) => error instanceof Error ? error.message : "Authentication failed. Please try again.";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className={`auth-shell theme-${savedTheme()}`}><div className="card auth-card">{children}</div></div>;
}

export function AuthLoading() {
  return <div className={`auth-shell theme-${savedTheme()}`} aria-busy="true" aria-label="Loading"><Eagle size="lg" /></div>;
}

export function Login({ configured, initialError, onSignIn, onForgotPassword }: {
  configured: boolean; initialError?: string | null; onSignIn: (email: string, password: string) => Result; onForgotPassword: (email: string) => Result;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError || "");
  const [notice, setNotice] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setNotice("");
    const em = email.trim();
    if (!em || !password) return setError("Enter your university email and password.");
    if (!EMAIL_RE.test(em)) return setError("Enter a valid email address.");
    setError(""); setBusy(true);
    try {
      const err = await onSignIn(em, password);
      if (err) setError(err);
    } catch (err: unknown) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    setNotice("");
    const em = email.trim();
    if (!EMAIL_RE.test(em)) return setError("Enter your email above, then choose Forgot password.");
    setError(""); setBusy(true);
    try {
      const err = await onForgotPassword(em);
      if (err) setError(err); else setNotice("If that email has an account, a password reset link is on its way.");
    } catch (err: unknown) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="auth-head"><Eagle size="lg" /><h1>Welcome to EagleDesk</h1><p>Sign in with your university account to continue.</p></div>
      {!configured && <div className="auth-message auth-error" role="alert">Sign-in is not configured for this deployment (missing Supabase settings).</div>}
      <form className="auth-form" onSubmit={submit} noValidate>
        <label>University email<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@neu.edu.ph" disabled={busy || !configured} /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} disabled={busy || !configured} /></label>
        {error && <div className="auth-message auth-error" role="alert">{error}</div>}
        {notice && <div className="auth-message auth-notice" role="status">{notice}</div>}
        <button className="button button-primary" type="submit" disabled={busy || !configured}>{busy ? "Please wait…" : "Sign in"}</button>
        <button className="button button-ghost" type="button" onClick={forgot} disabled={busy || !configured}>Forgot password?</button>
      </form>
      <div className="auth-divider"><span>or</span></div>
      <button className="button button-secondary auth-sso" type="button" disabled title="University single sign-on is not set up yet">University account (not available yet)</button>
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
      <div className="auth-head"><Eagle size="lg" /><h1>Set a new password</h1><p>Choose a new password for your EagleDesk account.</p></div>
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
