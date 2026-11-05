"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { WorldGraph } from "@/components/visual/world-graph";
import { resolveCardReference, type CardDocument, type World } from "@/domain/world";

type Props = { world: World; document: CardDocument };

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function href(world: World, id: string): string {
  return "/worlds/" + world.slug + "?doc=" + encodeURIComponent(id);
}

export function Workspace({ world, document }: Props) {
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [showGraph, setShowGraph] = useState(false);
  const [graphSelectedId, setGraphSelectedId] = useState(document.id);

  const visibleDocuments = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return world.documents;
    return world.documents.filter((item) => [item.name, ...item.aliases, item.entityType].join(" ").toLocaleLowerCase().includes(needle));
  }, [search, world.documents]);

  const updated = new Date(document.updatedAt + "T12:00:00").toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });

  return <div className="workspace-shell">
    <aside className="app-rail" aria-label="Main navigation">
      <Link className="brand-mark" href="/" aria-label="Back to worlds">v</Link>
      <div className="rail-divider" />
      <Link className="rail-link" href="/" aria-label="Worlds" title="Worlds"><Icon name="globe" size={19} /></Link>
      <span className="rail-link active" aria-label="Documents" title="Documents"><Icon name="files" size={19} /></span>
      <span className="rail-spacer" />
      <span className="rail-link muted"><Icon name="spark" size={19} /></span>
      <span className="rail-avatar">V</span>
    </aside>

    <div className="workspace-main">
      <header className="workspace-topbar">
        <div className="topbar-breadcrumbs">
          <Link href="/">Worlds</Link><Icon name="chevron-right" size={13} />
          <span>{world.name}</span><Icon name="chevron-right" size={13} />
          <span className="breadcrumb-current">{showGraph ? "World graph" : "Editor"}</span>
        </div>
        <div className="topbar-actions">
          <span className="preview-pill"><span /> Preview environment</span>
          <button className="icon-button" type="button" onClick={() => setSidebarOpen((open) => !open)} aria-label={sidebarOpen ? "Collapse document sidebar" : "Open document sidebar"}><Icon name="panel-left" /></button>
          <button className={"toolbar-button graph-view-button" + (showGraph ? " is-active" : "")} type="button" onClick={() => { if (!showGraph) setGraphSelectedId(document.id); setShowGraph((active) => !active); }}><Icon name={showGraph ? "files" : "share-2"} size={15} />{showGraph ? "Editor" : "World graph"}</button>
          {!showGraph && <button className="icon-button inspector-toggle" type="button" onClick={() => setInspectorOpen((open) => !open)} aria-label={inspectorOpen ? "Hide details panel" : "Show details panel"}><Icon name="layers" /></button>}
        </div>
      </header>

      <div className={"workspace-columns" + (!sidebarOpen ? " sidebar-hidden" : "") + (!inspectorOpen ? " inspector-hidden" : "")}>
        {sidebarOpen && <aside className="document-sidebar">
          <div className="world-summary">
            <div className="world-monogram">SM</div>
            <div className="world-summary-copy"><span className="eyebrow">Current world</span><strong>{world.name}</strong></div>
            <button className="quiet-icon-button" type="button" aria-label="World options" title="Options are not enabled in preview"><Icon name="dots" /></button>
          </div>
          <div className="sidebar-section-heading"><span>Library</span><button className="quiet-icon-button" type="button" disabled aria-label="Create document"><Icon name="plus" size={15} /></button></div>
          <label className="search-field"><Icon name="search" size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a document" aria-label="Find a document" /></label>
          <div className="folder-label"><Icon name="chevron-down" size={13} /><span>WORLD RECORDS</span><span className="folder-count">{world.documents.length}</span></div>
          <nav className="document-list" aria-label="World documents">
            {visibleDocuments.map((item) => <Link className={"document-row" + (item.id === document.id ? " selected" : "")} href={href(world, item.id)} key={item.id} aria-current={item.id === document.id ? "page" : undefined}>
              <span className={"document-type-icon " + item.entityType}>{item.entityType === "character" ? "C" : item.entityType === "place" ? "P" : "F"}</span>
              <span className="document-row-copy"><strong>{item.name}</strong><small>{item.entityType}</small></span>
              {item.id === document.id && <span className="selected-indicator" />}
            </Link>)}
            {visibleDocuments.length === 0 && <p className="empty-search">No records match “{search}”.</p>}
          </nav>
          <div className="sidebar-footnote"><span className="status-dot" />Sample world · Read only</div>
        </aside>}

        <main className={"document-stage" + (showGraph ? " graph-document-stage" : "")}>
          {showGraph ? <WorldGraph world={world} selectedDocumentId={graphSelectedId} onSelectDocument={setGraphSelectedId} /> : <>
          <div className="document-toolbar">
            <div className="document-toolbar-left"><span className="toolbar-kind">CARD</span><span className="toolbar-separator">/</span><span className="toolbar-muted">{document.entityType}</span><span className="toolbar-separator">·</span><span className="toolbar-muted">Updated {updated}</span></div>
            <div className="document-toolbar-right"><button className="toolbar-button" type="button" disabled title="Editing will be wired to the document service">Edit</button><button className="icon-button" type="button" disabled aria-label="More document actions"><Icon name="dots" /></button></div>
          </div>
          <article className="card-document">
            <div className="card-heading">
              <div className={"entity-avatar " + document.entityType}>{initials(document.name)}</div>
              <div className="card-heading-copy"><div className="card-eyebrow">{document.entityType} <span>·</span> World record</div><h1>{document.name}</h1>
                {document.aliases.length > 0 && <div className="card-aliases">{document.aliases.map((alias) => <span key={alias}>{alias}</span>)}</div>}
              </div>
            </div>
            <div className="card-divider" />
            <div className="card-content">{document.blocks.map((block) => <p key={block.id}>{block.text}</p>)}</div>
            <div className="document-endmark"><span /><small>END OF RECORD</small><span /></div>
          </article>
          <div className="stage-footer"><span>One world. Shared records. Connected views.</span><span>VVD REIMAGINED · WORKSPACE PREVIEW</span></div>
          </>}
        </main>

        {inspectorOpen && !showGraph && <aside className="details-panel">
          <div className="details-panel-header"><div><span className="eyebrow">Document details</span><h2>Properties</h2></div><button className="quiet-icon-button" type="button" onClick={() => setInspectorOpen(false)} aria-label="Close details panel"><Icon name="close" size={16} /></button></div>
          <div className="property-list">{document.properties.map((property) => {
            const referenced = resolveCardReference(world, property);
            return <div className="property-row" key={property.id}>
              <span className="property-label">{property.label}</span>
              {property.kind === "reference" ? referenced ? <Link className="property-reference" href={href(world, referenced.id)}><span className={"reference-avatar " + referenced.entityType}>{initials(referenced.name)}</span><span>{referenced.name}</span><Icon name="chevron-right" size={14} /></Link> : <span className="property-unresolved">Unresolved reference</span> : <span className="property-value">{property.value}</span>}
            </div>;
          })}</div>
          <div className="details-separator" />
          <div className="details-meta"><span className="eyebrow">Record identity</span><dl>
            <div><dt>Document type</dt><dd>Card</dd></div><div><dt>Entity type</dt><dd>{document.entityType}</dd></div><div><dt>Aliases</dt><dd>{document.aliases.length}</dd></div><div><dt>Record ID</dt><dd className="record-id">{document.id}</dd></div>
          </dl></div>
          <div className="inspector-note"><Icon name="spark" size={15} /><p>References point to the same world record. They are not copied into this card.</p></div>
        </aside>}
      </div>
    </div>
  </div>;
}