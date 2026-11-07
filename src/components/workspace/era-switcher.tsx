"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { World } from "@/domain/world";

type Props = { world: World; interactive: boolean; documentId?: string };

function worldUrl(world: World, eraId: string, documentId?: string): string {
  const query = new URLSearchParams({ era: eraId });
  if (documentId) query.set("doc", documentId);
  return "/worlds/" + encodeURIComponent(world.slug) + "?" + query.toString();
}

export function EraSwitcher({ world, interactive, documentId }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function selectEra(eraId: string) {
    router.push(worldUrl(world, eraId, documentId));
  }

  async function createEra(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Give the new era a name.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/v1/worlds/" + encodeURIComponent(world.slug) + "/eras", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          description: description.trim(),
          parentId: world.activeEraId
        })
      });
      const result = await response.json().catch(() => ({})) as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error || "The era could not be created.");
      router.push(worldUrl(world, result.id, documentId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The era could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="era-switcher">
      <label className="era-select-wrap">
        <span className="eyebrow">ERA</span>
        <select
          value={world.activeEraId}
          onChange={(event) => selectEra(event.target.value)}
          aria-label="Active era"
        >
          {world.eras.map((era) => (
            <option value={era.id} key={era.id}>{era.name}{era.isDefault ? " · Prime" : ""}</option>
          ))}
        </select>
      </label>
      {interactive && (
        <div className="era-create-wrap">
          <button
            className="era-create-toggle"
            type="button"
            onClick={() => { setCreating((value) => !value); setError(""); }}
            aria-expanded={creating}
          >+ Era</button>
          {creating && (
            <form className="era-create-popover" onSubmit={createEra}>
              <span className="eyebrow">NEW BRANCH</span>
              <strong>Build on {world.eras.find((era) => era.id === world.activeEraId)?.name ?? "this era"}</strong>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Era name"
                maxLength={80}
                required
                autoFocus
                disabled={busy}
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What changes in this timeline?"
                rows={2}
                maxLength={2000}
                disabled={busy}
              />
              {error && <p className="auth-error" role="alert">{error}</p>}
              <div className="era-create-actions">
                <button type="button" className="text-link" onClick={() => setCreating(false)} disabled={busy}>Cancel</button>
                <button type="submit" className="auth-submit" disabled={busy}>{busy ? "Creating…" : "Create era"}</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
