"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CardEditForm } from "@/components/workspace/card-edit-form";
import { CardCreateForm } from "@/components/workspace/card-create-form";
import { DocumentLifecycleActions } from "@/components/workspace/document-lifecycle-actions";
import { FolderSidebar } from "@/components/workspace/folder-sidebar";
import { EraSwitcher } from "@/components/workspace/era-switcher";
import { CardMediaManager } from "@/components/workspace/card-media-manager";
import { WorldGraph } from "@/components/visual/world-graph";
import { resolveCardReference, type CardDocument, type World } from "@/domain/world";

type Props = { world: World; document: CardDocument | null; interactive: boolean };

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function href(world: World, id: string): string {
  return "/worlds/" + world.slug + "?doc=" + encodeURIComponent(id)
    + "&era=" + encodeURIComponent(world.activeEraId);
}

export function Workspace({ world, document, interactive }: Props) {
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [showGraph, setShowGraph] = useState(false);
  const [graphSelectedId, setGraphSelectedId] = useState(document?.id ?? "");
  const [creatingCard, setCreatingCard] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const visibleDocuments = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return world.documents.filter((item) => {
      const matchesFolder = !selectedFolderId || item.folderId === selectedFolderId;
      const matchesSearch = !needle || [item.name, ...item.aliases, item.entityType]
        .join(" ").toLocaleLowerCase().includes(needle);
      return matchesFolder && matchesSearch;
    });
  }, [search, selectedFolderId, world.documents]);

  const activeEra = world.eras.find((era) => era.id === world.activeEraId);
  const isPrimeEra = activeEra?.isDefault ?? true;
  const updated = document
    ? new Date(document.updatedAt + "T12:00:00").toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })
    : "";

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
          {interactive
            ? <span className="preview-pill"><span /> Connected workspace</span>
            : <span className="preview-pill"><span /> Preview environment</span>}
          <EraSwitcher world={world} interactive={interactive} documentId={document?.id} />
          <button className="icon-button" type="button" onClick={() => setSidebarOpen((open) => !open)} aria-label={sidebarOpen ? "Collapse document sidebar" : "Open document sidebar"}><Icon name="panel-left" /></button>
          <button className={"toolbar-button graph-view-button" + (showGraph ? " is-active" : "")} type="button" onClick={() => { if (!showGraph) setGraphSelectedId(document?.id ?? ""); setShowGraph((active) => !active); }}><Icon name={showGraph ? "files" : "share-2"} size={15} />{showGraph ? "Editor" : "World graph"}</button>
          {!showGraph && <button className="icon-button inspector-toggle" type="button" onClick={() => setInspectorOpen((open) => !open)} aria-label={inspectorOpen ? "Hide details panel" : "Show details panel"}><Icon name="layers" /></button>}
          {interactive && <Link className="account-link" href="/account/security">Security</Link>}
          {interactive && <SignOutButton />}
        </div>
      </header>

      <div className={"workspace-columns" + (!sidebarOpen ? " sidebar-hidden" : "") + (!inspectorOpen ? " inspector-hidden" : "")}>
        {sidebarOpen && <aside className="document-sidebar">
          <div className="world-summary">
            <div className="world-monogram">SM</div>
            <div className="world-summary-copy"><span className="eyebrow">Current world</span><strong>{world.name}</strong></div>
            <button className="quiet-icon-button" type="button" aria-label="World options" title="Options are not enabled in preview"><Icon name="dots" /></button>
          </div>
          <div className="sidebar-section-heading"><span>Library</span><button className="quiet-icon-button" type="button" disabled={!interactive || !isPrimeEra} onClick={() => { setEditing(false); setCreatingCard(true); }} aria-label="Create card" title={!interactive ? "Connect the API to create records" : isPrimeEra ? "Create a world record" : "New canonical records are created in Prime"}><Icon name="plus" size={15} /></button></div>
          <label className="search-field"><Icon name="search" size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a document" aria-label="Find a document" /></label>
          {interactive && isPrimeEra && <FolderSidebar key={document ? document.id + "-" + document.version : "no-document"} worldSlug={world.slug} document={document} selectedFolderId={selectedFolderId} onSelectFolder={setSelectedFolderId} />}
          <div className="folder-label"><Icon name="chevron-down" size={13} /><span>WORLD RECORDS</span><span className="folder-count">{world.documents.length}</span></div>
          <nav className="document-list" aria-label="World documents">
            {visibleDocuments.map((item) => <Link className={"document-row" + (item.id === (document?.id ?? "") ? " selected" : "")} href={href(world, item.id)} key={item.id} aria-current={item.id === (document?.id ?? "") ? "page" : undefined}>
              <span className={"document-type-icon " + item.entityType}>{item.entityType === "character" ? "C" : item.entityType === "place" ? "P" : "F"}</span>
              <span className="document-row-copy"><strong>{item.name}</strong><small>{item.entityType}</small></span>
              {item.id === (document?.id ?? "") && <span className="selected-indicator" />}
            </Link>)}
            {visibleDocuments.length === 0 && <p className="empty-search">No records match “{search}”.</p>}
          </nav>
          {interactive && (
            <>
              <Link className="archive-shortcut" href={"/worlds/" + world.slug + "/media"}><Icon name="files" size={14} />Private Gallery</Link>
              {isPrimeEra && <Link className="archive-shortcut" href={"/worlds/" + world.slug + "/templates"}><Icon name="layers" size={14} />Card templates</Link>}
              {isPrimeEra && <Link className="archive-shortcut" href={"/worlds/" + world.slug + "/archive"}><Icon name="archive" size={14} />Archived records</Link>}
            </>
          )}
          <div className="sidebar-footnote"><span className="status-dot" />{interactive ? "Connected · server-backed" : "Sample world · Read only"}</div>
        </aside>}

        <main className={"document-stage" + (showGraph ? " graph-document-stage" : "")}>
          {showGraph ? <WorldGraph key={world.id} world={world} selectedDocumentId={graphSelectedId} onSelectDocument={setGraphSelectedId} /> : creatingCard || (!document && isPrimeEra) ? <CardCreateForm world={world} onCancel={document ? () => setCreatingCard(false) : undefined} /> : !document ? <div className="era-empty-state"><span className="eyebrow">EMPTY ERA</span><h2>No records to show yet.</h2><p>Switch to Prime to create the world’s canonical records, then return here to branch their histories.</p></div> : editing ? <CardEditForm world={world} document={document} onCancel={() => setEditing(false)} /> : <>
          <div className="document-toolbar">
            <div className="document-toolbar-left"><span className="toolbar-kind">CARD</span><span className="toolbar-separator">/</span><span className="toolbar-muted">{document.entityType}</span><span className="toolbar-separator">·</span><span className="toolbar-muted">Updated {updated}</span></div>
            <div className="document-toolbar-right">
              <button className="toolbar-button" type="button" disabled={!interactive} onClick={() => setEditing(true)} title={interactive ? "Edit this card" : "Editing is unavailable in the read-only preview"}>Edit</button>
              {interactive && isPrimeEra && <DocumentLifecycleActions worldSlug={world.slug} documentId={document.id} expectedVersion={document.version} />}
              <button className="icon-button" type="button" disabled aria-label="More document actions"><Icon name="dots" /></button>
            </div>
          </div>
          <article className="card-document">
            <div className="card-heading">
              <div className={"entity-avatar " + document.entityType}>{initials(document.name)}</div>
              <div className="card-heading-copy"><div className="card-eyebrow">{document.entityType} <span>·</span> World record</div><h1>{document.name}</h1>
                {document.aliases.length > 0 && <div className="card-aliases">{document.aliases.map((alias) => <span key={alias}>{alias}</span>)}</div>}
              </div>
            </div>
            <div className="card-divider" />
            {document.media?.some((asset) => asset.contentType.startsWith("image/")) && (
              <div className="card-media-inline">
                {document.media.filter((asset) => asset.contentType.startsWith("image/")).map((asset) => (
                  <figure key={asset.id}>
                    <Image
                      src={"/api/v1/worlds/" + encodeURIComponent(world.slug) + "/media/" + encodeURIComponent(asset.id) + "/download"}
                      alt={asset.fileName}
                      width={1200}
                      height={800}
                      unoptimized
                    />
                    <figcaption>{asset.fileName}</figcaption>
                  </figure>
                ))}
              </div>
            )}
            <div className="card-content">{document.blocks.map((block) => <p key={block.id}>{block.text}</p>)}</div>
            <div className="document-endmark"><span /><small>END OF RECORD</small><span /></div>
          </article>
          <div className="stage-footer"><span>One world. Shared records. Connected views.</span><span>VVD REIMAGINED · WORKSPACE PREVIEW</span></div>
          </>}
        </main>

        {inspectorOpen && !showGraph && document && !creatingCard && <aside className="details-panel">
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
          {interactive && isPrimeEra && (
            <CardMediaManager
              worldSlug={world.slug}
              documentId={document.id}
              initialAssets={document.media ?? []}
            />
          )}
          <div className="inspector-note"><Icon name="spark" size={15} /><p>References point to the same world record. They are not copied into this card.</p></div>
        </aside>}
      </div>
    </div>
  </div>;
}