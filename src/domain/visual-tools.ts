import type { CardDocument } from "@/domain/world";

export type VisualToolKind = "map" | "relation_tree" | "canvas" | "timeline";

export type VisualToolDocument = {
  id: string;
  kind: VisualToolKind;
  eraId: string;
  name: string;
  version: number;
  data: VisualToolData;
  createdAt: string;
  updatedAt: string;
};

export type Point = { x: number; y: number };
export type MapLayer = { id: string; name: string; opacity: number; visible: boolean; locked: boolean };
export type MapRegion = { id: string; name: string; points: Point[]; cardId?: string };
export type MapPin = { id: string; label: string; x: number; y: number; cardId?: string };
export type MapData = {
  width: number;
  height: number;
  layers: MapLayer[];
  regions: MapRegion[];
  pins: MapPin[];
  backgroundMediaId?: string;
};

export type RelationNode = { id: string; label: string; x: number; y: number; cardId?: string };
export type RelationEdge = { id: string; source: string; target: string; relationType: string; label?: string };
export type RelationTreeData = { nodes: RelationNode[]; edges: RelationEdge[]; variants: { id: string; name: string }[] };

export type CanvasObject = {
  id: string;
  kind: "card" | "text" | "image" | "shape" | "group";
  x: number;
  y: number;
  width: number;
  height: number;
  cardId?: string;
  mediaId?: string;
  text?: string;
};
export type CanvasStroke = { id: string; width: number; color: string; points: Point[] };
export type CanvasData = { objects: CanvasObject[]; strokes: CanvasStroke[] };

export type CalendarMonth = { name: string; days: number };
export type TimelineEvent = { id: string; title: string; year: number; month: number; day: number; cardId?: string };
export type TimelineData = {
  calendar: { name: string; months: CalendarMonth[]; weekdays?: string[] };
  events: TimelineEvent[];
};

export type VisualToolData = MapData | RelationTreeData | CanvasData | TimelineData;

export function createVisualToolData(kind: VisualToolKind): VisualToolData {
  switch (kind) {
    case "map":
      return { width: 1600, height: 900, layers: [{ id: "land", name: "Land", opacity: 1, visible: true, locked: false }], regions: [], pins: [] };
    case "relation_tree":
      return { nodes: [], edges: [], variants: [] };
    case "canvas":
      return { objects: [], strokes: [] };
    case "timeline":
      return { calendar: { name: "World calendar", months: [{ name: "First month", days: 30 }] }, events: [] };
  }
}

export function cardLabel(card: CardDocument): string {
  return card.name + " · " + card.entityType;
}
