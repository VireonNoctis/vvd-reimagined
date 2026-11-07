"use client";

import { useEffect, useState } from "react";

type SecurityEvent = {
  id: string;
  eventType: string;
  details: Record<string, unknown>;
  createdAt: string;
};

const labels: Record<string, string> = {
  sign_in: "Signed in",
  sign_out: "Signed out",
  password_changed: "Password changed",
  session_revoked: "Session ended",
  sessions_revoked: "Other sessions ended"
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed);
}

function description(event: SecurityEvent): string {
  if (event.eventType === "sessions_revoked") {
    const count = Number(event.details.revokedCount) || 0;
    return count === 1
      ? "One other browser was signed out."
      : String(count) + " other browsers were signed out.";
  }
  if (event.eventType === "password_changed") {
    return "Your password was updated and other sessions were ended.";
  }
  return event.eventType === "sign_in"
    ? "A new browser session was started."
    : event.eventType === "sign_out"
      ? "This browser session was ended."
      : "A remote browser session was ended.";
}

async function fetchSecurityEvents(signal?: AbortSignal): Promise<SecurityEvent[]> {
  const response = await fetch("/api/v1/auth/security-events", {
    cache: "no-store",
    signal
  });
  if (!response.ok) throw new Error("Security activity could not be loaded.");
  return await response.json() as SecurityEvent[];
}

export function SecurityEventLog() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    void fetchSecurityEvents(controller.signal)
      .then((body) => {
        if (!controller.signal.aborted) {
          setEvents(body);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Security activity could not be loaded.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    const refresh = () => {
      setLoading(true);
      void fetchSecurityEvents()
        .then((body) => {
          setEvents(body);
          setError("");
        })
        .catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : "Security activity could not be loaded.");
        })
        .finally(() => setLoading(false));
    };

    window.addEventListener("vvd:security-events-changed", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("vvd:security-events-changed", refresh);
    };
  }, []);

  return (
    <section className="security-settings-card security-history-card" aria-labelledby="security-history-heading">
      <div className="security-section-heading">
        <div>
          <span className="eyebrow">ACCOUNT ACTIVITY</span>
          <h2 id="security-history-heading">Recent security events</h2>
        </div>
        <span className="security-section-index">90 DAY HISTORY</span>
      </div>
      <p className="security-section-copy">
        Sign-ins, password changes and session revocations for this account. The latest 50 events are shown.
      </p>
      {error ? (
        <p className="account-form-error" role="alert">{error}</p>
      ) : loading ? (
        <div className="security-history-loading" aria-label="Loading security events"><i /><i /><i /></div>
      ) : events.length ? (
        <ol className="security-history-list">
          {events.map((event) => (
            <li className="security-history-row" key={event.id}>
              <span className="security-history-dot" aria-hidden="true" />
              <div className="security-history-copy">
                <strong>{labels[event.eventType] ?? "Account activity"}</strong>
                <span>{description(event)}</span>
              </div>
              <time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="security-history-empty">No security events have been recorded yet.</p>
      )}
    </section>
  );
}
