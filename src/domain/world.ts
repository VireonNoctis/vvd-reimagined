export type CardEntityType = "character" | "place" | "faction";

export type CardProperty =
  | { id: string; label: string; kind: "text"; value: string }
  | { id: string; label: string; kind: "reference"; documentId: string };

export type CardTemplatePropertyDefinition = {
  id: string;
  label: string;
  kind: "text" | "reference";
  required: boolean;
  defaultValue?: string | null;
};

export type CardTemplateBlock = { id: string; label: string; text: string };

export type CardTemplate = {
  id: string;
  entityType: CardEntityType;
  version: number;
  name: string;
  description: string;
  propertyDefinitions: CardTemplatePropertyDefinition[];
  starterBlocks: CardTemplateBlock[];
  isDefault: boolean;
};

export type DocumentTypeSummary = {
  typeKey: string;
  name: string;
  description: string;
  enabled: boolean;
  implementationStatus: "ready" | "planned" | string;
};

export type GraphLayoutNodePosition = { documentId: string; x: number; y: number };

export type GraphLayoutView = { x: number; y: number; zoom: number };

export type GraphLayoutFilters = {
  showReferences: boolean;
  showMentions: boolean;
  entityTypes: Record<CardEntityType, boolean>;
};

export type GraphLayout = {
  id: string;
  eraId: string;
  name: string;
  version: number;
  positions: GraphLayoutNodePosition[];
  view: GraphLayoutView;
  filters: GraphLayoutFilters;
  updatedAt: string;
};

export type CardMediaAsset = {
  id: string;
  documentId: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

export type CardDocument = {
  id: string;
  kind: "card";
  entityType: CardEntityType;
  templateId?: string | null;
  name: string;
  aliases: string[];
  updatedAt: string;
  version: number;
  folderId?: string | null;
  properties: CardProperty[];
  blocks: { id: string; type: "text"; text: string }[];
  media?: CardMediaAsset[];
};

export type Era = {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type World = {
  id: string;
  slug: string;
  name: string;
  description: string;
  genre: string;
  updatedAt: string;
  eras: Era[];
  activeEraId: string;
  documentTypes: DocumentTypeSummary[];
  cardTemplates: CardTemplate[];
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
    const label = document.id || "(missing id)";

    if (!document.id.trim()) {
      issues.push("A document is missing its stable id.");
    } else if (documentIds.has(document.id)) {
      issues.push("Duplicate document id: " + document.id);
    } else {
      documentIds.add(document.id);
    }

    if (!document.name.trim()) issues.push("Document " + label + " has no name.");

    const propertyIds = new Set<string>();
    for (const property of document.properties) {
      if (!property.id.trim()) {
        issues.push("Document " + label + " has a property without a stable id.");
      } else if (propertyIds.has(property.id)) {
        issues.push("Document " + label + " has duplicate property id: " + property.id + ".");
      } else {
        propertyIds.add(property.id);
      }

      if (!property.label.trim()) issues.push("Document " + label + " has an unnamed property.");
    }

    const blockIds = new Set<string>();
    for (const block of document.blocks) {
      if (!block.id.trim()) {
        issues.push("Document " + label + " has a body block without a stable id.");
      } else if (blockIds.has(block.id)) {
        issues.push("Document " + label + " has duplicate body block id: " + block.id + ".");
      } else {
        blockIds.add(block.id);
      }
    }
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
