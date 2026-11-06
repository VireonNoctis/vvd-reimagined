"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { CardProperty, CardDocument, World } from "@/domain/world";
import { moveDraftItem, parseAliases, validateCardDraft, type CardBlockDraft } from "@/domain/card-editor";

type Props = { world: World; document: CardDocument; onCancel: () => void };

function draftId(prefix: string): string {
  return prefix + "-" + crypto.randomUUID();
}

export function CardEditForm({ world, document, onCancel }: Props) {
  const router = useRouter();
  const [name, setName] = useState(document.name);
  const [aliases, setAliases] = useState(document.aliases.join(", "));
  const [properties, setProperties] = useState<CardProperty[]>(document.properties);
  const [blocks, setBlocks] = useState<CardBlockDraft[]>(
    document.blocks.map(({ id, text }) => ({ id, text }))
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function updateProperty(index: number, next: CardProperty) {
    setProperties((current) => current.map((property, position) => position === index ? next : property));
  }

  function changePropertyKind(index: number, kind: "text" | "reference") {
    const current = properties[index];
    if (!current || current.kind === kind) return;
    updateProperty(index, kind === "text"
      ? { id: current.id, label: current.label, kind: "text", value: "" }
      : { id: current.id, label: current.label, kind: "reference", documentId: "" });
  }

  function addProperty(kind: "text" | "reference") {
    setProperties((current) => [
      ...current,
      kind === "text"
        ? { id: draftId("property"), label: "", kind: "text", value: "" }
        : { id: draftId("property"), label: "", kind: "reference", documentId: "" }
    ]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const validation = validateCardDraft(name, properties, blocks);
    if (validation) {
      setError(validation);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        "/api/v1/worlds/" + encodeURIComponent(world.slug) + "/documents/" + encodeURIComponent(document.id),
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            expectedVersion: document.version,
            name: name.trim(),
            aliases: parseAliases(aliases),
            properties,
            blocks
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
      <div className="card-edit-heading">
        <span className="eyebrow">EDIT CARD</span>
        <h2>Make it yours.</h2>
        <p>Keep the record connected while shaping its details and story.</p>
      </div>

      <label>
        <span>Name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required autoFocus />
      </label>
      <label>
        <span>Aliases <small>Separate with commas</small></span>
        <input value={aliases} onChange={(event) => setAliases(event.target.value)} />
      </label>

      <section className="card-editor-section" aria-labelledby="card-properties-heading">
        <div className="card-editor-section-heading">
          <div><span className="eyebrow">STRUCTURE</span><h3 id="card-properties-heading">Properties</h3></div>
          <div className="card-editor-add-actions">
            <button className="editor-secondary-button" type="button" onClick={() => addProperty("text")} disabled={busy}>+ Text</button>
            <button className="editor-secondary-button" type="button" onClick={() => addProperty("reference")} disabled={busy}>+ Link</button>
          </div>
        </div>

        {properties.length === 0 && <p className="card-editor-empty">No properties yet. Add a text value or link this record to another one.</p>}
        <div className="card-editor-property-list">
          {properties.map((property, index) => {
            const linkedRecordMissing = property.kind === "reference"
              && !world.documents.some((item) => item.id === property.documentId);
            return (
              <div className="card-editor-property" key={property.id}>
                <label>
                  <span>Label</span>
                  <input
                    value={property.label}
                    maxLength={80}
                    onChange={(event) => updateProperty(index, { ...property, label: event.target.value })}
                    placeholder="e.g. Allegiance"
                    disabled={busy}
                  />
                </label>
                <label>
                  <span>Value type</span>
                  <select
                    value={property.kind}
                    onChange={(event) => changePropertyKind(index, event.target.value as "text" | "reference")}
                    disabled={busy}
                  >
                    <option value="text">Text</option>
                    <option value="reference">Record link</option>
                  </select>
                </label>
                <label className="card-editor-property-value">
                  <span>{property.kind === "reference" ? "Linked record" : "Value"}</span>
                  {property.kind === "text"
                    ? <input
                        value={property.value}
                        onChange={(event) => updateProperty(index, { ...property, value: event.target.value })}
                        placeholder="Add a value"
                        disabled={busy}
                      />
                    : <select
                        value={property.documentId}
                        onChange={(event) => updateProperty(index, { ...property, documentId: event.target.value })}
                        disabled={busy}
                      >
                        <option value="">Choose a record</option>
                        {linkedRecordMissing && <option value={property.documentId}>Existing record (not in active list)</option>}
                        {world.documents.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.entityType}</option>)}
                      </select>}
                </label>
                <button
                  className="editor-icon-button"
                  type="button"
                  onClick={() => setProperties((current) => current.filter((_, position) => position !== index))}
                  aria-label={"Remove property " + (property.label || index + 1)}
                  title="Remove property"
                  disabled={busy}
                >×</button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card-editor-section" aria-labelledby="card-body-heading">
        <div className="card-editor-section-heading">
          <div><span className="eyebrow">CONTENT</span><h3 id="card-body-heading">Body blocks</h3></div>
          <button className="editor-secondary-button" type="button" onClick={() => setBlocks((current) => [...current, { id: draftId("block"), text: "" }])} disabled={busy}>+ Add block</button>
        </div>
        <p className="card-editor-hint">Arrange each section in the order it should appear on the card.</p>
        {blocks.length === 0 && <p className="card-editor-empty">This card has no body blocks yet.</p>}
        <div className="card-editor-block-list">
          {blocks.map((block, index) => (
            <section className="card-editor-block" key={block.id} aria-label={"Text block " + (index + 1)}>
              <div className="card-editor-block-heading">
                <span>TEXT BLOCK <strong>{String(index + 1).padStart(2, "0")}</strong></span>
                <div>
                  <button className="editor-icon-button" type="button" onClick={() => setBlocks((current) => moveDraftItem(current, index, -1))} disabled={busy || index === 0} aria-label={"Move block " + (index + 1) + " up"} title="Move up">↑</button>
                  <button className="editor-icon-button" type="button" onClick={() => setBlocks((current) => moveDraftItem(current, index, 1))} disabled={busy || index === blocks.length - 1} aria-label={"Move block " + (index + 1) + " down"} title="Move down">↓</button>
                  <button className="editor-icon-button danger" type="button" onClick={() => setBlocks((current) => current.filter((item) => item.id !== block.id))} disabled={busy} aria-label={"Remove block " + (index + 1)} title="Remove block">×</button>
                </div>
              </div>
              <textarea
                value={block.text}
                onChange={(event) => setBlocks((current) => current.map((item) => item.id === block.id ? { ...item, text: event.target.value } : item))}
                rows={5}
                placeholder="Write this part of the record…"
                aria-label={"Text for block " + (index + 1)}
                disabled={busy}
              />
            </section>
          ))}
        </div>
      </section>

      <p className="card-edit-version">Version {document.version} · Saves are checked against the version you opened.</p>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="card-edit-actions">
        <button className="text-link" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"} <span aria-hidden="true">↗</span></button>
      </div>
    </form>
  );
}
