# Official YouTube Tutorial Research

- Research date: 10 November 2026
- Product: https://vvd.world/
- Official channel: https://www.youtube.com/@vvdworldbuilding
- Playlist: https://www.youtube.com/playlist?list=PLWsAD8ivimeDpt34c3xeuQKskechI-1Sg
- Playlist metadata: 10 videos; last updated 13 July 2026.
- Evidence: all ten videos exposed manual English caption tracks. The notes paraphrase spoken workflows; timestamps are caption-segment start anchors.
- Limit: frames were not inspected frame-by-frame. This verifies spoken feature behaviour, not exact geometry, styling, animation timing or every visible control.

## 1. Creating your first world — 0:48

https://www.youtube.com/watch?v=vfvr-cHWwaA

vvd is described as a storytelling toolkit for turning ideas into structured fictional worlds. Lore organisation, interactive maps, writing and a shareable Wiki belong in one product. Card creation is the low-friction starting point; a creator can begin with one idea and expand without planning an entire universe first. Fantasy, science fiction, romance and cyberpunk are examples, not a restrictive genre list.

**Implication:** world creation should lead quickly to a useful first-card flow. Genre guides defaults without constraining taxonomy.

## 2. UI and editor overview — 1:16

https://www.youtube.com/watch?v=OnrJAYlc-Wc

The main creation surface is the World tab. The upper-left world control switches worlds and edits name, description, genre and main image. The upper-right area includes tool updates, feedback/bug reporting, music Radio and a route to the world list. The left sidebar organises/searches content; the centre is the primary creation/editing area. Top-level tabs are Home, World, Wiki and Quill. Settings include plan management, member invitations, appearance and language.

**Gap:** the current PR shell is only a subset of the product navigation and world settings.

## 3. Cards and card types — 2:24

https://www.youtube.com/watch?v=zSL9EHMzvVc

Cards represent world elements such as characters, locations, items, events and magic systems. They can be created from workspace/sidebar actions, renamed, given a different image, aliases and properties. Body blocks include text, photos, maps, stat blocks and TTRPG character sheets. Types influence guided sections such as background, personality and appearance. The tutorial describes genre-based defaults, custom types/subtypes, reusable type-level properties and additional per-card properties.

**Gap:** current Character/Place/Faction templates use a fixed entity enum. Custom types/subtypes, genre-seeded taxonomies and richer block templates are missing. Creator taxonomy is distinct from the technical document-type registry.

## 4. Card organisation — 1:04

https://www.youtube.com/watch?v=FvVBNqRtDFs

Search by name; filter by document/card type; sort manually, by creation date or alphabetically; drag to reorder. A context action pins a card to the top and enlarges its image. Folders have names and icons. Dragging a card onto another creates a parent/child organisation relationship.

**Gap:** current sidebar has search and nested folders, but not pinned/enlarged cards, sort/filter controls, manual order, folder icons or card-to-card hierarchy. A folder is not the same as a parent/child card relation.

## 5. Interactive maps — 3:13

https://www.youtube.com/watch?v=sV1EGt0s8MI

Maps use a library template or uploaded illustration as a background. Dragging a card onto the map creates a linked pin that opens the source card. Context actions can create pins, including visual-only pins with their own icon and colour and no backing card. Regions/zones are drawn by placing vertices and closing the polygon on its first point. Regions can be labelled, linked to cards, edited with extra perimeter points, styled by colour/opacity/fill pattern and assigned to layers. Layers separate content and can be hidden/shown. Text overlays support font, size, scale, layer, letter spacing and arched text. Replacing the background is described as retaining overlays; maps auto-save and can be named.

**Gap:** current map implementation has backgrounds/layers/regions/linked pins and drag/vertex editing, but lacks template selection, click-to-draw polygons, visual-only styled pins, region fill styling, text overlays and background replacement verification.

## 6. World Graph — 1:48

https://www.youtube.com/watch?v=8_TXF5VQvgE

The graph shows the whole world to reveal relationships, clusters and gaps. Edges arise from text mentions and properties. Search highlights matching cards; filters use types/subtypes. Settings include label visibility, hiding isolated nodes, node-image size and force controls for link distance, strength, repulsion, collision and horizontal/vertical gravity. Nodes can be pinned so later layout changes do not move them. A configuration can be saved and reopened.

**Gap:** current graph has edge/entity filters and personal layouts, but not search/highlight, labels toggle, isolated-node filter, node-size control, force settings or persistent node pins.

## 7. Wiki and publishing — 1:58

https://www.youtube.com/watch?v=LmAh0vy2Ss4

Cards/maps become Wiki pages when Wiki visibility is enabled. The editor provides site title, description, banner, reader search and a configurable featured-card grid/order. Styling offers themes, custom palettes and separate heading/body fonts. Publishing can use a custom domain. Public readers see the Wiki, not the private creator workspace. The tutorial describes live updates from the World and direct card editing in the Wiki with changes synced back.

