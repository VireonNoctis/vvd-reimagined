# Document Types and Card Templates

The registry is an explicit catalogue and world allow-list; a catalogue entry is not proof that its editor has full feature parity.

## Document type registry

| Type | Status on this PR head | Default availability | Current behaviour |
| --- | --- | --- | --- |
| Card | Ready | Enabled | Canonical card CRUD, properties, references, blocks and templates |
| Map | Ready | Enabled | Persisted map documents, backgrounds, layers, regions and linked pins |
| Timeline | Ready | Enabled | Persisted calendar and event documents |
| Relation Tree | Ready | Enabled | Persisted independent nodes, typed edges and layout variants |
| Canvas | Ready | Enabled | Persisted positioned objects, groups and drawing strokes |

All four visual handlers are registered as ready and enabled on this PR head. This means their first typed persistence/API/UI slice exists, not that they have full tutorial feature parity.

## Card templates

Character, Place and Faction are the only supported card entity types in this slice. Each world receives one default template per type. Templates contain stable ids, names/descriptions, property definitions, starter text sections and a default-template flag. The management UI is at `/worlds/{slug}/templates`.

## Tutorial-derived taxonomy requirements

The official [Cards and card types tutorial](YOUTUBE_TUTORIAL_RESEARCH.md#3-cards-and-card-types--224) describes genre-based default type catalogues, creator-defined types/subtypes, guided starter structures (background, personality, appearance), and type-level properties reused by future cards. It also describes richer card blocks: photos, maps, stat blocks and TTRPG character sheets.

The current implementation has editable templates but a fixed `CardEntityType` enum. Creator-defined entity types/subtypes, genre-seeded taxonomies and richer block-aware templates are not implemented. Keep creator taxonomy separate from the global document-type registry: a custom Character-like type is not a new top-level application document handler.

## Current boundaries

- Arbitrary entity types/subtypes are not part of this slice.
- Templates currently describe scalar/reference properties and text starter sections.
- Media/embedded tool blocks, conditional fields and allowed-reference subtype rules remain future work.
- The world allow-list is seeded per world; custom card taxonomy and genre defaults are separate capabilities.
