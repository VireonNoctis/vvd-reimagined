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