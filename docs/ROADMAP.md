# Roadmap

The roadmap follows dependency order. The shared world/document model has to work before the graph, Quill and publishing surfaces can be trusted.

## Phase 0 — Research and reference capture

- [x] Establish public source register and evidence levels.
- [x] Separate older creator UI instructions from current developer platform concepts.
- [x] Document the core product model and major relationship invariants.
- [x] Inventory the documented tools and workflows.
- [x] Record the accepted frontend and rendering directions.
- [ ] Capture authenticated current workspace screens at desktop and tablet sizes.
- [ ] Verify current plan entitlements and account purchase channels.
- [ ] Verify current import/export, era and restore behaviour.

Exit condition: foundational behaviours are either directly observed or clearly marked as proposed.

## Phase 1 — Application foundation

- Create the Next.js App Router app with strict TypeScript.
- Add route groups for public, authenticated and published-reader surfaces.
- Establish the session/auth boundary and route protection.
- Add design tokens and core interface primitives: navigation, panels, menus, dialogs, split views, toasts and empty states.
- Add accessibility and reduced-motion foundations.
- Add formatter, linter, type-check, unit-test and CI build commands.

Exit condition: the app runs with a tested shell and no fake persistence.

## Phase 2 — World and document engine

- Model account, world, membership and roles.
- Create and switch worlds.
- Implement document metadata, nested folders and registered document types.
- Define card types, templates and typed properties.
- Define typed content schemas and mutation operations.
- Implement era inheritance/resolution.
- Add aliases, references and search.
- Add revision history, archive and restore.

Exit condition: a world can hold typed canonical records and resolve references correctly across eras.

## Phase 3 — Editor and media

- Build the document library/sidebar and multi-document workspace.
- Build card create/view/edit.
- Add properties, images and ordered body blocks.
- Add private media upload and Gallery.
- Add mention resolution, manual linking and Entity Detection behaviour where verified.
- Add offline status and failure/recovery UX.

Exit condition: cards and media work end-to-end with permissions, history and tests.

## Phase 4 — Visual worldbuilding

- World Graph from the documented mention/property relationships.
- Maps with image backgrounds, layers, zones, labels and pins.
- Relation Trees with independent nodes, typed edges and variants.
- Canvas with cards, images, text, groups and drawing.
- Timeline with calendar and typed event operations.
- Trade Routes: settlement resources, road/river networks and supply-flow simulation; verify mechanics against the current core tool.
- Calendar/custom-calendar support through the extensible tool system, keeping community tool behaviour distinct from built-in Timeline.
- Tables and specialist tools.

Exit condition: every visual tool uses the shared document model and retains its own relationship semantics.

## Phase 5 — Quill

- Story project, cover, chapters and multiple drafts.
- Collaborative rich-text editor.
- Contextual world-reference panel.
- Mention/alias linking and entity detection.
- General/chapter notes and anchored annotations.
- Focus mode and writing styles.
- Per-draft revision history.
- Audio attachments and player.
- Reader preview, chapter-level publishing and EPUB/PDF/DOCX export.

Exit condition: a writer can draft with live world references, recover revisions, export and publish selected chapters.

## Phase 6 — Collaboration and Workshop

- Yjs-compatible shared document state.
- Durable update storage and snapshots.
- Presence and cursors.
- Offline queue, reconnect and conflict/recovery tests.
- Tool manifests, codecs, capabilities and typed SDK boundary.
- App host, projects and project documents.
- Embedded block surfaces.
- Tool library, install flow and version pinning.
- Private save, team share and reviewed Workshop publication.

Exit condition: two users can edit the same document without silent data loss, and extensions cannot access undeclared capabilities.

## Phase 7 — Wiki and publication

- Wiki app that reads canonical world data.
- Theme and layout editor, including the first-party Default and Overworld templates.
- Map-first Wiki layout with interactive regions/pins and optional animated atmosphere.
- Search, sections, card links and map-pin navigation.
- Public, unlisted, password and entitled audiences.
- Custom domains.
- Immutable publication snapshots and rollback.
- Share-link revoke/rotate flow.

Exit condition: a world can be published without maintaining a second copy of its content.

## Phase 8 — Account and operations

- Central, versioned entitlement configuration.
- Billing and receipt surfaces.
- Storage/usage reporting.
- Collaborator and studio role management.
- Account export and deletion.
- Audit events, observability and backups.
- Security review and restore drills.

Verify prices and plan limits from the live product before implementing checkout.

## Phase 9 — Responsive parity and polish

- Desktop and tablet multi-panel layouts.
- Touch-safe menus, drag alternatives and stylus drawing.
- Reader-first phone layout.
- Profiling for graph, canvas, map, Trade Routes and long Wiki pages; check memory cleanup and GPU costs.
- Optional lazy Three.js Model Viewer.
- Reduced-motion and keyboard navigation audit.
- Visual regression coverage for captured workflows.

## First code slice

The first implementation should be small but vertical:
1. Next.js app shell.
2. World list and world home.
3. One card document type with name, alias, text block and one typed property.
4. Document navigation and open state.
5. Server-side membership enforcement.
6. Tests for access rules and reference integrity.

Do not begin with a 3D scene or a giant Quill editor. The canonical model should be exercised first.
