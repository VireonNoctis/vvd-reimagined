# Feature Inventory

This is the working inventory of product capabilities found in vvd's public material. A described feature is not automatically implemented here.

Evidence labels: **A** current developer docs; **B** product/store listing; **C** help-centre workflow; **T** official tutorial caption track; **D** reconstruction proposal.

## Current implementation

- PostgreSQL-backed world/account foundation, membership checks and version-checked card operations.
- Responsive workspace shell, searchable document library, details inspector, nested folders and folder moves.
- Canonical cards with aliases, typed scalar/reference properties, ordered text blocks and versioned Character/Place/Faction templates.
- Private Gallery foundation with signed S3-compatible transfers and server-side media validation.
- Named eras with sparse inheritance and personal graph layouts.
- WebGL World Graph with typed-reference and inferred-mention edges, filters and evidence excerpts.
- Persisted Map, Relation Tree, Canvas and Timeline documents with same-world reference validation and optimistic saves.
- Rust/Axum API, PostgreSQL migrations, authentication hardening and CI checks.

## Tutorial-verified product scope

The official ten-video [vvd tutorial series](YOUTUBE_TUTORIAL_RESEARCH.md) was analysed through manual English caption tracks on 2026-11-10. It verifies spoken workflows for world creation, Home/World/Wiki/Quill navigation, card taxonomy and organisation, Maps, World Graph, Wiki publishing, Canvas, Relation Trees and Quill.

## Confirmed gaps against the tutorials

- **Workspace:** current reconstruction focuses on World editor, library, inspector, graph and visual-tool routes. Home/Wiki/Quill navigation, world identity settings, plan/member/theme/language settings, Radio, updates and feedback remain open.
- **Card taxonomy:** templates support Character/Place/Faction only. Creator-defined types/subtypes, genre defaults and rich block templates (photo/map/stat block/character sheet) are not implemented.
- **Sidebar:** search and nested folders exist. Pinned/enlarged cards, filtering/sorting (manual/date/alphabetical), manual order, folder icons and card-to-card parent/child organisation remain open.
- **Maps:** persisted first pass has backgrounds, layers, regions, linked pins and drag/vertex editing. Template selection, click-to-draw polygons, visual-only icon/colour pins, region fill styles, map text overlays and background-replacement verification remain open.
- **World Graph:** filters and personal layouts exist. Search/highlighting, label visibility, isolated-node filtering, node sizing, force parameters (distance/strength/repulsion/collision/gravity) and persistent node pins remain open.
- **Relation Trees:** nodes, typed edges and position variants exist. Relationship-choice UI, endpoint reconnection, solid/dashed/dotted styles, line-to-line junctions, custom icons and annotations remain gaps.
- **Canvas:** object/group/drawing foundations exist. Grid/lined/dotted page presets, complete shape authoring, embedded Map/Graph objects, draggable notes and Gallery/clipboard/image-search insertion remain gaps.
- **Wiki:** no working Wiki editor/reader yet. Site title/description/banner, reader search, featured-card grid/order, themes/palettes/fonts, visibility controls, custom domain and synced direct editing remain open.
- **Quill:** not implemented. Story/cover, chapters/drafts, rich-text editor/slash menu, contextual panel, card creation/linking from prose, anchored notes, text effects, audio, reader previews, exports and chapter-level publication remain open.

The videos provide first-party spoken evidence, not exact visual specifications. Geometry, styling, hover/press states and animation timing still require visual inspection.