**Gap:** current repository has product/data research but no working Wiki editor/reader or these creator controls. Keep canonical records in the world and Wiki presentation settings in the Wiki project.

## 8. Canvases — 1:58

https://www.youtube.com/watch?v=D11mR_W51h0

Canvas is a spatial workspace for brainstorming and mood boards. Cards dragged from the sidebar remain interactive and open their source card. Pen tools support annotation, circles, arrows and freehand notes; notes can be dragged in. Page backgrounds include grid, lined and dotted styles. Existing Maps, cards and World Graphs can be inserted from a picker. Text boxes and configurable shapes include arrow lines, rectangles, clouds and bubbles. Sections group everything within their frame. Images can be inserted from Gallery, clipboard or image search. A hand tool and middle-mouse gesture pan the workspace.

**Gap:** current object/group/drawing foundation does not yet provide page presets, complete shape authoring, embedded Map/Graph objects, draggable note objects or all image-import paths.

## 9. Relation Trees — 2:42

https://www.youtube.com/watch?v=F0xAfgrUcaI

Nodes can reference character cards or remain independent with a label. Directional add controls offer relationship choices (family, partner or custom icon/type). Edges can be drawn/reconnected by dragging endpoints; hover reveals relationship. Line styles include solid, dashed and dotted. A line may branch from another line to create a junction. Freehand and text annotations are available. Named variants represent relationship states over a story and can be switched/compared.

**Gap:** current model has independent nodes, typed edges and position variants. Relationship-choice UI, endpoint reconnection, edge styles, line junctions, custom icons, annotations and full relationship-state variants remain missing.

## 10. Quill — 4:26

https://www.youtube.com/watch?v=-2O6tdbXX4c

Quill supports chapters, short stories, novels and screenplays alongside the same world data. Story setup includes a 3D book preview, title, book style, cover art and cover-text placement. The workspace has chapter/draft navigation on the left, central editor and contextual worldbuilding panel on the right. Toolbar supports text styling/images/headers; a focus timer and slash insertion menu add headings, dividers and quotes. Context blocks include cards, notes, mood boards and World Graph; they can be added, moved, resized and opened in multiple tabs. Drafts can be switched/compared; styling can be light, dark or world theme. Selecting prose can create/link a world card, attach a chapter note/comment or apply visual text effects. Existing mentions can be highlighted. Audio Mode supports line-level effects and section-level ambience/music, library/uploaded audio and playback preview. Publish mode previews web/mobile/e-reader, adjusts cover/theme/reading mode/background/fonts/chapter layout, and selects chapters plus draft for publication/export.

The tutorial says PDF, DOC and EPUB export. Help-centre Quill material says PDF, DOCX and EPUB. Keep DOC versus DOCX unresolved until current export is inspected.

**Gap:** Quill remains unimplemented in this repository.

## Cross-cutting requirements

1. One canonical world data model; Maps, Graph, Trees, Canvas, Quill and Wiki are connected views/editors.
2. First-card creation should be immediate; advanced setup is optional.
3. Creator taxonomy is distinct from technical document types.
4. Sidebar organisation includes search, filters, sorting, manual order, pins, folders and card hierarchy.
5. Visual-only objects can exist without cards; linked objects resolve to canonical cards.
6. Quill/Wiki project settings remain distinct from canonical world records.
7. Public reader access must never imply private workspace access.

## Parity summary

| Area | Existing PR #2 foundation | Tutorial-derived missing work |
| --- | --- | --- |
| Workspace | World editor, library, inspector, graph/tool routes | Home/World/Wiki/Quill shell, world settings, Radio, updates/feedback |
| Cards | Character/Place/Faction templates | Custom types/subtypes, genre defaults, rich blocks |
| Sidebar | Search, nested folders | Pin, sort/filter, manual order, folder icons, card hierarchy |
| Maps | Background, layers, regions, linked pins | Template library, polygon authoring, visual-only styled pins, zone styling, text overlays |
| Graph | Reference/mention edges, filters, saved layouts | Search, labels/isolate controls, node sizing, force parameters, pinned nodes |
| Trees | Nodes, typed edges, position variants | Edge styles/reconnect, line junctions, relationship icons, annotations, state variants |
| Canvas | Objects, groups, drawing | Page styles, full shapes, embedded tools, notes, import paths |
| Wiki | Research/model only | Editor/reader, visibility, site identity, search/grid, themes, fonts, synced editing |
| Quill | Specification only | Story/cover, chapters/drafts, editor/context panel, notes/effects, audio, preview, export, publication |

All ten videos were retrieved from the official playlist through manual English captions on 10 November 2026. Timestamps above are navigation anchors, not claims that every visual action occurs at that exact second. Spoken captions do not establish private schemas, source code, infrastructure, plan availability or precise visual design.
