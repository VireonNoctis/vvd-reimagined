"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { CardEntityType, CardTemplatePropertyDefinition, World } from "@/domain/world";

type Props = { world: World; interactive: boolean };

function fieldId(prefix: string): string {
  return prefix + "-" + crypto.randomUUID().slice(0, 8);
}

const entityLabels: Record<CardEntityType, string> = {
  character: "Character",
  place: "Place",
  faction: "Faction"
};

export function CardTemplateManager({ world, interactive }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [entityType, setEntityType] = useState<CardEntityType>("character");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [properties, setProperties] = useState<CardTemplatePropertyDefinition[]>([]);
  const [blocks, setBlocks] = useState<{ id: string; label: string; text: string }[]>([
    { id: "intro", label: "Introduction", text: "" }
  ]);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setName("");
    setDescription("");
    setProperties([]);
    setBlocks([{ id: fieldId("section"), label: "Introduction", text: "" }]);
    setIsDefault(false);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const response = await fetch(
        "/api/v1/worlds/" + encodeURIComponent(world.slug) + "/card-templates",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            entityType,
            name: name.trim(),
            description: description.trim(),
            propertyDefinitions: properties,
            starterBlocks: blocks,
            isDefault
          })
        }
      );
      const result = await response.json().catch(() => ({})) as { id?: string; error?: string };
      if (!response.ok || !result.id) {
        throw new Error(result.error || "The template could not be created.");
      }

      resetForm();
      setCreating(false);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The template could not be created.");
    } finally {
      setBusy(false);
    }
  }

  const typeGroups = (["character", "place", "faction"] as const).map((type) => ({
    type,
    templates: world.cardTemplates.filter((template) => template.entityType === type)
  }));
  const readyTypes = world.documentTypes.filter((type) => type.implementationStatus === "ready");
  const plannedTypes = world.documentTypes.filter((type) => type.implementationStatus === "planned");

  return (
    <main className="template-manager-page">
      <header className="template-manager-topbar">
        <div>
          <Link href={"/worlds/" + world.slug}>← {world.name}</Link>
          <span className="eyebrow">WORLD CONFIGURATION</span>
          <h1>Document types &amp; templates</h1>
          <p>Review the document systems this world knows about and shape the starting structure of each card type.</p>
        </div>
        <Link className="toolbar-button" href={"/worlds/" + world.slug}>Back to workspace</Link>
      </header>

      <section className="template-manager-section">
        <div className="template-manager-section-heading">
          <div>
            <span className="eyebrow">DOCUMENT REGISTRY</span>
            <h2>Available document types</h2>
          </div>
          <span className="template-manager-count">{readyTypes.length} ready · {plannedTypes.length} planned</span>
        </div>
        <div className="document-type-grid">
          {world.documentTypes.map((type) => (
            <article className={"document-type-card" + (type.implementationStatus === "planned" ? " is-planned" : "")} key={type.typeKey}>
              <div className="document-type-card-top">
                <span className="document-type-mark">{type.name.slice(0, 1)}</span>
                <span className={"document-type-status " + (type.implementationStatus === "ready" ? "ready" : "planned")}>
                  {type.implementationStatus === "ready" ? "Ready" : "Planned"}
                </span>
              </div>
              <h3>{type.name}</h3>
              <p>{type.description}</p>
              <small>{type.enabled ? "Enabled in this world" : "Not enabled in this world"}</small>
            </article>
          ))}
        </div>
        <p className="template-manager-footnote">A type only becomes creatable when its typed content handler is ready. Planned types stay visible here without exposing incomplete create actions.</p>
      </section>

      <section className="template-manager-section">
        <div className="template-manager-section-heading">
          <div>
            <span className="eyebrow">CARD STRUCTURE</span>
            <h2>Card templates</h2>
          </div>
          {interactive && (
            <button className="auth-submit template-add-button" type="button" onClick={() => { setCreating((value) => !value); setError(""); }}>
              {creating ? "Close editor" : "+ New template"}
            </button>
          )}
        </div>

        {creating && interactive && (
          <form className="template-builder" onSubmit={submit}>
            <div className="template-builder-heading">
              <span className="eyebrow">NEW TYPE TEMPLATE</span>
              <h3>Define a reusable starting point.</h3>
              <p>Required fields are checked when a card is created. Optional fields can be filled in later.</p>
            </div>
            <div className="template-builder-grid">
              <label>
                <span>Card type</span>
                <select value={entityType} onChange={(event) => setEntityType(event.target.value as CardEntityType)} disabled={busy}>
                  <option value="character">Character</option>
                  <option value="place">Place</option>
                  <option value="faction">Faction</option>
                </select>
              </label>
              <label>
                <span>Template name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required disabled={busy} placeholder="e.g. Royal Heir" />
              </label>
            </div>
            <label>
              <span>Description</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} maxLength={500} disabled={busy} placeholder="What does this template help describe?" />
            </label>

            <div className="template-builder-subsection">
              <div className="template-builder-subheading">
                <div><span className="eyebrow">FIELD DEFINITIONS</span><h4>Properties</h4></div>
                <button className="editor-secondary-button" type="button" onClick={() => setProperties((current) => [...current, {
                  id: fieldId("field"), label: "", kind: "text", required: false, defaultValue: ""
                }])} disabled={busy}>+ Add property</button>
              </div>
              {properties.length === 0 && <p className="card-editor-empty">No predefined properties. Cards can still have their own fields.</p>}
              <div className="template-definition-list">
                {properties.map((property, index) => (
                  <div className="template-definition-row" key={property.id}>
                    <label>
                      <span>Label</span>
                      <input value={property.label} onChange={(event) => setProperties((current) => current.map((item, position) => position === index ? { ...item, label: event.target.value } : item))} required maxLength={100} disabled={busy} placeholder="e.g. Allegiance" />
                    </label>
                    <label>
                      <span>Value type</span>
                      <select value={property.kind} onChange={(event) => setProperties((current) => current.map((item, position) => position === index ? { ...item, kind: event.target.value as "text" | "reference", defaultValue: event.target.value === "text" ? item.defaultValue ?? "" : undefined } : item))} disabled={busy}>
                        <option value="text">Text</option>
                        <option value="reference">Record link</option>
                      </select>
                    </label>
                    <label className="template-definition-default">
                      <span>{property.kind === "text" ? "Default value" : "Default"}</span>
                      {property.kind === "text"
                        ? <input value={property.defaultValue ?? ""} onChange={(event) => setProperties((current) => current.map((item, position) => position === index ? { ...item, defaultValue: event.target.value } : item))} maxLength={10000} disabled={busy} placeholder="Optional" />
                        : <span className="template-no-default">Selected when the card is created</span>}
                    </label>
                    <label className="template-required-toggle">
                      <input type="checkbox" checked={property.required} onChange={(event) => setProperties((current) => current.map((item, position) => position === index ? { ...item, required: event.target.checked } : item))} disabled={busy} />
                      <span>Required</span>
                    </label>
                    <button className="editor-icon-button danger" type="button" onClick={() => setProperties((current) => current.filter((item) => item.id !== property.id))} disabled={busy} aria-label={"Remove " + property.label}>×</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="template-builder-subsection">
              <div className="template-builder-subheading">
                <div><span className="eyebrow">STARTER CONTENT</span><h4>Body sections</h4></div>
                <button className="editor-secondary-button" type="button" onClick={() => setBlocks((current) => [...current, { id: fieldId("section"), label: "", text: "" }])} disabled={busy}>+ Add section</button>
              </div>
              <div className="template-builder-blocks">
                {blocks.map((block, index) => (
                  <div className="template-builder-block" key={block.id}>
                    <label>
                      <span>Section {index + 1}</span>
                      <input value={block.label} onChange={(event) => setBlocks((current) => current.map((item) => item.id === block.id ? { ...item, label: event.target.value } : item))} maxLength={100} required disabled={busy} placeholder="e.g. History" />
                    </label>
                    <button className="editor-icon-button danger" type="button" onClick={() => setBlocks((current) => current.filter((item) => item.id !== block.id))} disabled={busy} aria-label="Remove section">×</button>
                  </div>
                ))}
              </div>
            </div>

            <label className="template-default-toggle">
              <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} disabled={busy} />
              <span>Make this the default template for {entityLabels[entityType].toLowerCase()} cards</span>
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <div className="card-edit-actions">
              <button className="text-link" type="button" onClick={() => { setCreating(false); resetForm(); }} disabled={busy}>Cancel</button>
              <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Save template"} <span aria-hidden="true">↗</span></button>
            </div>
          </form>
        )}

        <div className="template-type-groups">
          {typeGroups.map(({ type, templates }) => (
            <section className="template-type-group" key={type}>
              <div className="template-type-heading">
                <span className={"document-type-icon " + type}>{entityLabels[type].slice(0, 1)}</span>
                <h3>{entityLabels[type]}</h3>
                <span>{templates.length} templates</span>
              </div>
              <div className="card-template-grid">
                {templates.map((template) => (
                  <article className="card-template-card" key={template.id}>
                    <div>
                      <span className="eyebrow">{template.isDefault ? "DEFAULT TEMPLATE" : "CUSTOM TEMPLATE"}</span>
                      <h4>{template.name}</h4>
                      <p>{template.description || "No description added."}</p>
                    </div>
                    <div className="card-template-meta">
                      <span>{template.propertyDefinitions.length} properties</span>
                      <span>{template.starterBlocks.length} sections</span>
                    </div>
                  </article>
                ))}
                {templates.length === 0 && <p className="card-editor-empty">No templates for this type yet.</p>}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
