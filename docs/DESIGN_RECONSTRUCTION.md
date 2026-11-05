# Design Reconstruction

This is the visual and interaction strategy for the rebuild, not a claim that the current authenticated vvd workspace has been measured. Public screenshots and workflow descriptions provide useful clues; exact design tokens, geometry and animation timing are still unknown.

## Product character

The product should feel like a serious creative workspace: quiet enough for writing and focused editing, but capable of opening rich visualisations and connected world information when needed. Its differentiator is not a social feed. It is a living system of world records used across cards, maps, relationships, stories and publication.

Useful motifs found in the public product material:
- A persistent sense of the active world.
- Structured cards with image, identity, properties and rich body blocks.
- Multiple open documents and contextual side panels.
- Spatial surfaces for maps, graphs, trees and canvas.
- A writing-first Quill layout with access to world context.
- A distinct preview/publish mode that separates creation from reading.

## Information architecture

Proposed zones for the reconstruction:
- Account and world selection.
- World home and overview.
- Document library/editor.
- Quill stories.
- Visual tools.
- Tool/app library and Workshop.
- Wiki editing and published reader.
- World settings and collaboration.

This is a proposed route/product structure, not a verified list of current vvd URLs.

## Hierarchy and density

- Keep world identity visible across work surfaces.
- Use a compact global navigation rail/switcher.
- Use a document list with nested groups and an obvious selected state.
- Give each open document a clear title, type and primary actions.
- Put secondary actions in contextual menus or side panels.
- Allow side-by-side references on large screens.
- Let Focus Mode remove workspace chrome from the writing surface.
- Keep tool-specific actions near the content they affect.
- Avoid filling the screen with all possible actions at once.

## Visual surfaces

### Cards

Treat the card as a structured entity page, not a generic note. Separate identity (image/name/aliases/type) from properties and body blocks. Typed property references should navigate to related records and remain live when a target record changes.

### Graph

The older graph is a visual projection of mentions and typed property links. The public visual example suggests a dark grid and node/edge composition, but this is only a visual clue, not a reliable source for exact colour tokens or spacing. The interface needs filter controls, selected-node context and a way to inspect a node without losing graph position.

### Maps

The map's background image is separate from layers, zones, labels and pins. Editing controls should make the active layer and selected overlay unmistakable. Replacing the background must preserve meaningful overlay positions through a defined coordinate/transform model.

### Canvas and Relation Trees

Spatial surfaces need pan/zoom, selection, multi-select, object boundaries, accessible labels and visible mode state. Free-draw mode must not accidentally pan or move objects. Tree edges should have explicit endpoints, typed relationship labels and independent identities.

### Quill

Protect the writing column. The chapter list and contextual panel should be resizable/collapsible without changing the document being edited. Draft/history/notes controls should be easy to find but visually subordinate to prose. Preserve cursor and scroll position when opening world references.

### Wiki

The reader should feel like a finished publication rather than an editor with buttons removed. Prioritise typography, hierarchy, navigation, search, linked records and responsive images.

## Motion and feedback

Use movement to explain state transitions:
- Panel opening/closing and tab/document switching.
- Selection, drag/reorder and drop targets.
- Save/sync, upload, restore and publish progress.
- Graph/map focus and selection.
- Collaborator arrival/departure and cursors.

Avoid perpetual decorative motion, excessive parallax over reading surfaces and delayed interactions. Respect reduced-motion preferences. A transition must not be the only indication that a save or destructive action succeeded.

## Responsive and input strategy

The public product sources describe desktop, iPad/Mac and Android tablet usage. The Android listing specifically promotes large touch targets, long-press menus, dragging between panels, stylus drawing and side-by-side layouts. Older help material cautions against narrow mobile browser use.

Plan distinct behaviours:
- **Desktop:** multi-panel workspace, keyboard shortcuts and dense visualisation.
- **Tablet:** adaptive split panels, touch-safe handles, long-press actions and stylus-aware drawing.
- **Phone browser:** reader and lightweight inspection first unless direct current-app evidence confirms full editing parity.

Support keyboard, pointer, touch and stylus where the feature calls for them. A right-click action needs a long-press or visible menu equivalent.

## Rendering choices

- DOM/CSS for navigation, panels, forms, toolbars, card metadata and text.
- SVG for icons, small graphs and simple diagrams.
- Canvas 2D for moderate 2D drawing and spatial surfaces.
- WebGL for dense/high-volume rendering when profiling demonstrates a benefit.
- Three.js only for genuine 3D models/scenes; lazy-load it and keep the rest of the app independent.

Do not move ordinary page UI into WebGL. That makes accessibility, text selection, focus management and responsive behaviour harder without a product benefit.

## Capture plan for true visual fidelity

Create a synthetic test world and capture the current app at desktop and tablet widths. Needed states:
- World home, switcher, settings and all World Info panels.
- Document sidebar, context menus and multiple open documents.
- Card empty/populated/edit states, property definitions and image crop.
- Map with at least two layers, a region, a label and pins.
- Graph filters, hover and selected-node state.
- Relation Tree node and edge creation, line style and variants.
- Canvas with cards, image, text and free drawing.
- Timeline calendar selection and event editing.
- Quill chapter list, draft chooser, writing toolbar, context panel, notes, focus mode and side-by-side chapters.
- Quill publish preview, styling, export and chapter publication.
- Wiki editor and public reader.
- Collaboration invite/role, Archive, restore and plan view.

Use synthetic content only. Short screen recordings are preferred for drag, menus and transitions. Do not supply passwords, credentials or private writing.


## Visual direction added by Instagram research

The public account's product demonstrations add three visual references that deserve explicit capture:

- **Overworld Wiki:** a map-led public site with interactive regions and pins, cleaner reader UI and animated cloud atmosphere. The map should be treated as navigation, with canonical entries opening from geography. Atmosphere is optional decoration and must not interfere with selection, accessibility or reduced-motion preferences.
- **Trade Routes:** a map-oriented simulation surface in which settlements, roads/rivers and resource flow are visible together. Keep editable network geometry distinct from the base map image and from simulation results. The exact visual encoding and controls are unknown until the current tool is inspected.
- **3D alongside worldbuilding:** a creator showcase puts 3D maps, historical timelines and Quill writing in the same workflow. Do not assume those are all parts of one renderer. The first-party 3D Model Viewer is a separate asset-viewing tool; keep 3D runtime lazy, and profile it independently from 2D Maps and Wiki reading.

The profile also announces creator link-in-bio pages, but the current technical docs do not show their route or layout. If confirmed as an active product surface, design it as a compact creator identity/portfolio page rather than forcing it into the world Wiki or Quill shell.
