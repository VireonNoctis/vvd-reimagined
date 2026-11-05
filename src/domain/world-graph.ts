import type { World } from "./world";

export type WorldGraphNode = {
  id: string;
  name: string;
  entityType: World["documents"][number]["entityType"];
};

export type WorldGraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

export function buildWorldGraph(world: World): { nodes: WorldGraphNode[]; edges: WorldGraphEdge[] } {
  const nodes = world.documents.map(({ id, name, entityType }) => ({ id, name, entityType }));
  const knownIds = new Set(nodes.map((node) => node.id));
  const edges: WorldGraphEdge[] = [];

  for (const document of world.documents) {
    for (const property of document.properties) {
      if (property.kind !== "reference" || !knownIds.has(property.documentId)) continue;
      edges.push({
        id: document.id + ":" + property.id,
        source: document.id,
        target: property.documentId,
        label: property.label
      });
    }
  }

  return { nodes, edges };
}
