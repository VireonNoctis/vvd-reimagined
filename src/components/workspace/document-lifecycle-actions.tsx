"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { worldSlug: string; documentId: string; expectedVersion: number };
type Revision = { id: string; version: number; createdAt: string };

function date(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({})) as { error?: string };
  return body.error || fallback;
}

export function DocumentLifecycleActions({ worldSlug, documentId, expectedVersion }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function showHistory() {
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        "/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/documents/" + encodeURIComponent(documentId) + "/revisions",
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error(await errorMessage(response, "Version history could not be loaded."));
      setRevisions(await response.json() as Revision[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Version history could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function restore(revision: Revision) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/documents/" + encodeURIComponent(documentId) + "/revisions/" + encodeURIComponent(revision.id) + "/restore",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expectedVersion })
        }
      );
      if (!response.ok) throw new Error(await errorMessage(response, "This revision could not be restored."));
      setOpen(false);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This revision could not be restored.");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!window.confirm("Move this card to the world archive? It can be restored later.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/documents/" + encodeURIComponent(documentId) + "/archive",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expectedVersion })
        }
      );
      if (!response.ok) throw new Error(await errorMessage(response, "This card could not be archived."));
      router.replace("/worlds/" + encodeURIComponent(worldSlug));
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This card could not be archived.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="toolbar-button" type="button" onClick={() => void showHistory()} disabled={busy}>History</button>
      <button className="toolbar-button archive-document-button" type="button" onClick={() => void archive()} disabled={busy}>Archive</button>
      {open && (
        <div className="revision-popover" role="region" aria-label="Document version history">
          <div className="revision-popover-heading">
            <div><span className="eyebrow">DOCUMENT HISTORY</span><strong>Previous versions</strong></div>
            <button className="quiet-icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close history">×</button>
          </div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {loading ? <p className="session-empty">Loading versions…</p> : revisions.length ? (
            <div className="revision-list">
              {revisions.map((revision) => (
                <div className="revision-row" key={revision.id}>
                  <div><strong>Version {revision.version}</strong><small>{date(revision.createdAt)}</small></div>
                  <button className="session-revoke" type="button" disabled={busy} onClick={() => void restore(revision)}>
                    {busy ? "Restoring…" : "Restore"}
                  </button>
                </div>
              ))}
            </div>
          ) : <p className="session-empty">No earlier versions yet. A snapshot is created when this card is first changed.</p>}
        </div>
      )}
      {error && !open && <span className="lifecycle-error" role="alert">{error}</span>}
    </>
  );
}
