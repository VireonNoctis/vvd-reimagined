"use client";

import { useCallback, useEffect, useState } from "react";

type Session = {
  id: string;
  createdAt: string;
  expiresAt: string;
  deviceLabel: string;
  current: boolean;
};

function date(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

export function SessionManager() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [revokingAll, setRevokingAll] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setError("");
    try {
      const response = await fetch("/api/v1/auth/sessions", { cache: "no-store", signal });
      const body = await response.json().catch(() => []);
      if (!response.ok) throw new Error("Active sessions could not be loaded.");
      if (!signal?.aborted) setSessions(body as Session[]);
    } catch (reason) {
      if (!signal?.aborted) setError(reason instanceof Error ? reason.message : "Active sessions could not be loaded.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/auth/sessions", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Active sessions could not be loaded.");
        return await response.json() as Session[];
      })
      .then((body) => {
        if (!controller.signal.aborted) setSessions(body);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Active sessions could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function revoke(id: string) {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/v1/auth/sessions/" + encodeURIComponent(id), { method: "DELETE" });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "This session could not be ended.");
      setSessions((current) => current.filter((session) => session.id !== id));
      setNotice("That browser has been signed out.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This session could not be ended.");
    } finally {
      setBusyId("");
    }
  }

  async function revokeAll() {
    setRevokingAll(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/v1/auth/sessions", { method: "DELETE" });
      const body = await response.json().catch(() => ({})) as { error?: string; revokedCount?: number };
      if (!response.ok) throw new Error(body.error || "Other sessions could not be ended.");
      setSessions((current) => current.filter((session) => session.current));
      setConfirmAll(false);
      setNotice(body.revokedCount
        ? body.revokedCount + (body.revokedCount === 1 ? " other browser was signed out." : " other browsers were signed out.")
        : "There were no other active browsers.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Other sessions could not be ended.");
    } finally {
      setRevokingAll(false);
    }
  }

  const remoteCount = sessions.filter((session) => !session.current).length;

  return (
    <section className="session-manager" aria-labelledby="session-heading">
      <div className="session-manager-heading">
        <div>
          <span className="eyebrow">SIGNED-IN DEVICES</span>
          <h3 id="session-heading">Active sessions</h3>
          <p>Only this browser stays signed in when you end the others.</p>
        </div>
        <div className="session-heading-actions">
          <span className="session-count">{loading ? "—" : sessions.length} active</span>
          <button className="session-refresh" type="button" onClick={() => { setLoading(true); void load(); }} disabled={loading || revokingAll || Boolean(busyId)} aria-label="Refresh active sessions">↻</button>
        </div>
      </div>

      {error && <p className="account-form-error" role="alert">{error}</p>}
      {notice && <p className="account-form-success" role="status">{notice}</p>}
      {loading ? (
        <div className="session-skeleton" aria-label="Loading sessions"><i /><i /><i /></div>
      ) : sessions.length ? (
        <div className="session-list">
          {sessions.map((session) => (
            <article className={"session-row" + (session.current ? " is-current" : "")} key={session.id}>
              <span className={"session-device-mark" + (session.current ? " is-current" : "")} aria-hidden="true">{session.current ? "●" : "○"}</span>
              <div className="session-copy">
                <div className="session-title">
                  <strong>{session.deviceLabel}</strong>
                  {session.current && <span className="session-current-pill">This device</span>}
                </div>
                <span>Started {date(session.createdAt)}</span>
                <small>Session expires {date(session.expiresAt)}</small>
              </div>
              {session.current ? <span className="session-current-label"><i /> Current</span> : (
                <button className="session-revoke" type="button" disabled={Boolean(busyId) || revokingAll} onClick={() => void revoke(session.id)}>
                  {busyId === session.id ? "Ending…" : "End"}
                </button>
              )}
            </article>
          ))}
        </div>
      ) : <p className="session-empty">No active sessions were found.</p>}

      {remoteCount > 0 && !loading && (
        <div className="session-revoke-all">
          {!confirmAll ? (
            <button className="session-revoke-all-toggle" type="button" onClick={() => setConfirmAll(true)} disabled={revokingAll || Boolean(busyId)}>
              End all other sessions <span aria-hidden="true">↗</span>
            </button>
          ) : (
            <div className="session-confirm-row">
              <span>Sign out {remoteCount} other {remoteCount === 1 ? "browser" : "browsers"}?</span>
              <button type="button" onClick={() => void revokeAll()} disabled={revokingAll}>{revokingAll ? "Ending…" : "Confirm"}</button>
              <button type="button" onClick={() => setConfirmAll(false)} disabled={revokingAll}>Cancel</button>
            </div>
          )}
        </div>
      )}
      <p className="session-footnote">Session labels are best-effort browser and device details. This build does not record a precise location for each sign-in.</p>
    </section>
  );
}
