# Roadmap

The shared world/document model must work before graph, Quill and publishing surfaces can be trusted.

## Phase 0 — Research and reference capture

- [x] Establish public source register and evidence levels.
- [x] Separate help-centre UI descriptions from current developer platform concepts.
- [x] Document the core product model and major relationship invariants.
- [x] Inventory documented tools and workflows.
- [x] Record accepted frontend and rendering directions.
- [ ] Capture authenticated current workspace screens at desktop and tablet sizes.
- [ ] Verify current plan entitlements, import/export, eras and restore behaviour.

## Phase 1 — Application foundation

- [x] Create the Next.js App Router scaffold with strict TypeScript.
- [x] Add the world selector and responsive workspace shell.
- [x] Add a searchable document library and card detail view backed by a synthetic fixture.
- [x] Define typed card records, scalar properties and canonical document references.
- [x] Add reference navigation, initial design tokens and reduced-motion support.
- [x] Add domain integrity tests and configure application CI.
- [ ] Generate and commit a package lockfile.
- [ ] Run install, lint, type-check, tests and production build successfully.
- [ ] Establish the real session/auth boundary and route protection.
- [ ] Add distinct public, authenticated and published-reader route boundaries.

The application currently has a read-only preview, not real authentication or persistence. CI configuration is in place, but its first complete run remains the verification gate.

## Phase 2 — World and document engine

- Model account, world, membership and roles.
- Create and switch persisted worlds.
- Implement document metadata, nested folders and registered document types.
- Define card types, templates and typed properties.
- Define typed content schemas and mutation operations.
- Implement era inheritance/resolution.
- Add aliases, references and search.
- Add revision history, archive and restore.

Exit condition: a world can hold typed canonical records and resolve references correctly across eras, with membership enforced server-side.

## Phase 3 — Editor and media

- Build card create/view/edit against validated server operations.
- Add properties, images and ordered body blocks.
- Add private media upload and Gallery.
- Add mention resolution, manual linking and verified Entity Detection behaviour.
- Add offline status and failure/recovery UX.

## Phase 4 — Visual worldbuilding

- World Graph from mention/property relationships.
- Maps with image backgrounds, layers, zones, labels and pins.
- Relation Trees with independent nodes, typed edges and variants.
- Canvas with cards, images, text, groups and drawing.
- Timeline with typed events and calendar behaviour.
- Trade Routes settlement resources, road/river networks and supply-flow simulation.
- Extensible custom-calendar support, keeping community tools distinct from built-in Timeline.
- Tables and specialist tools.

## Phase 5 — Quill

- Story project, cover, chapters and multiple drafts.
- Rich-text editor and world-reference panel.
- Mention linking, notes, anchored annotations and focus mode.
- Per-draft history, audio and reader preview.
- Chapter-level publishing and EPUB/PDF/DOCX export.

## Phase 6 — Collaboration and Workshop

- Yjs-compatible shared state, durable updates and snapshots.
- Presence, offline queue, reconnect and conflict/recovery tests.
- Tool manifests, codecs, capabilities and typed SDK.
- App host, projects, embedded blocks and tool installation/versioning.
- Save, share and reviewed Workshop publication.

## Phase 7 — Wiki and publication

- Wiki app reading canonical world data.
- Default and Overworld templates.
- Map-first layout with interactive regions/pins and optional atmosphere.
- Search, sections, card links and audience modes.
- Immutable publication snapshots, custom domains and rollback.

## Phase 8 — Account and operations

- Central versioned entitlements.
- Billing, receipts and usage reporting.
- Collaborator/studio role management.
- Account export/deletion, audit events, observability and backups.
- Security review and restore drills.

## Phase 9 — Responsive parity and polish

- Desktop/tablet multi-panel layouts, touch-safe menus and stylus drawing.
- Reader-first phone layout.
- Profile graph/canvas/map/Trade Routes and long Wiki pages.
- Optional lazy Three.js Model Viewer.
- Reduced-motion, keyboard and visual regression coverage.

The next implementation milestone is the server boundary: identity, world membership, canonical document persistence and validated read/write operations. Do not add client-only CRUD or pretend saves while that boundary is missing.
