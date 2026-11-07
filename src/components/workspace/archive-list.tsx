"use client";

import { useState } from "react";
import Link from "next/link";

type ArchivedDocument = {
  id: string;
  name: string;
  entityType: "character" | "place" | "faction";
  version: number;
  archivedAt: string;
};

type Props = { worldSlug: string; initialItems: ArchivedDocument[] };

function date(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function ArchiveList({ worldSlug, initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function restore(item: ArchivedDocument) {
    setBusyId(item.id);
    setError("");
    try {
      const response = await fetch(
        "/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/documents/" + encodeURIComponent(item.id) + "/restore",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expectedVersion: item.version })
        }
      );
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "This record could not be restored.");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This record could not be restored.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="archive-list" aria-label="Archived world records">
      {error && <p className="auth-error" role="alert">{error}</p>}
      {items.length ? items.map((item) => (
        <article className="archive-row" key={item.id}>
          <div className={"document-type-icon " + item.entityType}>{item.entityType.slice(0, 1).toUpperCase()}</div>
          <div className="archive-row-copy">
            <strong>{item.name}</strong>
            <span>{item.entityType} · Archived {date(item.archivedAt)}</span>
          </div>
          <button className="session-revoke" type="button" disabled={Boolean(busyId)} onClick={() => void restore(item)}>
            {busyId === item.id ? "Restoring…" : "Restore"}
          </button>
        </article>
      )) : (
        <div className="archive-empty"><span className="eyebrow">NOTHING TO RESTORE</span><h2>Your archive is clear.</h2><p>Records you archive from this world will appear here.</p></div>
      )}
      <Link className="text-link archive-back-link" href={"/worlds/" + encodeURIComponent(worldSlug)}>Back to world</Link>
    </section>
  );
}
