"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { CardDocument, World } from "@/domain/world";

type Props = { world: World; document: CardDocument; onCancel: () => void };

export function CardEditForm({ world, document, onCancel }: Props) {
  const router = useRouter();
  const [name, setName] = useState(document.name);
  const [aliases, setAliases] = useState(document.aliases.join(", "));
  const [body, setBody] = useState(document.blocks[0]?.text ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const nextBlocks = document.blocks.length
      ? document.blocks.map((block, index) => ({
          id: block.id,
          text: index === 0 ? body : block.text
        }))
      : body.trim() ? [{ id: "body", text: body }] : [];

    try {
      const response = await fetch(
        "/api/v1/worlds/" + encodeURIComponent(world.slug) + "/documents/" + encodeURIComponent(document.id),
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            expectedVersion: document.version,
            name,
            aliases: aliases.split(",").map((value) => value.trim()).filter(Boolean),
            properties: document.properties,
            blocks: nextBlocks
          })
        }
      );
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "The card could not be saved.");
      onCancel();
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The card could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card-edit-form" onSubmit={submit}>
      <div className="card-edit-heading"><span className="eyebrow">EDIT CARD</span><h2>Make it yours.</h2></div>
      <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required autoFocus /></label>
      <label><span>Aliases <small>Separate with commas</small></span><input value={aliases} onChange={(event) => setAliases(event.target.value)} /></label>
      <label><span>First text block <small>Other blocks stay unchanged.</small></span><textarea value={body} onChange={(event) => setBody(event.target.value)} rows={12} /></label>
      <p className="card-edit-version">Version {document.version} · Changes are checked against the version you opened.</p>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="card-edit-actions">
        <button className="text-link" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"} <span aria-hidden="true">↗</span></button>
      </div>
    </form>
  );
}
