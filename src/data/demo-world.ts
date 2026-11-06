import type { World } from "@/domain/world";

export const demoWorld: World = {
  id: "world-shattered-meridian",
  slug: "shattered-meridian",
  name: "The Shattered Meridian",
  description: "A coast divided by a vanished sun, where old treaties still decide who gets to trade, travel and remember.",
  genre: "Low fantasy · maritime",
  updatedAt: "2026-11-02",
  eras: [{
    id: "era-prime-preview",
    name: "Prime",
    description: "The shared starting state of this world.",
    parentId: null,
    isDefault: true,
    createdAt: "2026-11-02T00:00:00Z",
    updatedAt: "2026-11-02T00:00:00Z"
  }],
  activeEraId: "era-prime-preview",
  documentTypes: [
    { typeKey: "card", name: "Card", description: "Structured world records.", enabled: true, implementationStatus: "ready" },
    { typeKey: "map", name: "Map", description: "Image-backed maps with regions and pins.", enabled: false, implementationStatus: "planned" },
    { typeKey: "timeline", name: "Timeline", description: "Events and calendars.", enabled: false, implementationStatus: "planned" },
    { typeKey: "relation_tree", name: "Relation Tree", description: "Explicit relationships.", enabled: false, implementationStatus: "planned" },
    { typeKey: "canvas", name: "Canvas", description: "Spatial documents and drawing.", enabled: false, implementationStatus: "planned" }
  ],
  cardTemplates: [
    {
      id: "template-character-preview",
      entityType: "character",
      version: 1,
      name: "Character",
      description: "A person or being with a place in the world.",
      propertyDefinitions: [
        { id: "role", label: "Role", kind: "text", required: false, defaultValue: "" },
        { id: "age", label: "Age", kind: "text", required: false, defaultValue: "" }
      ],
      starterBlocks: [
        { id: "intro", label: "Introduction", text: "" },
        { id: "background", label: "Background", text: "" }
      ],
      isDefault: true
    },
    {
      id: "template-place-preview",
      entityType: "place",
      version: 1,
      name: "Place",
      description: "A location, settlement or region.",
      propertyDefinitions: [
        { id: "region", label: "Region", kind: "text", required: false, defaultValue: "" },
        { id: "climate", label: "Climate", kind: "text", required: false, defaultValue: "" }
      ],
      starterBlocks: [
        { id: "overview", label: "Overview", text: "" },
        { id: "details", label: "Details", text: "" }
      ],
      isDefault: true
    },
    {
      id: "template-faction-preview",
      entityType: "faction",
      version: 1,
      name: "Faction",
      description: "An organisation, culture or political group.",
      propertyDefinitions: [
        { id: "seat", label: "Seat", kind: "text", required: false, defaultValue: "" },
        { id: "influence", label: "Influence", kind: "text", required: false, defaultValue: "" }
      ],
      starterBlocks: [
        { id: "overview", label: "Overview", text: "" },
        { id: "history", label: "History", text: "" }
      ],
      isDefault: true
    }
  ],
  documents: [
    {
      id: "card-elowen-sable",
      kind: "card",
      entityType: "character",
      name: "Elowen Sable",
      aliases: ["The Tidebound", "Warden of the East Shoal"],
      updatedAt: "2026-11-02",
      version: 1,
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
      version: 1,
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
      version: 1,
      properties: [{ id: "seat", label: "Seat", kind: "text", value: "Veyr" }],
      blocks: [{ id: "description", type: "text", text: "A compact of navigators, lenders and coastal magistrates. The Court maintains that the Meridian's old routes are still binding, even where the sea has reclaimed the land." }]
    }
  ]
};