"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import type { CardEntityType, CardTemplateBlock, World } from "@/domain/world";

type Props = { world: World; onCancel?: () => void };

function templateProperties(template: World["cardTemplates"][number]): Record<string, string> {
  return Object.fromEntries(
    template.propertyDefinitions.map((definition) => [
      definition.id,
      definition.defaultValue ?? ""
    ])
  );
}

function templateBlocks(template: World["cardTemplates"][number]): CardTemplateBlock[] {
  return template.starterBlocks.map((block) => ({ ...block }));
}

export function CardCreateForm({ world, onCancel }: Props) {
  const router = useRouter();
  const initialTemplate = world.cardTemplates.find(
    (template) => template.entityType === "character" && template.isDefault
  ) ?? world.cardTemplates[0];

  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState<CardEntityType>(
    initialTemplate?.entityType ?? "character"
  );
  const [templateId, setTemplateId] = useState(initialTemplate?.id ?? "");
  const [aliases, setAliases] = useState("");
  const [propertyValues, setPropertyValues] = useState<Record<string, string>>(
    initialTemplate ? templateProperties(initialTemplate) : {}
  );
  const [blocks, setBlocks] = useState<CardTemplateBlock[]>(
    initialTemplate ? templateBlocks(initialTemplate) : []
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const availableTemplates = useMemo(
    () => world.cardTemplates.filter((template) => template.entityType === entityType),
    [entityType, world.cardTemplates]
  );
  const selectedTemplate = availableTemplates.find((template) => template.id === templateId)
    ?? availableTemplates.find((template) => template.isDefault)
    ?? availableTemplates[0];
  const cardTypeAvailable = world.documentTypes.some(
    (type) => type.typeKey === "card" && type.enabled && type.implementationStatus === "ready"
  );

  function selectEntityType(next: CardEntityType) {
    const nextTemplate = world.cardTemplates.find(
      (template) => template.entityType === next && template.isDefault
    ) ?? world.cardTemplates.find((template) => template.entityType === next);

    setEntityType(next);
    setTemplateId(nextTemplate?.id ?? "");
    setPropertyValues(nextTemplate ? templateProperties(nextTemplate) : {});
    setBlocks(nextTemplate ? templateBlocks(nextTemplate) : []);
  }

  function selectTemplate(nextId: string) {
    const nextTemplate = availableTemplates.find((template) => template.id === nextId);
    setTemplateId(nextId);
    setPropertyValues(nextTemplate ? templateProperties(nextTemplate) : {});
    setBlocks(nextTemplate ? templateBlocks(nextTemplate) : []);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!cardTypeAvailable) {
      setError("Cards are not enabled for this world.");
      return;
    }
    if (!selectedTemplate) {
      setError("Choose a template before creating this record.");
      return;
    }

    const properties = selectedTemplate.propertyDefinitions.flatMap((definition) => {
      const value = propertyValues[definition.id] ?? "";
      if (definition.kind === "reference") {
        return value
          ? [{ id: definition.id, label: definition.label, kind: "reference" as const, documentId: value }]
          : [];
      }
      return [{
        id: definition.id,
        label: definition.label,
        kind: "text" as const,
        value
      }];
    });

    const missingRequired = selectedTemplate.propertyDefinitions.some((definition) => {
      if (!definition.required) return false;
      const value = propertyValues[definition.id] ?? "";
      return !value.trim();
    });
    if (missingRequired) {
      setError("Complete the required properties from this template.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        "/api/v1/worlds/" + encodeURIComponent(world.slug) + "/documents",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            entityType,
            templateId: selectedTemplate.id,
            aliases: aliases.split(",").map((value) => value.trim()).filter(Boolean),
            properties,
            blocks: blocks.map(({ id, text }) => ({ id, text }))
          })
        }
      );
      const result = await response.json().catch(() => ({})) as { id?: string; error?: string };
      if (!response.ok || !result.id) {
        throw new Error(result.error || "The card could not be created.");
      }

      const query = new URLSearchParams({
        doc: result.id,
        era: world.activeEraId
      });
      router.replace("/worlds/" + world.slug + "?" + query.toString());
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The card could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card-edit-form card-create-form" onSubmit={submit}>
      <div className="card-edit-heading">
        <span className="eyebrow">NEW WORLD RECORD</span>
        <h2>Give it a place in the world.</h2>
        <p>Start with a type template. Its properties and sections can still be shaped on the record.</p>
      </div>

      <label>
        <span>Name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          required
          autoFocus
          disabled={busy}
        />
      </label>
      <div className="card-create-type-grid">
        <label>
          <span>Record type</span>
          <select
            value={entityType}
            onChange={(event) => selectEntityType(event.target.value as CardEntityType)}
            disabled={busy}
          >
            <option value="character">Character</option>
            <option value="place">Place</option>
            <option value="faction">Faction</option>
          </select>
        </label>
        <label>
          <span>Template</span>
          <select
            value={selectedTemplate?.id ?? ""}
            onChange={(event) => selectTemplate(event.target.value)}
            disabled={busy || availableTemplates.length === 0}
          >
            {availableTemplates.map((template) => (
              <option value={template.id} key={template.id}>
                {template.name}{template.isDefault ? " · Default" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      {selectedTemplate?.description && (
        <p className="card-create-template-note">{selectedTemplate.description}</p>
      )}
      <label>
        <span>Aliases <small>Separate with commas</small></span>
        <input
          value={aliases}
          onChange={(event) => setAliases(event.target.value)}
          disabled={busy}
        />
      </label>

      {selectedTemplate && selectedTemplate.propertyDefinitions.length > 0 && (
        <section className="card-editor-section" aria-labelledby="new-card-properties">
          <div className="card-editor-section-heading">
            <div>
              <span className="eyebrow">FROM TEMPLATE</span>
              <h3 id="new-card-properties">Properties</h3>
            </div>
            <span className="card-create-count">{selectedTemplate.propertyDefinitions.length} fields</span>
          </div>
          <div className="card-create-property-list">
            {selectedTemplate.propertyDefinitions.map((definition) => (
              <label key={definition.id}>
                <span>
                  {definition.label}
                  {definition.required && <small>Required</small>}
                </span>
                {definition.kind === "reference" ? (
                  <select
                    value={propertyValues[definition.id] ?? ""}
                    onChange={(event) => setPropertyValues((current) => ({
                      ...current,
                      [definition.id]: event.target.value
                    }))}
                    required={definition.required}
                    disabled={busy}
                  >
                    <option value="">Choose a linked record</option>
                    {world.documents.map((document) => (
                      <option value={document.id} key={document.id}>
                        {document.name} · {document.entityType}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={propertyValues[definition.id] ?? ""}
                    onChange={(event) => setPropertyValues((current) => ({
                      ...current,
                      [definition.id]: event.target.value
                    }))}
                    required={definition.required}
                    placeholder={"Add " + definition.label.toLowerCase()}
                    disabled={busy}
                  />
                )}
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="card-editor-section" aria-labelledby="new-card-body">
        <div className="card-editor-section-heading">
          <div>
            <span className="eyebrow">STARTER SECTIONS</span>
            <h3 id="new-card-body">Body</h3>
          </div>
          <button
            className="editor-secondary-button"
            type="button"
            onClick={() => setBlocks((current) => [
              ...current,
              { id: "section-" + crypto.randomUUID(), label: "New section", text: "" }
            ])}
            disabled={busy}
          >+ Add section</button>
        </div>
        {blocks.length === 0 && <p className="card-editor-empty">No starter sections. Add one when you're ready.</p>}
        <div className="card-editor-block-list">
          {blocks.map((block, index) => (
            <section className="card-editor-block" key={block.id}>
              <div className="card-editor-block-heading">
                <span>{block.label.toUpperCase()} <strong>{String(index + 1).padStart(2, "0")}</strong></span>
                <div>
                  <button
                    className="editor-icon-button danger"
                    type="button"
                    onClick={() => setBlocks((current) => current.filter((item) => item.id !== block.id))}
                    disabled={busy}
                    aria-label={"Remove " + block.label}
                    title="Remove section"
                  >×</button>
                </div>
              </div>
              <textarea
                value={block.text}
                onChange={(event) => setBlocks((current) => current.map((item) =>
                  item.id === block.id ? { ...item, text: event.target.value } : item
                ))}
                rows={4}
                placeholder={"Write the " + block.label.toLowerCase() + "…"}
                aria-label={block.label}
                disabled={busy}
              />
            </section>
          ))}
        </div>
      </section>

      {!cardTypeAvailable && (
        <p className="auth-error" role="alert">Cards are not enabled for this world.</p>
      )}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="card-edit-actions">
        {onCancel && <button className="text-link" type="button" onClick={onCancel} disabled={busy}>Cancel</button>}
        <button
          className="auth-submit"
          type="submit"
          disabled={busy || !cardTypeAvailable || !selectedTemplate}
        >{busy ? "Creating…" : "Create card"} <span aria-hidden="true">↗</span></button>
      </div>
    </form>
  );
}
