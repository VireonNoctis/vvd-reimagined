import type { CardProperty } from "@/domain/world";

export type CardBlockDraft = { id: string; text: string };

export function parseAliases(value: string): string[] {
  const seen = new Set<string>();
  return value.split(",").map((part) => part.trim()).filter((alias) => {
    if (!alias) return false;
    const key = alias.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function moveDraftItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function validateCardDraft(
  name: string,
  properties: readonly CardProperty[],
  blocks: readonly CardBlockDraft[],
): string | null {
  if (!name.trim()) return "Give this card a name before saving.";
  if (name.trim().length > 120) return "Card names can contain up to 120 characters.";

  const propertyIds = new Set<string>();
  for (const property of properties) {
    if (!property.id.trim()) return "Every property needs a stable id.";
    if (propertyIds.has(property.id)) return "Two properties share the same id.";
    propertyIds.add(property.id);
    if (!property.label.trim()) return "Give every property a label.";
    if (property.kind === "reference" && !property.documentId.trim()) {
      return "Choose a linked record for each reference property.";
    }
  }

  const blockIds = new Set<string>();
  for (const block of blocks) {
    if (!block.id.trim()) return "Every text block needs a stable id.";
    if (blockIds.has(block.id)) return "Two text blocks share the same id.";
    blockIds.add(block.id);
  }

  return null;
}
