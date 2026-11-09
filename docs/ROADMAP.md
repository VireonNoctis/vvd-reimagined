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
- [x] Run frontend install, lint, type-check, tests and production build successfully.
- [x] Finish Rust formatting, Clippy, PostgreSQL migration/integration tests and release build in CI.
- [x] Establish the Rust API session boundary and server-side world membership checks.
- [x] Connect Next.js to the API through a same-origin proxy, sign-in/register/logout and session-aware server reads.
- [x] Add account password changes with current-password verification, current-session rotation and revocation of other sessions.
- [x] Add one-action revocation of all other active sessions while preserving the current browser.
- [ ] Add distinct public, authenticated and published-reader route boundaries.

Without VVD_API_URL the app remains a read-only preview. With it configured, account sessions, world reads/creation and version-checked card edits use the Rust API.

## Phase 2 — World and document engine

- [x] Model accounts, sessions, worlds and membership roles in PostgreSQL.
- [x] Create persisted worlds and assign their creator the owner role.
- [x] Store canonical card identities, aliases, typed properties and ordered text blocks.
- [x] Add membership-checked list/read/create/update API operations.
- [x] Make card writes transactional and version-checked; enforce same-world references with composite foreign keys.
- [x] Connect the Next.js world library and card editor to API-backed reads and version-checked writes.
- [x] Implement nested folders and move cards between folders.
- [x] Add a document type registry and per-world allow-list; Card, Map, Timeline, Relation Tree and Canvas have ready typed content handlers.
- [x] Add per-subtype card templates with property definitions, starter blocks and required-field validation on create and edit.
- [x] Add revision history, archive and restore.
- [x] Add named eras that inherit from a parent by reference, with sparse field-level overrides, recursive resolution and version checks across ancestor changes. Current slice is limited to edits of canonical cards; branch-local additions, per-era tombstones and era-specific revision history remain open.
- [x] Add aliases, typed references and searchable document names, aliases and entity types.

Exit condition: a world can hold typed canonical records and resolve references correctly across eras, with membership enforced server-side.

## Phase 3 — Editor and media

- [x] Build card create/view/edit against validated, version-checked server operations.
- [x] Edit text and linked-record properties and all ordered text blocks, including add/remove/reorder.
- [x] Attach ready private Gallery assets to canonical cards; render image attachments in the reader and provide inspector attach/detach controls.
- [ ] Add typed media properties and embedded audio/video blocks, including era-specific media overrides.
- [x] Add private media upload and Gallery (provider setup remains deployment-owned).
- [x] Add bounded expiry cleanup for abandoned/rejected uploads, with retryable object deletion.
- Add mention resolution, manual linking and verified Entity Detection behaviour.
- Add offline status and failure/recovery UX.

## Phase 4 — Visual worldbuilding

- [x] Initial read-only WebGL 2 World Graph for typed property references, with draggable nodes, panning and canonical record navigation.
- [x] Derive unambiguous mention edges from canonical card names and aliases in body blocks; keep them distinct from typed references and Relation Tree edges.
- [x] Add independent edge-kind and entity-type filters; graph reads the selected era's resolved records.
- [x] Add personal saved layouts per world/era with node positions, viewport state and independent filters; use optimistic versions and server-side node validation.
- [x] Add mention evidence drill-down with bounded source excerpts and originating block ids.
- [ ] Add saved graph sharing and manual graph edges.
- [x] Add world- and era-scoped, versioned Map documents with normalized regions, map layers and linked pins.
- [x] Add Relation Tree documents with independent nodes, explicit typed edges and canonical card links.
- [x] Add Canvas documents with positioned card/text/media/shape/group objects and bounded drawing-stroke data.
- [x] Add Timeline documents with configurable month lengths, dated events and canonical card links.
- [x] Add Gallery-image map backdrops, layer visibility/opacity/locking, and directly draggable region vertices and pins.
- [ ] Add image georeferencing, polygon authoring, zone styling and richer pin symbols.
- [x] Add draggable Relation Tree nodes, typed edge labels/types and saved layout variants.
- [ ] Add alternate relationship structures, free draw and richer edge routing.
- [x] Add Canvas selection, drag/resize, object deletion, Gallery image placement and bounded undo/redo.
- [ ] Add Canvas grouping, freehand drawing UI and richer object tools.
- [x] Add editable calendar/month names and lengths, guarded month removal, editable/removable events and validated custom weekday cycles.
- [ ] Add weekday arithmetic anchors, leap/irregular rules, recurring events and event ranges.
- Trade Routes settlement resources, road/river networks and supply-flow simulation.
- Extensible custom-calendar support, keeping community-created calendars distinct from built-in Timeline.
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
- [x] Account security event history for successful sign-ins/sign-outs, password changes and remote-session revocations (90-day retention; latest 50 visible).
- [ ] Account export/deletion, world-wide audit events, observability and backups.
- Security review and restore drills.

## Phase 9 — Responsive parity and polish

- Desktop/tablet multi-panel layouts, touch-safe menus and stylus drawing.
- Reader-first phone layout.
- Profile graph/canvas/map/Trade Routes and long Wiki pages.
- Optional lazy Three.js Model Viewer.
- Reduced-motion, keyboard and visual regression coverage.

Authentication has PostgreSQL-backed 15-minute throttles, best-effort session device labels, current-password-confirmed password changes and session rotation/revocation. Cards keep immutable JSONB snapshots on edits and moves; members can inspect prior versions, restore a snapshot with optimistic concurrency, and archive/restore records without deleting canonical IDs or references. Nested folders support child folders, rename/reparent and version-checked card moves. Email verification/recovery still needs a configured mail-delivery provider; MFA, private-media operations, collaboration and the remaining recovery paths remain open. The connected sign-in/world/card path and first WebGL graph are already implemented; do not mark the reconstruction production-ready while hardening and recovery paths remain open.
