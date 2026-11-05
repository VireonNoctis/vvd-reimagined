export type CardEntityType = "character" | "place" | "faction";

export type CardProperty =
  | { id: string; label: string; kind: "text"; value: string }
  | { id: string; label: string; kind: "reference"; documentId: string };

export type CardDocument = {
  id: string;
  kind: "card";
  entityType: CardEntityType;
  name: string;
  aliases: string[];
  updatedAt: string;
  properties: CardProperty[];
  blocks: { id: string; type: "text"; text: string }[];
};

export type World = {
  id: string;
  slug: string;
  name: string;
  description: string;
  genre: string;
  updatedAt: string;
  documents: CardDocument[];
};

export function findCard(world: World, id: string): CardDocument | undefined {
  return world.documents.find((document) => document.id === id);
}

export function resolveCardReference(world: World, property: CardProperty): CardDocument | undefined {
  return property.kind === "reference" ? findCard(world, property.documentId) : undefined;
}

export function getWorldIntegrityIssues(world: World): string[] {
  const issues: string[] = [];
  const documentIds = new Set<string>();

  for (const document of world.documents) {
    if (!document.id.trim()) {
      issues.push("A document is missing its stable id.");
      continue;
    }

    if (documentIds.has(document.id)) {
      issues.push("Duplicate document id: " + document.id);
    }

    documentIds.add(document.id);
  }

  for (const document of world.documents) {
    for (const property of document.properties) {
      if (property.kind === "reference" && !documentIds.has(property.documentId)) {
        issues.push(document.id + "." + property.id + " points to missing document " + property.documentId + ".");
      }
    }
  }

  return issues;
}