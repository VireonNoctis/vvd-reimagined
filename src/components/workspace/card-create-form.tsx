"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { CardEntityType, World } from "@/domain/world";

type Props = { world: World; onCancel?: () => void };

export function CardCreateForm({ world, onCancel }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState<CardEntityType>("character");
  const [aliases, setAliases] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const response = await fetch(
        "/api/v1/worlds/" + encodeURIComponent(world.slug) + "/documents",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            entityType,
            aliases: aliases.split(",").map((value) => value.trim()).filter(Boolean),
            properties: [],
            blocks: body.trim() ? [{ id: "intro", text: body }] : []
          })
        }
      );
      const result = await response.json().catch(() => ({})) as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error || "The card could not be created.");

      router.replace("/worlds/" + world.slug + "?doc=" + encodeURIComponent(result.id));
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The card could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card-edit-form" onSubmit={submit}>
      <div className="card-edit-heading">
        <span className="eyebrow">NEW WORLD RECORD</span>
        <h2>Give it a place in the world.</h2>
      </div>
      <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required autoFocus /></label>
      <label>
        <span>Record type</span>
        <select value={entityType} onChange={(event) => setEntityType(event.target.value as CardEntityType)}>
          <option value="character">Character</option>
          <option value="place">Place</option>
          <option value="faction">Faction</option>
        </select>
      </label>
      <label><span>Aliases <small>Separate with commas</small></span><input value={aliases} onChange={(event) => setAliases(event.target.value)} /></label>
      <label><span>First text block</span><textarea value={body} onChange={(event) => setBody(event.target.value)} rows={8} /></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="card-edit-actions">
        {onCancel && <button className="text-link" type="button" onClick={onCancel} disabled={busy}>Cancel</button>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Creating…" : "Create card"} <span aria-hidden="true">↗</span></button>
      </div>
    </form>
  );
}
