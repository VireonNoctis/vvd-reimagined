# Workspace Interaction Map

This page records known workflows from the first-party help centre. It is not a pixel-perfect specification of the current beta UI. Exact locations, dimensions, menus and animations must be captured from the authenticated application.

## Navigation shell

The older overview describes:
- A world switcher and account-settings access.
- The selected world name returning to the world home.
- A nearby disclosure opening World Info.
- A plus control opening another tab.
- A New Tab search surface that can open Editor, Wiki, Quill or Tools.
- Workspace utilities such as Radio, Clock and Feedback.

The overview defines a workspace that contains these surfaces and tabs. The newer developer model uses world/project/app/tool nouns for data and extension architecture. Both vocabularies can be represented without assuming that every tab is a project.

## World Info

The support material lists these sections:

| Area | Described responsibility |
| --- | --- |
| World Info | Edit name, description and genre |
| Types | Manage card types and templates |
| Media | Open the Media Gallery |
| Collaboration | Invite collaborators and set roles |
| Site & Domain | Manage vvd subdomain, custom domain and published wiki/story links |
| Theme | Set the world theme |
| Import | Import external worldbuilding/writing files; described as beta |
| Export | Export world data |
| Preferences | Entity Detection, Auto-Link Mentions and delete-world action |
| Archive | Search deleted documents, restore them or permanently delete them |

These are older workflow labels. Current placement and availability need direct capture.

## Document sidebar

The World Editor is described with a vertical organiser on the left. Known actions:
- Create a new document from an empty workspace area or a sidebar context action.
- Choose a card type/subtype when creating a card.
- Change a card's type from its card window.
- Right-click a sidebar item for rename, delete or nested document creation.
- Rearrange sidebar items.
- Keep multiple documents open.

Inspect these cases during reference capture:
- Dragging into a folder versus reordering.
- Moving a document between folders.
- Duplicate names and slug collisions.
- Archive versus permanent deletion.
- Multiple open documents at narrow widths.

## Card editing

The documented card structure includes:
- Name and optional alias.
- Type/subtype.
- Optional image with replace/crop/rotate/remove actions.
- Properties under the card identity.
- Ordered body blocks: text, media and embedded tools.
- Type templates.

Entity Detection and Auto-Link Mentions are not the same operation. Detection identifies candidate entities that may deserve a card. Auto-linking resolves text mentions of existing cards. Quill also documents manual linking by selected text or at-sign lookup.

## World Graph

The help article says graph links can be created from card name/alias mentions and typed properties. The graph can filter card types and has settings. Hovering highlights a card's connections; nodes can be dragged and pinned.

This graph is conceptually different from a Relation Tree. Do not create a single generic graph model that silently equates all relationships.

## Relation Trees

The help article describes:
- A new tree starting with an empty node.
- Adding nodes through directional controls or an Add Node action.
- Nodes linked to cards or independent nodes with custom names.
- Creating a connection by selecting a relationship type.
- Reconnecting lines by dragging endpoints.
- Adjusting line junctions.
- Solid, dashed and dotted line styles.
- Multiple variants for the same tree.
- Free drawing and external text labels.
- A character-tree example with a deceased-state action.

It explicitly says property links do not create tree links and tree links do not create card/graph links. One older article says custom relationship types are not saved; verify current behaviour before implementing that limitation.

## Maps

The map is described as a background image with structured overlays, not as a tool that builds the base cartography itself.

Known controls:
- Add and rename layers.
- Create text labels, pins and zones within a layer.
- Create a pin from a context action or drag a card to the map.
- Create a zone by placing vertices and closing its polygon.
- Edit a finished zone and add/remove vertices.
- Merge neighbouring zone boundaries by moving vertices together.
- Hold Shift while dragging to separate shared borders.
- Style zone name font, size, colour, fill, pattern and opacity.
- Replace the background while retaining overlays.

The exact coordinate transform when the background aspect ratio changes is not documented. This is a critical data-integrity question for the rebuild.

## Canvas and Timeline

Canvas is described as a mind-map/moodboard tool for cards, images, text, groups/sections and free drawing. Exact snapping, multi-select, zoom and collaboration semantics are unknown.

Timeline content is documented in the current API as typed events, with label/date/optional description/precision. The older help centre describes calendar types, including custom calendars, and marks the tool beta. Verify current calendar setup, date representation, event-card links and sorting behaviour.

## Quill

See [Quill](QUILL.md). The documented layout is chapter list + central writing surface + collapsible context panel. The side panel contains focus, drafts, notes, styling, world docs and detected cards. The lower menu opens Audio Mode or Publish Mode. Multiple chapter/document panes can be opened side by side.

## Wiki and reader

The older help centre describes a reader layout with search, sections, inline card links and map pins. The current developer docs define Wiki as an app that reads world documents and publishes a themed site. It should not maintain duplicate card/map/note records.

The wiki's current exact editor, layout editor and reader shell need screenshot/recording evidence.

## Interaction principles for our implementation

- Context menus must work on touch as well as pointer. Right-click should not be the only entry point.
- Drag interactions need keyboard or visible-menu alternatives.
- Modals should return focus to their trigger on close.
- Side panels may resize where it helps, but remember layout only intentionally.
- Save, upload, restore and publish operations need visible progress and failure states.
- Archive, restore, permanently delete, remove and unpublish are distinct operations.
- Opening a reference must preserve writing cursor and scroll position.
- Major surfaces need empty, loading, offline, read-only, error and permission-denied states.
