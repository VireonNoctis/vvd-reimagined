"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Mode = "login" | "register";

export function AuthForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!enabled) {
      setError("The API is not configured for this environment.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/v1/auth/" + mode, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(mode === "register" ? { displayName } : {})
        })
      });

      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Sign-in failed.");

      router.replace("/");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <Link className="brand-mark light-brand" href="/" aria-label="vvd Reimagined home">v</Link>
        <Link className="text-link auth-back-link" href="/">Back to preview</Link>
      </header>
      <section className="auth-panel">
        <span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "MAKE A PLACE FOR YOUR IDEAS"}</span>
        <h1>{mode === "login" ? "Pick up where you left off." : "Start a new world."}</h1>
        <p className="auth-intro">
          {mode === "login"
            ? "Sign in to reach your worlds and continue building."
            : "Create an account, then bring your first world to life."}
        </p>

        {!enabled && (
          <p className="auth-notice" role="status">
            Sign-in is not enabled in this preview. Configure the Rust API to use account features.
          </p>
        )}

        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && (
            <label>
              <span>Display name</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} required autoComplete="name" />
            </label>
          )}
          <label>
            <span>Email address</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required autoComplete="email" />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "register" ? 12 : undefined} maxLength={128} required autoComplete={mode === "register" ? "new-password" : "current-password"} />
            {mode === "register" && <small>Use at least 12 characters.</small>}
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={!enabled || busy}>
            {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
            <span aria-hidden="true">↗</span>
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? "New to this workspace?" : "Already have an account?"}
          <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </section>
      <footer className="auth-footer"><span>VVD REIMAGINED</span><span>AN INDEPENDENT RECONSTRUCTION · 2026</span></footer>
    </main>
  );
}
