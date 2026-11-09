"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { CardDocument, CardMediaAsset, Era } from "@/domain/world";
import {
  cardLabel,
  createVisualToolData,
  type CanvasData,
  type CanvasObject,
  type MapData,
  type RelationTreeData,
  type TimelineData,
  type VisualToolData,
  type VisualToolDocument,
  type VisualToolKind
} from "@/domain/visual-tools";

type CanvasGesture = {
  id: string;
  pointerId: number;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  x: number;
  y: number;
  width: number;
  height: number;
  snapshot: CanvasData;
  recorded: boolean;
};

type MapGesture = {
  pointerId: number;
  kind: "pin" | "vertex";
  id: string;
  pointIndex?: number;
};

type RelationGesture = { pointerId: number; nodeId: string };

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
  const [relationType, setRelationType] = useState("connected_to");
  const [relationLabel, setRelationLabel] = useState("Connection");
  const [relationVariantName, setRelationVariantName] = useState("Wide layout");
  const [selectedRelationVariantId, setSelectedRelationVariantId] = useState("");
  const [selectedMapLayerId, setSelectedMapLayerId] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [selectedCanvasObjectId, setSelectedCanvasObjectId] = useState("");
  const [canvasUndo, setCanvasUndo] = useState<CanvasData[]>([]);
  const [canvasRedo, setCanvasRedo] = useState<CanvasData[]>([]);
  const canvasStageRef = useRef<HTMLDivElement | null>(null);
  const canvasGestureRef = useRef<CanvasGesture | null>(null);
  const canvasNoteBeforeRef = useRef<CanvasData | null>(null);
  const mapStageRef = useRef<SVGSVGElement | null>(null);
  const mapGestureRef = useRef<MapGesture | null>(null);
  const relationStageRef = useRef<SVGSVGElement | null>(null);
  const relationGestureRef = useRef<RelationGesture | null>(null);

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
    setSelectedCanvasObjectId("");
    setSelectedMapLayerId("");
    setSelectedRelationVariantId("");
    setCanvasUndo([]);
    setCanvasRedo([]);
    canvasGestureRef.current = null;
    canvasNoteBeforeRef.current = null;
    mapGestureRef.current = null;
    relationGestureRef.current = null;
    setState("idle");
    setError("");
  }

  function newDocument() {
    setSelectedId("");
    setName("Untitled " + (kind === "relation_tree" ? "relations" : kind));
    setData(createVisualToolData(kind));
    setSelectedCanvasObjectId("");
    setSelectedMapLayerId("");
    setSelectedRelationVariantId("");
    setCanvasUndo([]);
    setCanvasRedo([]);
    canvasGestureRef.current = null;
    canvasNoteBeforeRef.current = null;
    mapGestureRef.current = null;
    relationGestureRef.current = null;
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

  function startMapGesture(
    event: ReactPointerEvent<SVGGElement>,
    gesture: Omit<MapGesture, "pointerId">,
    locked: boolean
  ) {
    if (!interactive || locked || event.button !== 0 || !mapStageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    mapStageRef.current.setPointerCapture(event.pointerId);
    mapGestureRef.current = { ...gesture, pointerId: event.pointerId };
  }

  function updateMapGesture(event: ReactPointerEvent<SVGSVGElement>) {
    const gesture = mapGestureRef.current;
    const stage = mapStageRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || !stage) return;
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    setData((current) => {
      const map = current as MapData;
      if (gesture.kind === "pin") {
        return {
          ...map,
          pins: map.pins.map((pin) => pin.id === gesture.id ? { ...pin, x, y } : pin)
        };
      }
      return {
        ...map,
        regions: map.regions.map((region) => region.id === gesture.id
          ? {
              ...region,
              points: region.points.map((point, index) =>
                index === gesture.pointIndex ? { x, y } : point
              )
            }
          : region)
      };
    });
    setState("idle");
  }

  function finishMapGesture(event: ReactPointerEvent<SVGSVGElement>) {
    if (mapGestureRef.current?.pointerId === event.pointerId) mapGestureRef.current = null;
  }

  function addMapLayer() {
    const id = makeId("layer");
    patchData((current) => {
      const map = current as MapData;
      if (map.layers.length >= 100) return map;
      return { ...map, layers: [...map.layers, { id, name: "New layer", opacity: 1, visible: true, locked: false }] };
    });
    setSelectedMapLayerId(id);
  }

  function removeMapLayer(id: string) {
    const map = data as MapData;
    if (map.layers.length <= 1) {
      setError("A map must keep at least one layer.");
      setState("error");
      return;
    }
    if (map.regions.some((region) => region.layerId === id) || map.pins.some((pin) => pin.layerId === id)) {
      setError("Move this layer's regions and pins before removing it.");
      setState("error");
      return;
    }
    const nextLayer = map.layers.find((layer) => layer.id !== id);
    patchData((current) => ({ ...(current as MapData), layers: (current as MapData).layers.filter((layer) => layer.id !== id) }));
    if (selectedMapLayerId === id) setSelectedMapLayerId(nextLayer?.id ?? "");
  }

  function updateMapLayer(id: string, update: Partial<MapData["layers"][number]>) {
    patchData((current) => ({
      ...(current as MapData),
      layers: (current as MapData).layers.map((layer) => layer.id === id ? { ...layer, ...update } : layer)
    }));
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
        ...(selectedCard ? { cardId: selectedCard.id } : {}),
        layerId: selectedMapLayerId || map.layers[0]?.id
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
        ...(selectedCard ? { cardId: selectedCard.id } : {}),
        layerId: selectedMapLayerId || map.layers[0]?.id
      }] };
    });
  }

  function startRelationGesture(event: ReactPointerEvent<SVGGElement>, nodeId: string) {
    if (!interactive || event.button !== 0 || !relationStageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    relationStageRef.current.setPointerCapture(event.pointerId);
    relationGestureRef.current = { pointerId: event.pointerId, nodeId };
    setSelectedRelationVariantId("");
  }

  function updateRelationGesture(event: ReactPointerEvent<SVGSVGElement>) {
    const gesture = relationGestureRef.current;
    const stage = relationStageRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || !stage) return;
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    setData((current) => ({
      ...(current as RelationTreeData),
      nodes: (current as RelationTreeData).nodes.map((node) =>
        node.id === gesture.nodeId ? { ...node, x, y } : node
      )
    }));
    setState("idle");
  }

  function finishRelationGesture(event: ReactPointerEvent<SVGSVGElement>) {
    if (relationGestureRef.current?.pointerId === event.pointerId) relationGestureRef.current = null;
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
    if (!relationType.trim()) {
      setError("Give this relationship a type before connecting the nodes.");
      setState("error");
      return;
    }
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
        relationType: relationType.trim(), label: relationLabel.trim() || relationType.trim()
      }] };
    });
  }

  function saveRelationVariant() {
    const tree = data as RelationTreeData;
    if (tree.nodes.length === 0) {
      setError("Add at least one node before saving a layout variant.");
      setState("error");
      return;
    }
    const variant = {
      id: makeId("variant"),
      name: relationVariantName.trim() || "Layout " + (tree.variants.length + 1),
      positions: tree.nodes.map((node) => ({ nodeId: node.id, x: node.x, y: node.y }))
    };
    patchData((current) => ({ ...(current as RelationTreeData), variants: [...(current as RelationTreeData).variants, variant] }));
    setSelectedRelationVariantId(variant.id);
  }

  function applyRelationVariant(id: string) {
    const tree = data as RelationTreeData;
    const variant = tree.variants.find((item) => item.id === id);
    if (!variant) {
      setSelectedRelationVariantId("");
      return;
    }
    setData({
      ...tree,
      nodes: tree.nodes.map((node) => {
        const position = (variant.positions ?? []).find((item) => item.nodeId === node.id);
        return position ? { ...node, x: position.x, y: position.y } : node;
      })
    });
    setSelectedRelationVariantId(id);
    setState("idle");
  }

  function rememberCanvas(snapshot: CanvasData) {
    setCanvasUndo((history) => [...history.slice(-39), snapshot]);
    setCanvasRedo([]);
  }

  function undoCanvas() {
    const previous = canvasUndo[canvasUndo.length - 1];
    if (!previous || !canvas) return;
    setCanvasRedo((history) => [...history.slice(-39), canvas]);
    setCanvasUndo((history) => history.slice(0, -1));
    setData(previous);
    setSelectedCanvasObjectId("");
    setState("idle");
  }

  function redoCanvas() {
    const next = canvasRedo[canvasRedo.length - 1];
    if (!next || !canvas) return;
    setCanvasUndo((history) => [...history.slice(-39), canvas]);
    setCanvasRedo((history) => history.slice(0, -1));
    setData(next);
    setSelectedCanvasObjectId("");
    setState("idle");
  }

  function deleteCanvasObject() {
    if (!canvas || !selectedCanvasObjectId) return;
    rememberCanvas(canvas);
    setData({ ...canvas, objects: canvas.objects.filter((item) => item.id !== selectedCanvasObjectId) });
    setSelectedCanvasObjectId("");
    setState("idle");
  }

  function startCanvasGesture(event: ReactPointerEvent<HTMLDivElement>, object: CanvasObject) {
    if (!interactive || event.button !== 0) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("textarea,button,input")) return;
    const snapshot = data as CanvasData;
    const board = canvasStageRef.current;
    if (!board || !snapshot.objects.some((item) => item.id === object.id)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedCanvasObjectId(object.id);
    canvasGestureRef.current = {
      id: object.id,
      pointerId: event.pointerId,
      mode: target instanceof HTMLElement && target.closest("[data-resize-handle]") ? "resize" : "move",
      startX: event.clientX,
      startY: event.clientY,
      x: object.x,
      y: object.y,
      width: object.width,
      height: object.height,
      snapshot,
      recorded: false
    };
  }

  function updateCanvasGesture(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = canvasGestureRef.current;
    const board = canvasStageRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || !board) return;
    const bounds = board.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const dx = (event.clientX - gesture.startX) / bounds.width;
    const dy = (event.clientY - gesture.startY) / bounds.height;
    if (dx === 0 && dy === 0) return;
    if (!gesture.recorded) {
      rememberCanvas(gesture.snapshot);
      gesture.recorded = true;
    }
    setData((current) => {
      const value = current as CanvasData;
      return {
        ...value,
        objects: value.objects.map((item) => {
          if (item.id !== gesture.id) return item;
          if (gesture.mode === "resize") {
            const width = Math.max(0.12, Math.min(1 - gesture.x, gesture.width + dx));
            const height = Math.max(0.12, Math.min(1 - gesture.y, gesture.height + dy));
            return { ...item, width, height };
          }
          return {
            ...item,
            x: Math.max(0, Math.min(1 - gesture.width, gesture.x + dx)),
            y: Math.max(0, Math.min(1 - gesture.height, gesture.y + dy))
          };
        })
      };
    });
    setState("idle");
  }

  function finishCanvasGesture(event: ReactPointerEvent<HTMLDivElement>) {
    if (canvasGestureRef.current?.pointerId === event.pointerId) canvasGestureRef.current = null;
  }

  function addCanvasImage() {
    if (!selectedMediaId) {
      setError("Choose a ready Gallery image before placing it on the Canvas.");
      setState("error");
      return;
    }
    const id = makeId("image");
    setSelectedCanvasObjectId(id);
    rememberCanvas(data as CanvasData);
    patchData((current) => {
      const canvas = current as CanvasData;
      const index = canvas.objects.length;
      return { ...canvas, objects: [...canvas.objects, {
        id,
        kind: "image",
        x: 0.08 + (index % 3) * 0.29,
        y: Math.min(0.78, 0.12 + Math.floor(index / 3) * 0.27),
        width: 0.25,
        height: 0.18,
        mediaId: selectedMediaId
      }] };
    });
  }

  function addCanvasObject(kindToAdd: "card" | "text") {
    const id = makeId("object");
    setSelectedCanvasObjectId(id);
    rememberCanvas(data as CanvasData);
    patchData((current) => {
      const canvas = current as CanvasData;
      const index = canvas.objects.length;
      return { ...canvas, objects: [...canvas.objects, {
        id,
        kind: kindToAdd,
        x: 0.08 + (index % 3) * 0.29,
        y: Math.min(0.78, 0.12 + Math.floor(index / 3) * 0.27),
        width: 0.25,
        height: 0.18,
        ...(kindToAdd === "card" && selectedCard ? { cardId: selectedCard.id } : {}),
        ...(kindToAdd === "text" ? { text: "Add a thought…" } : {})
      }] };
    });
  }

  function addTimelineWeekday() {
    const timeline = data as TimelineData;
    const weekdays = timeline.calendar.weekdays ?? [];
    if (weekdays.length >= 14) {
      setError("This calendar already has the maximum of 14 weekdays.");
      setState("error");
      return;
    }
    patchData((current) => {
      const value = current as TimelineData;
      const next = (value.calendar.weekdays ?? []).length + 1;
      return { ...value, calendar: { ...value.calendar, weekdays: [...(value.calendar.weekdays ?? []), "Day " + next] } };
    });
  }

  function removeTimelineWeekday(index: number) {
    patchData((current) => {
      const value = current as TimelineData;
      return { ...value, calendar: { ...value.calendar, weekdays: (value.calendar.weekdays ?? []).filter((_, weekdayIndex) => weekdayIndex !== index) } };
    });
  }

  function addTimelineMonth() {
    const current = data as TimelineData;
    if (current.calendar.months.length >= 24) {
      setError("This calendar already has the maximum of 24 months.");
      setState("error");
      return;
    }
    patchData((value) => {
      const timeline = value as TimelineData;
      const nextIndex = timeline.calendar.months.length + 1;
      return {
        ...timeline,
        calendar: {
          ...timeline.calendar,
          months: [...timeline.calendar.months, { name: "Month " + nextIndex, days: 30 }]
        }
      };
    });
  }

  function removeTimelineMonth(index: number) {
    const current = data as TimelineData;
    if (current.calendar.months.length <= 1) {
      setError("A calendar must keep at least one month.");
      setState("error");
      return;
    }
    const monthNumber = index + 1;
    if (current.events.some((event) => event.month === monthNumber)) {
      setError("Move or remove this month's events before removing the month.");
      setState("error");
      return;
    }
    patchData((value) => {
      const timeline = value as TimelineData;
      return {
        ...timeline,
        calendar: {
          ...timeline.calendar,
          months: timeline.calendar.months.filter((_, monthIndex) => monthIndex !== index)
        },
        events: timeline.events.map((event) => ({
          ...event,
          month: event.month > monthNumber ? event.month - 1 : event.month
        }))
      };
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
  const activeMapLayerId = map
    ? (map.layers.some((layer) => layer.id === selectedMapLayerId) ? selectedMapLayerId : map.layers[0]?.id ?? "")
    : "";
  const getMapLayer = (layerId?: string) => map?.layers.find((layer) => layer.id === layerId) ?? map?.layers[0];

  return <div className="workspace-shell visual-tool-shell">
    <aside className="app-rail" aria-label="Main navigation">
      <Link className="brand-mark" href="/" aria-label="Back to worlds">v</Link>
      <div className="rail-divider" />
      <Link className="rail-link" href="/" aria-label="Worlds" title="Worlds"><Icon name="globe" size={19} /></Link>
      <Link className="rail-link active" href={"/worlds/" + encodeURIComponent(worldSlug)} aria-label="Documents" title="Documents"><Icon name="files" size={19} /></Link>
      <span className="rail-spacer" />
      <span className="rail-link muted"><Icon name="spark" size={19} /></span>
      <span className="rail-avatar">V</span>
    </aside>
    <div className="workspace-main">
      <header className="workspace-topbar">
        <div className="topbar-breadcrumbs">
          <Link href="/">Worlds</Link><Icon name="chevron-right" size={13} />
          <Link href={"/worlds/" + encodeURIComponent(worldSlug)}>{worldName}</Link><Icon name="chevron-right" size={13} />
          <span className="breadcrumb-current">{titles[kind]}</span>
        </div>
        <div className="topbar-actions">
          <span className="preview-pill"><span />{interactive ? "Connected workspace" : "Preview environment"}</span>
          <Link className="toolbar-button" href={"/worlds/" + encodeURIComponent(worldSlug)}>Editor</Link>
          {interactive && <Link className="account-link" href="/account/security">Security</Link>}
          {interactive && <SignOutButton />}
        </div>
      </header>
      <section className="visual-tool-page">
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
          <div className="tool-editor-heading"><div><span className="eyebrow">SPATIAL EDITOR</span><h2>Map surface</h2></div><div className="tool-action-row"><button className="toolbar-button" type="button" onClick={addMapRegion} disabled={!interactive || (getMapLayer(activeMapLayerId)?.locked ?? false)}>Add region</button><button className="toolbar-button" type="button" onClick={addMapPin} disabled={!interactive || (getMapLayer(activeMapLayerId)?.locked ?? false)}>Add pin</button></div><label className="map-background-select"><span>Background</span><select value={map.backgroundMediaId ?? ""} onChange={(event) => patchData((current) => ({ ...(current as MapData), backgroundMediaId: event.target.value || undefined }))} disabled={!interactive}><option value="">Grid</option>{media.filter((asset) => asset.contentType.startsWith("image/")).map((asset) => <option value={asset.id} key={asset.id}>{asset.fileName}</option>)}</select></label></div>
          <svg
            className="map-artboard"
            viewBox="0 0 1000 620"
            role="img"
            aria-label="Map canvas with draggable region vertices and pins"
            ref={mapStageRef}
            onPointerMove={updateMapGesture}
            onPointerUp={finishMapGesture}
            onPointerCancel={finishMapGesture}
          >
            <defs><pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="currentColor" strokeOpacity=".11" strokeWidth="1" /></pattern></defs>
            <rect width="1000" height="620" fill="#eff1e9" />
            {map.backgroundMediaId && <image href={"/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/media/" + encodeURIComponent(map.backgroundMediaId) + "/download"} x="0" y="0" width="1000" height="620" preserveAspectRatio="xMidYMid slice" />}
            <rect width="1000" height="620" fill="url(#map-grid)" opacity=".38" />
            {map.regions.filter((region) => getMapLayer(region.layerId)?.visible !== false).map((region) => {
              const locked = getMapLayer(region.layerId)?.locked ?? false;
              return <g key={region.id} opacity={getMapLayer(region.layerId)?.opacity ?? 1}>
                <polygon points={region.points.map((point) => (point.x * 1000) + "," + (point.y * 620)).join(" ")} />
                {region.points.map((point, pointIndex) => <circle
                  className="map-region-vertex"
                  key={pointIndex}
                  cx={point.x * 1000}
                  cy={point.y * 620}
                  r="7"
                  onPointerDown={(event) => startMapGesture(event, { kind: "vertex", id: region.id, pointIndex }, locked)}
                />)}
                <text x={region.points.reduce((sum, point) => sum + point.x * 1000, 0) / region.points.length} y={region.points.reduce((sum, point) => sum + point.y * 620, 0) / region.points.length}>{region.name}</text>
              </g>;
            })}
            {map.pins.filter((pin) => getMapLayer(pin.layerId)?.visible !== false).map((pin) => {
              const locked = getMapLayer(pin.layerId)?.locked ?? false;
              return <g
                key={pin.id}
                className="map-pin-mark"
                opacity={getMapLayer(pin.layerId)?.opacity ?? 1}
                onPointerDown={(event) => startMapGesture(event, { kind: "pin", id: pin.id }, locked)}
              >
                <circle cx={pin.x * 1000} cy={pin.y * 620} r="9" />
                <circle cx={pin.x * 1000} cy={pin.y * 620} r="3" />
                <text x={pin.x * 1000 + 16} y={pin.y * 620 - 12}>{pin.label}</text>
              </g>;
            })}
          </svg>
          <div className="visual-tool-footer"><span>{map.layers.length} layers</span><span>{map.regions.length} regions</span><span>{map.pins.length} pins</span><span>{map.width} × {map.height}</span></div>
          <div className="map-feature-editor">
            <div className="map-feature-group">
              <div className="map-feature-title"><span className="eyebrow">LAYERS</span><button type="button" className="toolbar-button" onClick={addMapLayer} disabled={!interactive || map.layers.length >= 100}>Add layer</button></div>
              <label className="map-active-layer"><span>New features go to</span><select value={activeMapLayerId} onChange={(event) => setSelectedMapLayerId(event.target.value)} disabled={!interactive}>{map.layers.map((layer) => <option key={layer.id} value={layer.id}>{layer.name}</option>)}</select></label>
              {map.layers.map((layer) => <div className="map-layer-row" key={layer.id}>
                <label className="map-layer-name"><span>Name</span><input value={layer.name} onChange={(event) => updateMapLayer(layer.id, { name: event.target.value })} disabled={!interactive} /></label>
                <label><span>Opacity</span><input type="range" min="0" max="1" step="0.05" value={layer.opacity} onChange={(event) => updateMapLayer(layer.id, { opacity: Number(event.target.value) })} disabled={!interactive} /></label>
                <label className="map-layer-flag"><input type="checkbox" checked={layer.visible} onChange={(event) => updateMapLayer(layer.id, { visible: event.target.checked })} disabled={!interactive} /><span>Visible</span></label>
                <label className="map-layer-flag"><input type="checkbox" checked={layer.locked} onChange={(event) => updateMapLayer(layer.id, { locked: event.target.checked })} disabled={!interactive} /><span>Locked</span></label>
                <button type="button" className="map-layer-remove" onClick={() => removeMapLayer(layer.id)} disabled={!interactive || map.layers.length <= 1}>Remove</button>
              </div>)}
            </div>
            <div className="map-feature-group">
              <span className="eyebrow">REGIONS</span>
              {map.regions.map((region) => {
                const locked = getMapLayer(region.layerId)?.locked ?? false;
                return <div className="map-region-editor" key={region.id}>
                  <label className="map-feature-row"><span>Region</span><input value={region.name} onChange={(event) => patchData((current) => ({ ...(current as MapData), regions: (current as MapData).regions.map((item) => item.id === region.id ? { ...item, name: event.target.value } : item) }))} disabled={!interactive || locked} /></label>
                  <label className="map-region-layer"><span>Layer</span><select value={region.layerId ?? map.layers[0]?.id ?? ""} onChange={(event) => patchData((current) => ({ ...(current as MapData), regions: (current as MapData).regions.map((item) => item.id === region.id ? { ...item, layerId: event.target.value } : item) }))} disabled={!interactive || locked}>{map.layers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <div className="map-region-points">{region.points.map((point, pointIndex) => <div className="map-point-row" key={pointIndex}>
                    <span>Point {pointIndex + 1}</span>
                    <label><span>X</span><input type="number" min="0" max="1" step="0.01" value={point.x.toFixed(2)} onChange={(event) => patchData((current) => ({ ...(current as MapData), regions: (current as MapData).regions.map((item) => item.id === region.id ? { ...item, points: item.points.map((value, index) => index === pointIndex ? { ...value, x: Math.max(0, Math.min(1, Number(event.target.value))) } : value) } : item) }))} disabled={!interactive || locked} /></label>
                    <label><span>Y</span><input type="number" min="0" max="1" step="0.01" value={point.y.toFixed(2)} onChange={(event) => patchData((current) => ({ ...(current as MapData), regions: (current as MapData).regions.map((item) => item.id === region.id ? { ...item, points: item.points.map((value, index) => index === pointIndex ? { ...value, y: Math.max(0, Math.min(1, Number(event.target.value))) } : value) } : item) }))} disabled={!interactive || locked} /></label>
                  </div>)}</div>
                </div>;
              })}
              {map.regions.length === 0 && <p className="visual-tool-empty">Add a region to name it here.</p>}
            </div>
            <div className="map-feature-group">
              <span className="eyebrow">PINS · NORMALISED POSITION</span>
              {map.pins.map((pin) => {
                const locked = getMapLayer(pin.layerId)?.locked ?? false;
                return <div className="map-pin-editor" key={pin.id}>
                  <div className="map-pin-row">
                    <label><span>Label</span><input value={pin.label} onChange={(event) => patchData((current) => ({ ...(current as MapData), pins: (current as MapData).pins.map((item) => item.id === pin.id ? { ...item, label: event.target.value } : item) }))} disabled={!interactive || locked} /></label>
                    <label><span>X</span><input type="number" min="0" max="1" step="0.01" value={pin.x.toFixed(2)} onChange={(event) => patchData((current) => ({ ...(current as MapData), pins: (current as MapData).pins.map((item) => item.id === pin.id ? { ...item, x: Math.max(0, Math.min(1, Number(event.target.value))) } : item) }))} disabled={!interactive || locked} /></label>
                    <label><span>Y</span><input type="number" min="0" max="1" step="0.01" value={pin.y.toFixed(2)} onChange={(event) => patchData((current) => ({ ...(current as MapData), pins: (current as MapData).pins.map((item) => item.id === pin.id ? { ...item, y: Math.max(0, Math.min(1, Number(event.target.value))) } : item) }))} disabled={!interactive || locked} /></label>
                  </div>
                  <label className="map-region-layer"><span>Layer</span><select value={pin.layerId ?? map.layers[0]?.id ?? ""} onChange={(event) => patchData((current) => ({ ...(current as MapData), pins: (current as MapData).pins.map((item) => item.id === pin.id ? { ...item, layerId: event.target.value } : item) }))} disabled={!interactive || locked}>{map.layers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                </div>;
              })}
              {map.pins.length === 0 && <p className="visual-tool-empty">Add a pin to set its position.</p>}
            </div>
          </div>
        </div>}

        {tree && <div className="tool-editor">
          <div className="tool-editor-heading relation-editor-heading"><div><span className="eyebrow">RELATION MODEL</span><h2>Explicit relationships</h2></div><div className="tool-action-row"><label>Type<input value={relationType} onChange={(event) => setRelationType(event.target.value)} maxLength={80} disabled={!interactive} /></label><label>Label<input value={relationLabel} onChange={(event) => setRelationLabel(event.target.value)} maxLength={120} disabled={!interactive} /></label><button className="toolbar-button" type="button" onClick={addRelationNode} disabled={!interactive}>Add node</button><button className="toolbar-button" type="button" onClick={addRelationEdge} disabled={!interactive}>Connect last two</button></div></div>
          <div className="relation-variant-bar">
            <label><span>Variant name</span><input value={relationVariantName} onChange={(event) => setRelationVariantName(event.target.value)} maxLength={100} disabled={!interactive} /></label>
            <button type="button" className="toolbar-button" onClick={saveRelationVariant} disabled={!interactive || tree.nodes.length === 0 || tree.variants.length >= 100}>Save layout</button>
            <label><span>Apply saved layout</span><select value={selectedRelationVariantId} onChange={(event) => applyRelationVariant(event.target.value)} disabled={!interactive}><option value="">Current layout</option>{tree.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}</select></label>
          </div>
          <svg
            className="relation-artboard"
            viewBox="0 0 1000 600"
            role="img"
            aria-label="Relation tree with draggable nodes and typed edges"
            ref={relationStageRef}
            onPointerMove={updateRelationGesture}
            onPointerUp={finishRelationGesture}
            onPointerCancel={finishRelationGesture}
          >
            {tree.edges.map((edge) => {
              const source = tree.nodes.find((node) => node.id === edge.source);
              const target = tree.nodes.find((node) => node.id === edge.target);
              return source && target ? <g key={edge.id}><line x1={source.x * 1000} y1={source.y * 600} x2={target.x * 1000} y2={target.y * 600} /><text x={(source.x + target.x) * 500} y={(source.y + target.y) * 300 - 12}>{edge.label ?? edge.relationType}</text></g> : null;
            })}
            {tree.nodes.map((node) => <g
              key={node.id}
              className="relation-node"
              onPointerDown={(event) => startRelationGesture(event, node.id)}
              role="button"
              tabIndex={0}
              aria-label={"Move relation node " + node.label}
            ><rect x={node.x * 1000 - 82} y={node.y * 600 - 28} width="164" height="56" rx="12" /><text x={node.x * 1000} y={node.y * 600 + 4}>{node.label}</text></g>)}
          </svg>
          <div className="visual-tool-footer"><span>{tree.nodes.length} nodes</span><span>{tree.edges.length} typed relationships</span><span>{tree.variants.length} variants</span></div>
          <div className="relation-edit-list">
            <span className="eyebrow">NODES</span>
            {tree.nodes.map((node) => <div className="relation-edit-row" key={node.id}>
              <label><span>Node</span><input value={node.label} onChange={(event) => patchData((current) => ({ ...(current as RelationTreeData), nodes: (current as RelationTreeData).nodes.map((item) => item.id === node.id ? { ...item, label: event.target.value } : item) }))} disabled={!interactive} /></label>
              <label><span>X</span><input type="number" min="0" max="1" step="0.01" value={node.x.toFixed(2)} onChange={(event) => patchData((current) => ({ ...(current as RelationTreeData), nodes: (current as RelationTreeData).nodes.map((item) => item.id === node.id ? { ...item, x: Math.max(0, Math.min(1, Number(event.target.value))) } : item) }))} disabled={!interactive} /></label>
              <label><span>Y</span><input type="number" min="0" max="1" step="0.01" value={node.y.toFixed(2)} onChange={(event) => patchData((current) => ({ ...(current as RelationTreeData), nodes: (current as RelationTreeData).nodes.map((item) => item.id === node.id ? { ...item, y: Math.max(0, Math.min(1, Number(event.target.value))) } : item) }))} disabled={!interactive} /></label>
            </div>)}
            <span className="eyebrow relation-edges-label">TYPED EDGES</span>
            {tree.edges.map((edge) => <div className="relation-edge-row" key={edge.id}>
              <label><span>Type</span><input value={edge.relationType} onChange={(event) => patchData((current) => ({ ...(current as RelationTreeData), edges: (current as RelationTreeData).edges.map((item) => item.id === edge.id ? { ...item, relationType: event.target.value } : item) }))} disabled={!interactive} /></label>
              <label><span>Label</span><input value={edge.label ?? ""} onChange={(event) => patchData((current) => ({ ...(current as RelationTreeData), edges: (current as RelationTreeData).edges.map((item) => item.id === edge.id ? { ...item, label: event.target.value } : item) }))} disabled={!interactive} /></label>
            </div>)}
          </div>
        </div>}

        {canvas && <div className="tool-editor">
          <div className="tool-editor-heading"><div><span className="eyebrow">FREEFORM WORKSPACE</span><h2>Canvas</h2></div><div className="tool-action-row"><button className="toolbar-button" type="button" onClick={undoCanvas} disabled={!interactive || canvasUndo.length === 0}>Undo</button><button className="toolbar-button" type="button" onClick={redoCanvas} disabled={!interactive || canvasRedo.length === 0}>Redo</button><button className="toolbar-button" type="button" onClick={deleteCanvasObject} disabled={!interactive || !selectedCanvasObjectId}>Delete</button><button className="toolbar-button" type="button" onClick={() => addCanvasObject("card")} disabled={!interactive}>Place card</button><button className="toolbar-button" type="button" onClick={() => addCanvasObject("text")} disabled={!interactive}>Add note</button><button className="toolbar-button" type="button" onClick={addCanvasImage} disabled={!interactive || !selectedMediaId}>Place image</button></div></div>
          <div className="canvas-artboard" ref={canvasStageRef} aria-label="Canvas workspace">
            {canvas.objects.map((object) => <div
              className={"canvas-object kind-" + object.kind + (selectedCanvasObjectId === object.id ? " selected" : "")}
              key={object.id}
              style={{ left: (object.x * 100) + "%", top: (object.y * 100) + "%", width: (object.width * 100) + "%", height: (object.height * 100) + "%" }}
              onPointerDown={(event) => startCanvasGesture(event, object)}
              onPointerMove={updateCanvasGesture}
              onPointerUp={finishCanvasGesture}
              onPointerCancel={finishCanvasGesture}
              onClick={() => setSelectedCanvasObjectId(object.id)}
              role="button"
              tabIndex={0}
              aria-pressed={selectedCanvasObjectId === object.id}
              aria-label={"Select " + (object.kind === "text" ? "note" : object.kind) + " object"}
            >
              <small>{object.kind === "card" ? cards.find((card) => card.id === object.cardId)?.name ?? "Unlinked card" : object.kind === "text" ? "NOTE" : object.kind.toUpperCase()}</small>
              {object.kind === "text" ? <textarea value={object.text ?? ""} onFocus={() => { canvasNoteBeforeRef.current = canvas; }} onChange={(event) => patchData((current) => ({ ...(current as CanvasData), objects: (current as CanvasData).objects.map((item) => item.id === object.id ? { ...item, text: event.target.value } : item) }))} onBlur={() => { const before = canvasNoteBeforeRef.current; if (before && JSON.stringify(before) !== JSON.stringify(data)) rememberCanvas(before); canvasNoteBeforeRef.current = null; }} disabled={!interactive} aria-label="Canvas note" /> : object.kind === "image" ? <>{(() => { const asset = media.find((item) => item.id === object.mediaId); return asset ? <Image src={"/api/v1/worlds/" + encodeURIComponent(worldSlug) + "/media/" + encodeURIComponent(asset.id) + "/download"} alt={asset.fileName} fill sizes="(max-width: 620px) 45vw, 220px" unoptimized /> : <strong>Missing Gallery asset</strong>; })()}</> : <strong>{object.kind === "card" ? cards.find((card) => card.id === object.cardId)?.name ?? "Card" : "Canvas object"}</strong>}
              <span className="canvas-resize-handle" data-resize-handle aria-hidden="true" />
            </div>)}
            {canvas.objects.length === 0 && <span className="canvas-empty-note">Place a card or add a note to start.</span>}
          </div>
          <div className="visual-tool-footer"><span>{canvas.objects.length} objects</span><span>{canvas.strokes.length} drawing strokes</span><span>Normalised workspace coordinates</span></div>
        </div>}

        {timeline && <div className="tool-editor">
          <div className="tool-editor-heading timeline-editor-heading"><div><span className="eyebrow">CALENDAR MODEL</span><input className="timeline-calendar-name" value={timeline.calendar.name} onChange={(event) => patchData((current) => ({ ...(current as TimelineData), calendar: { ...(current as TimelineData).calendar, name: event.target.value } }))} disabled={!interactive} aria-label="Calendar name" /><span className="timeline-count">{timeline.events.length} events</span></div><button type="button" className="toolbar-button" onClick={addTimelineMonth} disabled={!interactive || timeline.calendar.months.length >= 24}>Add month</button></div>
          <div className="timeline-weekdays">
            <div className="map-feature-title"><span className="eyebrow">WEEKDAY CYCLE</span><button type="button" className="toolbar-button" onClick={addTimelineWeekday} disabled={!interactive || (timeline.calendar.weekdays ?? []).length >= 14}>Add weekday</button></div>
            <div className="timeline-weekday-list">{(timeline.calendar.weekdays ?? []).map((weekday, index) => <label key={index}><input value={weekday} onChange={(event) => patchData((current) => ({ ...(current as TimelineData), calendar: { ...(current as TimelineData).calendar, weekdays: (current as TimelineData).calendar.weekdays?.map((name, weekdayIndex) => weekdayIndex === index ? event.target.value : name) ?? [] } }))} disabled={!interactive} aria-label="Weekday name" /><button type="button" onClick={() => removeTimelineWeekday(index)} disabled={!interactive}>×</button></label>)}{(timeline.calendar.weekdays ?? []).length === 0 && <p className="visual-tool-empty">No weekday cycle configured.</p>}</div>
          </div>
          <div className="timeline-calendar">
            {timeline.calendar.months.map((month, index) => <div key={index}>
              <strong>{(index + 1).toString().padStart(2, "0")}</strong>
              <input value={month.name} onChange={(event) => patchData((current) => ({ ...(current as TimelineData), calendar: { ...(current as TimelineData).calendar, months: (current as TimelineData).calendar.months.map((item, monthIndex) => monthIndex === index ? { ...item, name: event.target.value } : item) } }))} disabled={!interactive} aria-label="Month name" />
              <label><span>Days</span><input type="number" min="1" max="100" value={month.days} onChange={(event) => patchData((current) => ({ ...(current as TimelineData), calendar: { ...(current as TimelineData).calendar, months: (current as TimelineData).calendar.months.map((item, monthIndex) => monthIndex === index ? { ...item, days: Number(event.target.value) } : item) } }))} disabled={!interactive} /></label>
              <button type="button" onClick={() => removeTimelineMonth(index)} disabled={!interactive || timeline.calendar.months.length <= 1}>Remove</button>
            </div>)}
          </div>
          <div className="timeline-add-event">
            <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="Event title" aria-label="Event title" disabled={!interactive} />
            <input type="number" value={eventYear} onChange={(event) => setEventYear(event.target.value)} aria-label="Year" disabled={!interactive} />
            <select value={eventMonth} onChange={(event) => setEventMonth(event.target.value)} aria-label="Month" disabled={!interactive}>{timeline.calendar.months.map((month, index) => <option key={month.name} value={index + 1}>{month.name}</option>)}</select>
            <input type="number" value={eventDay} onChange={(event) => setEventDay(event.target.value)} aria-label="Day" disabled={!interactive} />
            <button type="button" className="toolbar-button" onClick={addTimelineEvent} disabled={!interactive}>Add event</button>
          </div>
          <div className="timeline-events">
            {events.map((event) => <article key={event.id}>
              <span className="timeline-event-date">{event.year} / {event.month} / {event.day}</span>
              <div className="timeline-event-editor">
                <input value={event.title} onChange={(change) => patchData((current) => ({ ...(current as TimelineData), events: (current as TimelineData).events.map((item) => item.id === event.id ? { ...item, title: change.target.value } : item) }))} disabled={!interactive} aria-label="Event title" />
                <div className="timeline-event-date-fields">
                  <input type="number" min="-100000" max="100000" value={event.year} onChange={(change) => patchData((current) => ({ ...(current as TimelineData), events: (current as TimelineData).events.map((item) => item.id === event.id ? { ...item, year: Number(change.target.value) } : item) }))} disabled={!interactive} aria-label="Event year" />
                  <select value={event.month} onChange={(change) => patchData((current) => ({ ...(current as TimelineData), events: (current as TimelineData).events.map((item) => item.id === event.id ? { ...item, month: Number(change.target.value) } : item) }))} disabled={!interactive} aria-label="Event month">{timeline.calendar.months.map((month, index) => <option key={index} value={index + 1}>{month.name}</option>)}</select>
                  <input type="number" min="1" max={timeline.calendar.months[event.month - 1]?.days ?? 100} value={event.day} onChange={(change) => patchData((current) => ({ ...(current as TimelineData), events: (current as TimelineData).events.map((item) => item.id === event.id ? { ...item, day: Number(change.target.value) } : item) }))} disabled={!interactive} aria-label="Event day" />
                  <button type="button" onClick={() => patchData((current) => ({ ...(current as TimelineData), events: (current as TimelineData).events.filter((item) => item.id !== event.id) }))} disabled={!interactive}>Remove</button>
                </div>
              </div>
            </article>)}
            {events.length === 0 && <p className="visual-tool-empty">No events on this timeline yet.</p>}
          </div>
        </div>}
      </main>
    </div>

    {error && <p className="visual-tool-error" role="alert">{error}</p>}
    <p className="visual-tool-disclaimer">{interactive ? "Changes are saved to this world and era when confirmed by the server." : "Preview mode · connect the Rust API to save visual documents."}</p>
      </section>
    </div>
  </div>;
}
