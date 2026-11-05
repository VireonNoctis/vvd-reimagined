import type { World } from "@/domain/world";

export const demoWorld: World = {
  id: "world-shattered-meridian",
  slug: "shattered-meridian",
  name: "The Shattered Meridian",
  description: "A coast divided by a vanished sun, where old treaties still decide who gets to trade, travel and remember.",
  genre: "Low fantasy · maritime",
  updatedAt: "2026-11-02",
  documents: [
    {
      id: "card-elowen-sable",
      kind: "card",
      entityType: "character",
      name: "Elowen Sable",
      aliases: ["The Tidebound", "Warden of the East Shoal"],
      updatedAt: "2026-11-02",
      properties: [
        { id: "origin", label: "Origin", kind: "reference", documentId: "card-fallowreach" },
        { id: "allegiance", label: "Allegiance", kind: "reference", documentId: "card-glass-court" },
        { id: "age", label: "Age", kind: "text", value: "Thirty-four" }
      ],
      blocks: [
        { id: "intro", type: "text", text: "Elowen keeps the eastern shoals from becoming a second border. She knows every safe channel between the salt marshes, and can tell the weather by the colour of the water long before the bells begin." },
        { id: "history", type: "text", text: "She was raised in Fallowreach during the years after the Meridian broke. Her appointment was meant to settle a dispute between the coast and the Glass Court. Instead, it gave both sides someone they could blame." }
      ]
    },
    {
      id: "card-fallowreach",
      kind: "card",
      entityType: "place",
      name: "Fallowreach",
      aliases: ["The Reed Coast"],
      updatedAt: "2026-10-28",
      properties: [{ id: "region", label: "Region", kind: "text", value: "Eastern Shoals" }],
      blocks: [{ id: "description", type: "text", text: "A low, tidal coast of reed beds, chalk roads and half-submerged watchtowers. Its settlements move with the shoreline, but their oldest boundaries remain stubbornly fixed." }]
    },
    {
      id: "card-glass-court",
      kind: "card",
      entityType: "faction",
      name: "The Glass Court",
      aliases: ["The Court"],
      updatedAt: "2026-10-21",
      properties: [{ id: "seat", label: "Seat", kind: "text", value: "Veyr" }],
      blocks: [{ id: "description", type: "text", text: "A compact of navigators, lenders and coastal magistrates. The Court maintains that the Meridian's old routes are still binding, even where the sea has reclaimed the land." }]
    }
  ]
};