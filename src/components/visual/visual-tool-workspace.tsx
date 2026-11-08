"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { CardDocument, CardMediaAsset, Era } from "@/domain/world";
import {
  cardLabel,
  createVisualToolData,
  type CanvasData,
  type MapData,
  type RelationTreeData,
  type TimelineData,
  type VisualToolData,
  type VisualToolDocument,
  type VisualToolKind
} from "@/domain/visual-tools";

type Props = {
  worldSlug: string;
  worldName: string;
  activeEraId: string;
  eras: Era[];
  cards: CardDocument[];
  media: CardMediaAsset[];
  kind: VisualToolKind;
  initialDocuments: VisualToolDocument[];
  interactive: boolean;
};

const titles: Record<VisualToolKind, string> = {
  map: "Maps",
  relation_tree: "Relation Trees",
  canvas: "Canvas",
  timeline: "Timeline"
};

function makeId(prefix: string): string {
  return prefix + "-" + (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2));
}

function requestUrl(slug: string, kind: VisualToolKind, id?: string): string {
  return "/api/v1/worlds/" + encodeURIComponent(slug) + "/visual-tools/" + kind
    + (id ? "/" + encodeURIComponent(id) : "");
}

export function VisualToolWorkspace({
  worldSlug, worldName, activeEraId, eras, cards, media, kind, initialDocuments, interactive
}: Props) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedId, setSelectedId] = useState(initialDocuments[0]?.id ?? "");
  const selected = documents.find((item) => item.id === selectedId);
  const [name, setName] = useState(selected?.name ?? "Untitled " + titles[kind].slice(0, -1));
  const [data, setData] = useState<VisualToolData>(selected?.data ?? createVisualToolData(kind));
  const [selectedCardId, setSelectedCardId] = useState("");
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventYear, setEventYear] = useState("1");
  const [eventMonth, setEventMonth] = useState("1");
  const [eventDay, setEventDay] = useState("1");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const selectedCard = cards.find((card) => card.id === selectedCardId);
  const events = useMemo(() => kind === "timeline"
    ? [...(data as TimelineData).events].sort((a, b) => a.year - b.year || a.month - b.month || a.day - b.day)
    : [], [data, kind]);

  function openDocument(id: string) {
    const next = documents.find((item) => item.id === id);
    if (!next) return;
    setSelectedId(id);
    setName(next.name);
    setData(next.data);
    setState("idle");
    setError("");
  }

  function newDocument() {
    setSelectedId("");
    setName("Untitled " + (kind === "relation_tree" ? "relations" : kind));
    setData(createVisualToolData(kind));
    setState("idle");
    setError("");
  }

  async function save() {
    if (!interactive) return;
    setState("saving");
    setError("");
    try {
      const existing = documents.find((item) => item.id === selectedId);
      const response = await fetch(requestUrl(worldSlug, kind, existing?.id), {
        method: existing ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(existing
          ? { expectedVersion: existing.version, name, data }
          : { eraId: activeEraId, name, data })
      });
      const result = await response.json() as VisualToolDocument | { error?: string };
      if (!response.ok) throw new Error("error" in result && result.error ? result.error : "Could not save this visual document.");
      const saved = result as VisualToolDocument;
      setDocuments((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setSelectedId(saved.id);
      setName(saved.name);
      setData(saved.data);
      setState("saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this visual document.");
      setState("error");
    }
  }

  function patchData(update: (current: VisualToolData) => VisualToolData) {
    setData((current) => update(current));
    setState("idle");
  }

  function addMapPin() {
    patchData((current) => {
      const map = current as MapData;
      const pinIndex = map.pins.length;
      return { ...map, pins: [...map.pins, {
        id: makeId("pin"),
        label: selectedCard?.name ?? "New location",
        x: Math.min(0.88, 0.22 + (pinIndex % 4) * 0.18),
        y: Math.min(0.82, 0.25 + Math.floor(pinIndex / 4) * 0.18),
        ...(selectedCard ? { cardId: selectedCard.id } : {})
      }] };
    });
  }

  function addMapRegion() {
    patchData((current) => {
      const map = current as MapData;
      const offset = (map.regions.length % 4) * 0.05;
      return { ...map, regions: [...map.regions, {
        id: makeId("region"),
        name: "New region",
        points: [
          { x: 0.18 + offset, y: 0.2 }, { x: 0.43 + offset, y: 0.18 },
          { x: 0.47 + offset, y: 0.47 }, { x: 0.22 + offset, y: 0.5 }
        ],
        ...(selectedCard ? { cardId: selectedCard.id } : {})
      }] };
    });
  }

  function addRelationNode() {
    patchData((current) => {
      const tree = current as RelationTreeData;
      const index = tree.nodes.length;
      return { ...tree, nodes: [...tree.nodes, {
        id: makeId("node"),
        label: selectedCard?.name ?? "New node",
        x: Math.min(0.86, 0.18 + (index % 3) * 0.3),
        y: Math.min(0.82, 0.25 + Math.floor(index / 3) * 0.22),
        ...(selectedCard ? { cardId: selectedCard.id } : {})
      }] };
    });
  }

  function addRelationEdge() {
    const nodes = (data as RelationTreeData).nodes;
    if (nodes.length < 2) {
      setError("Add at least two nodes before connecting them.");
      setState("error");
      return;
    }
    patchData((current) => {
      const tree = current as RelationTreeData;
      const source = tree.nodes[tree.nodes.length - 2];
      const target = tree.nodes[tree.nodes.length - 1];
      return { ...tree, edges: [...tree.edges, {
        id: makeId("edge"), source: source.id, target: target.id,
        relationType: "connected_to", label: "Connection"
      }] };
    });
  }

  function addCanvasImage() {
    if (!selectedMediaId) {
      setError("Choose a ready Gallery image before placing it on the Canvas.");
      setState("error");
      return;
    }
    patchData((current) => {
      const canvas = current as CanvasData;
      const index = canvas.objects.length;
      return { ...canvas, objects: [...canvas.objects, {
        id: makeId("image"),
        kind: "image",
        x: 0.08 + (index % 3) * 0.29,
        y: 0.12 + Math.floor(index / 3) * 0.27,
        width: 0.25,
        height: 0.18,
        mediaId: selectedMediaId
      }] };
    });
  }

  function addCanvasObject(kindToAdd: "card" | "text") {
    patchData((current) => {
      const canvas = current as CanvasData;
      const index = canvas.objects.length;
      return { ...canvas, objects: [...canvas.objects, {
        id: makeId("object"),
        kind: kindToAdd,
        x: 0.08 + (index % 3) * 0.29,
        y: 0.12 + Math.floor(index / 3) * 0.27,
        width: 0.25,
        height: 0.18,
        ...(kindToAdd === "card" && selectedCard ? { cardId: selectedCard.id } : {}),
        ...(kindToAdd === "text" ? { text: "Add a thought…" } : {})
      }] };
    });
  }

  function addTimelineEvent() {
    const timeline = data as TimelineData;
    const month = Number(eventMonth);
    const day = Number(eventDay);
    const year = Number(eventYear);
    const title = eventTitle.trim();
    const monthData = timeline.calendar.months[month - 1];
    if (!title || !Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)
      || !monthData || day < 1 || day > monthData.days) {
      setError("Enter an event title and a valid date in this world's calendar.");
      setState("error");
      return;
    }
    patchData((current) => {
      const calendar = current as TimelineData;
      return { ...calendar, events: [...calendar.events, {
        id: makeId("event"), title, year, month, day,
        ...(selectedCard ? { cardId: selectedCard.id } : {})
      }] };
    });
    setEventTitle("");
  }

  const map = kind === "map" ? data as MapData : null;
  const tree = kind === "relation_tree" ? data as RelationTreeData : null;
  const canvas = kind === "canvas" ? data as CanvasData : null;
  const timeline = kind === "timeline" ? data as TimelineData : null;

  return <section className="visual-tool-page">
    <div className="visual-tool-topline">
      <div>
        <span className="eyebrow">{worldName} / {titles[kind].toUpperCase()}</span>
        <h1>{titles[kind]}</h1>
        <p>One world model. A dedicated space for every way of thinking.</p>
      </div>
      <div className="visual-tool-actions">
        <label className="visual-era-select"><span className="eyebrow">ERA</span><select value={activeEraId} onChange={(event) => {
          const url = new URL(window.location.href);
          url.searchParams.set("era", event.target.value);
          window.location.assign(url.toString());
        }} aria-label="Active era">{eras.map((era) => <option key={era.id} value={era.id}>{era.name}{era.isDefault ? " · Prime" : ""}</option>)}</select></label>
        <span className={"visual-tool-save-state state-" + state}>
          {state === "saving" ? "Saving" : state === "saved" ? "Saved" : state === "error" ? "Needs attention" : selected ? "Version " + selected.version : "New document"}
        </span>
        <button type="button" className="toolbar-button" onClick={newDocument} disabled={!interactive}><Icon name="plus" size={14} />New</button>
        <button type="button" className="auth-submit visual-tool-save" onClick={save} disabled={!interactive || state === "saving" || !name.trim()}>
          {state === "saving" ? "Saving…" : "Save"}
        </button>
      </div>
    </div>

    <nav className="visual-tool-switcher" aria-label="Visual tools">
      {(["map", "relation_tree", "canvas", "timeline"] as VisualToolKind[]).map((tool) => (
        <Link className={tool === kind ? "active" : ""} href={"/worlds/" + encodeURIComponent(worldSlug) + "/tools/" + tool} key={tool}>
          {tool === "relation_tree" ? "Relation Trees" : titles[tool]}
        </Link>
      ))}
    </nav>

    <div className="visual-tool-layout">
      <aside className="visual-tool-library">
        <div className="visual-tool-panel-heading"><span className="eyebrow">THIS ERA</span><span>{documents.length.toString().padStart(2, "0")}</span></div>
        {documents.map((item) => (
          <button className={"visual-tool-document-choice" + (item.id === selectedId ? " active" : "")} type="button" key={item.id} onClick={() => openDocument(item.id)}>
            <span>{item.name}</span><small>v{item.version}</small>
          </button>
        ))}
        {documents.length === 0 && <p className="visual-tool-empty">Nothing here yet.</p>}
      </aside>

      <main className="visual-tool-stage">
        <div className="visual-tool-toolbar">
          <label className="visual-tool-name">Document name<input value={name} onChange={(event) => { setName(event.target.value); setState("idle"); }} maxLength={120} /></label>
          <label className="visual-tool-link-picker"><span>Link a world card</span><select value={selectedCardId} onChange={(event) => setSelectedCardId(event.target.value)}><option value="">No linked card</option>{cards.map((card) => <option key={card.id} value={card.id}>{cardLabel(card)}</option>)}</select></label>
          <label className="visual-tool-link-picker"><span>Gallery image</span><select value={selectedMediaId} onChange={(event) => setSelectedMediaId(event.target.value)}><option value="">No image selected</option>{media.filter((asset) => asset.contentType.startsWith("image/")).map((asset) => <option key={asset.id} value={asset.id}>{asset.fileName}</option>)}</select></label>
        </div>

        {map && <div className="tool-editor tool-map-editor">
          <div className="tool-editor-heading"><div><span className="eyebrow">SPATIAL EDITOR</span><h2>Map surface</h2></div><div className="tool-action-row"><button className="toolbar-button" type="button" onClick={addMapRegion} disabled={!interactive}>Add region</button><button className="toolbar-button" type="button" onClick={addMapPin} disabled={!interactive}>Add pin</button></div><label className="map-background-select"><span>Background</span><select value={map.backgroundMediaId ?? ""} onChange={(event) => patchData((current) => ({ ...(current as MapData), backgroundMediaId: event.target.value || undefined }))} disabled={!interactive}><option value="">Grid</option>{media.filter((asset) => asset.contentType.startsWith("image/")).map((asset) => <option value={asset.id} key={asset.id}>{asset.fileName}</option>)}</select></label></div>
          <svg className="map-artboard" viewBox="0 0 1000 620" role="img" aria-label="Map canvas with editable region and pin records">
            <defs><pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="currentColor" strokeOpacity=".11" strokeWidth="1" /></pattern></defs>
            <rect width="1000" height="620" fill="#eff1e9" />
            {map.backgroundMediaId && <image href={"/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/media/" + encodeURIComponent(map.backgroundMediaId) + "/download"} x="0" y="0" width="1000" height="620" preserveAspectRatio="xMidYMid slice" />}
            <rect width="1000" height="620" fill="url(#map-grid)" opacity=".38" />
            {map.regions.map((region) => <g key={region.id}><polygon points={region.points.map((point) => (point.x * 1000) + "," + (point.y * 620)).join(" ")} /><text x={region.points.reduce((sum, point) => sum + point.x * 1000, 0) / region.points.length} y={region.points.reduce((sum, point) => sum + point.y * 620, 0) / region.points.length}>{region.name}</text></g>)}
            {map.pins.map((pin) => <g key={pin.id}><circle cx={pin.x * 1000} cy={pin.y * 620} r="9" /><circle cx={pin.x * 1000} cy={pin.y * 620} r="3" /><text x={pin.x * 1000 + 16} y={pin.y * 620 - 12}>{pin.label}</text></g>)}
          </svg>
          <div className="visual-tool-footer"><span>{map.layers.length} layers</span><span>{map.regions.length} regions</span><span>{map.pins.length} pins</span><span>{map.width} × {map.height}</span></div>
          <div className="visual-tool-item-list">
            {map.pins.map((pin) => <label key={pin.id}><span>Pin</span><input value={pin.label} onChange={(event) => patchData((current) => ({ ...(current as MapData), pins: (current as MapData).pins.map((item) => item.id === pin.id ? { ...item, label: event.target.value } : item) }))} disabled={!interactive} /></label>)}
          </div>
        </div>}

        {tree && <div className="tool-editor">
          <div className="tool-editor-heading"><div><span className="eyebrow">RELATION MODEL</span><h2>Explicit relationships</h2></div><div className="tool-action-row"><button className="toolbar-button" type="button" onClick={addRelationNode} disabled={!interactive}>Add node</button><button className="toolbar-button" type="button" onClick={addRelationEdge} disabled={!interactive}>Connect last two</button></div></div>
          <svg className="relation-artboard" viewBox="0 0 1000 600" role="img" aria-label="Relation tree nodes and typed edges">
            {tree.edges.map((edge) => {
              const source = tree.nodes.find((node) => node.id === edge.source);
              const target = tree.nodes.find((node) => node.id === edge.target);
              return source && target ? <g key={edge.id}><line x1={source.x * 1000} y1={source.y * 600} x2={target.x * 1000} y2={target.y * 600} /><text x={(source.x + target.x) * 500} y={(source.y + target.y) * 300 - 12}>{edge.label ?? edge.relationType}</text></g> : null;
            })}
            {tree.nodes.map((node) => <g key={node.id}><rect x={node.x * 1000 - 82} y={node.y * 600 - 28} width="164" height="56" rx="12" /><text x={node.x * 1000} y={node.y * 600 + 4}>{node.label}</text></g>)}
          </svg>
          <div className="visual-tool-footer"><span>{tree.nodes.length} nodes</span><span>{tree.edges.length} typed relationships</span><span>{tree.variants.length} variants</span></div>
          <div className="visual-tool-item-list">
            {tree.nodes.map((node) => <label key={node.id}><span>Node</span><input value={node.label} onChange={(event) => patchData((current) => ({ ...(current as RelationTreeData), nodes: (current as RelationTreeData).nodes.map((item) => item.id === node.id ? { ...item, label: event.target.value } : item) }))} disabled={!interactive} /></label>)}
          </div>
        </div>}

        {canvas && <div className="tool-editor">
          <div className="tool-editor-heading"><div><span className="eyebrow">FREEFORM WORKSPACE</span><h2>Canvas</h2></div><div className="tool-action-row"><button className="toolbar-button" type="button" onClick={() => addCanvasObject("card")} disabled={!interactive}>Place card</button><button className="toolbar-button" type="button" onClick={() => addCanvasObject("text")} disabled={!interactive}>Add note</button><button className="toolbar-button" type="button" onClick={addCanvasImage} disabled={!interactive || !selectedMediaId}>Place image</button></div></div>
          <div className="canvas-artboard">
            {canvas.objects.map((object) => <div className={"canvas-object kind-" + object.kind} key={object.id} style={{ left: (object.x * 100) + "%", top: (object.y * 100) + "%", width: (object.width * 100) + "%", minHeight: (object.height * 100) + "%" }}>
              <small>{object.kind === "card" ? cards.find((card) => card.id === object.cardId)?.name ?? "Unlinked card" : object.kind === "text" ? "NOTE" : object.kind.toUpperCase()}</small>
              {object.kind === "text" ? <textarea value={object.text ?? ""} onChange={(event) => patchData((current) => ({ ...(current as CanvasData), objects: (current as CanvasData).objects.map((item) => item.id === object.id ? { ...item, text: event.target.value } : item) }))} disabled={!interactive} aria-label="Canvas note" /> : object.kind === "image" ? <>{(() => { const asset = media.find((item) => item.id === object.mediaId); return asset ? <Image src={"/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/media/" + encodeURIComponent(asset.id) + "/download"} alt={asset.fileName} fill sizes="(max-width: 620px) 45vw, 220px" unoptimized /> : <strong>Missing Gallery asset</strong>; })()}</> : <strong>{object.kind === "card" ? cards.find((card) => card.id === object.cardId)?.name ?? "Card" : "Canvas object"}</strong>}
            </div>)}
            {canvas.objects.length === 0 && <span className="canvas-empty-note">Place a card or add a note to start.</span>}
          </div>
          <div className="visual-tool-footer"><span>{canvas.objects.length} objects</span><span>{canvas.strokes.length} drawing strokes</span><span>Normalised workspace coordinates</span></div>
        </div>}

        {timeline && <div className="tool-editor">
          <div className="tool-editor-heading"><div><span className="eyebrow">CALENDAR MODEL</span><h2>{timeline.calendar.name}</h2></div><span className="timeline-count">{timeline.events.length} events</span></div>
          <div className="timeline-calendar">
            {timeline.calendar.months.map((month, index) => <div key={month.name}><strong>{(index + 1).toString().padStart(2, "0")}</strong><span>{month.name}</span><small>{month.days} days</small></div>)}
          </div>
          <div className="timeline-add-event">
            <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="Event title" aria-label="Event title" disabled={!interactive} />
            <input type="number" value={eventYear} onChange={(event) => setEventYear(event.target.value)} aria-label="Year" disabled={!interactive} />
            <select value={eventMonth} onChange={(event) => setEventMonth(event.target.value)} aria-label="Month" disabled={!interactive}>{timeline.calendar.months.map((month, index) => <option key={month.name} value={index + 1}>{month.name}</option>)}</select>
            <input type="number" value={eventDay} onChange={(event) => setEventDay(event.target.value)} aria-label="Day" disabled={!interactive} />
            <button type="button" className="toolbar-button" onClick={addTimelineEvent} disabled={!interactive}>Add event</button>
          </div>
          <div className="timeline-events">
            {events.map((event) => <article key={event.id}><span className="timeline-event-date">{event.year} / {event.month} / {event.day}</span><div><strong>{event.title}</strong><small>{timeline.calendar.months[event.month - 1]?.name ?? "Unknown month"}</small></div></article>)}
            {events.length === 0 && <p className="visual-tool-empty">No events on this timeline yet.</p>}
          </div>
        </div>}
      </main>
    </div>

    {error && <p className="visual-tool-error" role="alert">{error}</p>}
    <p className="visual-tool-disclaimer">{interactive ? "Changes are saved to this world and era when confirmed by the server." : "Preview mode · connect the Rust API to save visual documents."}</p>
  </section>;
}
