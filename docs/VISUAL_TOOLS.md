# Visual Tools — Data and Interaction Contract

This document describes the first persisted reconstruction slice for Maps, Relation Trees, Canvas and Timeline. These are first-party surfaces in this repository; the models below are implementation choices and are not claims about VVD's private internal schemas.

## Shared rules

- Every visual document belongs to a world and one era.
- The active world membership is checked for every read and write; writes require an owner, admin or editor role.
- Each document has a stable id and monotonic version. Updates must send `expectedVersion`; stale saves return a conflict instead of overwriting newer content.
- The API caps payloads at 1.4 MB and validates geometry, collection sizes, event dates and stable item ids.
- References to cards and Gallery media must resolve to active/ready assets in the same world. The browser never establishes its own access authority.
- DOM/SVG are used for the initial tool surfaces. WebGL remains reserved for the dense World Graph; a map or canvas does not need an always-on 3D runtime.

## API

- `GET /v1/worlds/{slug}/visual-tools/{kind}?eraId={id}` lists documents for the selected era.
- `POST /v1/worlds/{slug}/visual-tools/{kind}` creates a document. Body: `{ eraId?, name, data }`.
- `PATCH /v1/worlds/{slug}/visual-tools/{kind}/{id}` updates a document. Body: `{ expectedVersion, name, data }`.

Kinds are `map`, `relation_tree`, `canvas` and `timeline`. All four are registered as ready and enabled for existing and newly created worlds. The workspace exposes individual routes under `/worlds/{slug}/tools/{kind}`.

## Map

Data is a JSON object with `width`, `height`, `layers`, `regions` and `pins`.

- Region points and pin locations use normalized x/y coordinates between zero and one.
- Regions have at least three points and may link to a canonical card.
- Pins have a label and may link to a canonical card.
- Layers persist name, visibility, lock and opacity settings.

Current boundary: the editor supports Gallery-image backgrounds, adding and renaming regions, adding linked pins and editing their normalized positions. Dragging polygon vertices, georeferencing, full layer controls, zones and richer pin styling remain outstanding.

## Relation Tree

Data has `nodes`, `edges` and `variants`.

- Nodes are independent spatial objects and may link to a canonical card.
- Edges are explicit, typed relationships between two different nodes in the same tree.
- A link to another card does not create a duplicate card.

Current boundary: the editor creates nodes and typed edges, edits node positions, and lets users change each edge's type and label. Alternate-structure variants, free draw and advanced edge routing remain outstanding. Relation Tree edges are never merged with World Graph mention edges.

## Canvas

Data has `objects` and `strokes`.

- Objects are positioned using normalized x/y and width/height; supported kinds are card, text, image, shape and group.
- Card and media objects retain canonical references instead of duplicating their source.
- Drawing strokes store bounded point arrays with normalized coordinates.

Current boundary: the editor can place cards, text notes and private Gallery images; select, drag, resize and delete objects; and undo/redo up to 40 recent edits. Group editing, freehand drawing UI and richer object tools remain outstanding.

## Timeline

Data has a `calendar` and `events`.

- Calendars define a name and an ordered list of months with explicit day counts.
- Events use integer year/month/day values validated against those month lengths.
- Events may link to a canonical card.

Current boundary: the editor supports calendar/month renaming and day-count changes, safe month add/remove, and event editing/removal. Weekday schemes, leap/irregular rules, recurring dates, event ranges and conversion utilities remain outstanding. Community calendar tools remain separate from this built-in Timeline model.

## Security and correctness

The Rust API validates data before persistence. Database constraints enforce the world, era and tool-kind relationships. Card/media references are checked against the same world and active/ready state. The API uses expected-version updates to reject stale writes. UI visibility is not the permission boundary.

## Verification

The PostgreSQL integration suite exercises all four kinds, era scoping, same-world card references, invalid relation edges and stale update conflicts. Full parity still requires UI interaction tests, keyboard/touch/stylus coverage, visual regression tests and direct inspection of authenticated reference-app workflows.
