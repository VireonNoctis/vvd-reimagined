"use client";

import { useEffect, useState } from "react";

type Session = {
  id: string;
  createdAt: string;
  expiresAt: string;
  deviceLabel: string;
  current: boolean;
};

function date(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function SessionManager() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/v1/auth/sessions", { cache: "no-store" });
        const body = await response.json().catch(() => []);
        if (!response.ok) throw new Error("Active sessions could not be loaded.");
        if (active) setSessions(body as Session[]);
      } catch (reason) {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Active sessions could not be loaded.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  async function revoke(id: string) {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/sessions/" + encodeURIComponent(id), {
        method: "DELETE"
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || "This session could not be revoked.");
      }
      setSessions((current) => current.filter((session) => session.id !== id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This session could not be revoked.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="session-manager" aria-labelledby="session-heading">
      <div className="session-manager-heading">
        <div>
          <span className="eyebrow">ACCOUNT SECURITY</span>
          <h2 id="session-heading">Active sessions</h2>
          <p>Browsers signed in to this account. You can end another session here.</p>
        </div>
        <span className="session-count">{sessions.length} active</span>
      </div>

      {error && <p className="auth-error" role="alert">{error}</p>}
      {loading ? (
        <p className="session-empty">Loading sessions…</p>
      ) : sessions.length ? (
        <div className="session-list">
          {sessions.map((session) => (
            <article className="session-row" key={session.id}>
              <span className={"session-device-mark" + (session.current ? " is-current" : "")} aria-hidden="true">
                {session.current ? "●" : "○"}
              </span>
              <div className="session-copy">
                <div className="session-title">
                  <strong>{session.deviceLabel}</strong>
                  {session.current && <span className="session-current-pill">Current</span>}
                </div>
                <span>Started {date(session.createdAt)}</span>
                <small>Expires {date(session.expiresAt)}</small>
              </div>
              {session.current ? (
                <span className="session-current-label">Active now</span>
              ) : (
                <button
                  className="session-revoke"
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => void revoke(session.id)}
                >
                  {busyId === session.id ? "Ending…" : "Revoke"}
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="session-empty">No active sessions were found.</p>
      )}

      <p className="session-footnote">Signing out ends this browser’s session. Revoking another session prevents that browser from making further authenticated requests.</p>
    </section>
  );
}
