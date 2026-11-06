import type { CardEntityType, World } from "./world";

export type WorldGraphNode = {
  id: string;
  name: string;
  entityType: CardEntityType;
};

export type WorldGraphMentionEvidence = {
  blockId: string;
  matchedText: string;
  excerpt: string;
};

export type WorldGraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  kind: "reference" | "mention";
  occurrences: number;
  evidence?: WorldGraphMentionEvidence[];
};

export type WorldGraph = { nodes: WorldGraphNode[]; edges: WorldGraphEdge[] };

export type WorldGraphFilters = {
  showReferences: boolean;
  showMentions: boolean;
  entityTypes: Record<CardEntityType, boolean>;
};

export const defaultWorldGraphFilters: WorldGraphFilters = {
  showReferences: true,
  showMentions: true,
  entityTypes: {
    character: true,
    place: true,
    faction: true
  }
};

function normalizeMention(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mentionTargets(world: World): { phrases: string[]; targets: Map<string, string> } {
  const candidates = new Map<string, Set<string>>();

  for (const document of world.documents) {
    for (const phrase of [document.name, ...document.aliases]) {
      const normalized = normalizeMention(phrase);
      if (normalized.length < 2) continue;
      const matches = candidates.get(normalized) ?? new Set<string>();
      matches.add(document.id);
      candidates.set(normalized, matches);
    }
  }

  const targets = new Map<string, string>();
  for (const [phrase, matches] of candidates) {
    if (matches.size === 1) targets.set(phrase, matches.values().next().value as string);
  }

  const phrases = [...targets.keys()].sort(
    (left, right) => right.length - left.length || left.localeCompare(right)
  );
  return { phrases, targets };
}

function mentionExcerpt(text: string, start: number, length: number): string {
  const left = Math.max(0, start - 54);
  const right = Math.min(text.length, start + length + 54);
  return (left > 0 ? "…" : "") + text.slice(left, right).trim() + (right < text.length ? "…" : "");
}

function buildMentionEdges(world: World): WorldGraphEdge[] {
  const { phrases, targets } = mentionTargets(world);
  if (phrases.length === 0) return [];

  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}_])(${phrases.map(escapePattern).join("|")})(?=$|[^\\p{L}\\p{N}_])`,
    "giu"
  );
  const occurrences = new Map<string, {
    source: string;
    target: string;
    count: number;
    evidence: WorldGraphMentionEvidence[];
  }>();

  for (const document of world.documents) {
    for (const block of document.blocks) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(block.text)) !== null) {
        const target = targets.get(normalizeMention(match[2]));
        if (!target || target === document.id) continue;

        const key = document.id + "\\u0000" + target;
        const edge = occurrences.get(key);
        const evidence = {
          blockId: block.id,
          matchedText: match[2],
          excerpt: mentionExcerpt(block.text, match.index + match[1].length, match[2].length)
        };

        if (edge) {
          edge.count += 1;
          if (edge.evidence.length < 5) edge.evidence.push(evidence);
        } else {
          occurrences.set(key, { source: document.id, target, count: 1, evidence: [evidence] });
        }
      }
    }
  }

  return [...occurrences.values()]
    .map((edge) => ({
      id: "mention:" + edge.source + ":" + edge.target,
      source: edge.source,
      target: edge.target,
      label: "Mention",
      kind: "mention" as const,
      occurrences: edge.count,
      evidence: edge.evidence
    }))
    .sort((left, right) =>
      left.source.localeCompare(right.source) || left.target.localeCompare(right.target)
    );
}

export function buildWorldGraph(world: World): WorldGraph {
  const nodes = world.documents.map(({ id, name, entityType }) => ({ id, name, entityType }));
  const knownIds = new Set(nodes.map((node) => node.id));
  const references: WorldGraphEdge[] = [];

  for (const document of world.documents) {
    for (const property of document.properties) {
      if (property.kind !== "reference" || !knownIds.has(property.documentId)) continue;
      references.push({
        id: "reference:" + document.id + ":" + property.id,
        source: document.id,
        target: property.documentId,
        label: property.label,
        kind: "reference",
        occurrences: 1
      });
    }
  }

  return {
    nodes,
    edges: [...references, ...buildMentionEdges(world)]
  };
}

export function filterWorldGraph(
  graph: WorldGraph,
  filters: WorldGraphFilters
): WorldGraph {
  const nodes = graph.nodes.filter((node) => filters.entityTypes[node.entityType]);
  const visibleIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => {
    if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) return false;
    return edge.kind === "reference" ? filters.showReferences : filters.showMentions;
  });

  return { nodes, edges };
}
