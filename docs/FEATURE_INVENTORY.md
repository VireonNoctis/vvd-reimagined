# Feature Inventory

This is the working inventory of product capabilities found in vvd's public material. It deliberately records evidence limits. A described feature is not automatically implemented in this repository.

Evidence labels: **A** current developer docs; **B** current product or store listing; **C** help-centre workflow; **D** reconstruction proposal/inference.

## Implementation status in this repository

The current application includes:

- A world selector backed by one synthetic world fixture.
- A responsive workspace shell with a navigation rail, searchable document library and details inspector.
- Typed card records with names, aliases, text blocks and scalar properties.
- Canonical card references that navigate to the referenced document rather than copying its content.
- Domain tests for stable lookup, reference resolution and duplicate/missing reference detection.
- A same-origin Next.js API proxy, login/register/logout UI, session-aware server-rendered world library and persistent world creation.
- A connected card editor for name, aliases and the first text block; remaining blocks and typed properties are preserved and card updates use the server version.
- A read-only World Graph rendered with WebGL 2 from valid typed card references. Nodes can be selected, dragged and panned; the DOM inspector and record list provide accessible navigation and links back to canonical records.
- A Rust/Axum API with PostgreSQL migrations for accounts, Argon2id password hashes, hashed opaque sessions, worlds, world memberships, canonical card documents, properties and ordered text blocks.
- Membership-checked world and card reads, world/card creation, and atomic version-checked card updates. Composite foreign keys keep card references inside their world.

The graph is a derived view, not an editor or a second source of truth. Its temporary node positions are not saved; mention-derived edges, filters and era-aware projections remain future work.

When VVD_API_URL is set, the app uses the Rust API for account sessions, world membership, world reads/creation and card edits. The editor submits expected-version mutations and renders conflicts/errors without claiming a save before the API confirms it. With no API configured, the synthetic fixture remains deliberately read-only. Uploads, collaboration, Quill and publishing remain outstanding.

## Backend and persistence

| Capability | Current implementation | Boundary |
| --- | --- | --- |
| Accounts and sessions | Rust API registration/login/logout/current-account endpoints; Argon2id hashes and hashed opaque session tokens | Email verification, recovery, rate limiting and device/session management remain open |
| World membership | PostgreSQL roles: owner, admin, editor and viewer; server checks on each world/document operation | Studio roles and invitations are not implemented |
| Canonical documents | PostgreSQL card identities with aliases, scalar/reference properties and ordered text blocks | Cards are the only registered type in this slice |
| Reference integrity | Composite foreign keys prevent cross-world references | Era-aware references remain future work |
| Card mutations | Transactional create/update and expected-version checks; connected card editor uses expectedVersion | Revision history, archive and restore are outstanding |
| Media | No upload adapter yet | S3-compatible storage deferred until media work |

## Workspace and navigation

| Feature | Publicly described behaviour | Evidence | Confidence note |
| --- | --- | --- | --- |
| World switcher | Move between worlds and reach account-level settings | C | Current exact position unknown |
| World home | Home surface for a selected world; older help material links to graph | C | Current home modules unknown |
| World Info | World details, types, media, collaboration, site/domain, theme, import/export, preferences and archive | C | Some options marked beta |
| Tabs | Open multiple work surfaces; search and open Editor, Wiki, Quill or Tools | C | Tab persistence and shortcuts unknown |
| Document sidebar | Nested organiser for cards and other world documents | C | Older layout reference |
| Radio | Pinned or selected station in workspace/Quill side panel | C | Service catalogue unknown |
| Clock | Workspace utility | C | Exact behaviour unknown |
| Feedback | Host-routed feedback control | C/A | SDK host includes feedback capability |
| Account settings | Profile, sign-in, plan and storage management | C | Exact current screen unknown |

## Cards and world records

The current and older sources together describe:
- Reusable cards for characters, locations, factions, items, creatures and other entities.
- Name, aliases, type/subtype, optional image, properties and body blocks.
- Property values as text/scalar or references to other cards.
- Per-card and type-level properties.
- Type templates that provide default fields/structure.
- Card body blocks for text, media and embedded tool content.
- Mention and alias linking to existing cards.
- Optional Entity Detection for potential new entities.
- Optional Guided Templates to reorganise user-supplied content into a template.
- Image crop/rotate/replace/remove actions in older card UI guidance.

Do not portray Entity Detection or Guided Templates as generative writing. Their documented role is organisation and identification.

## Connections and visual tools

| Tool | Described capability | Evidence | Caveat |
| --- | --- | --- | --- |
| World Graph | Visualises links from card mentions and typed properties; filters and node interactions | C | Do not merge with Relation Tree edges |
| Maps | Base image, layers, labels, pins, zones/regions, card-linked overlays | C | Base image is sourced/uploaded, not generated by map tool |
| Relation Trees | Nodes, explicit typed edges, independent or card-linked nodes, variants, free draw and labels | C | One older page says custom relation types are not saved |
| Canvas | Mind-map/moodboard surface with cards, images, text, groups and drawing | B/C | Current object model and gestures unknown |
| Timeline | Events and calendar configuration, including custom calendars in older help | A/C | API documents typed timeline operations; editor marked beta |
| Tables/sheets | Structured tabular data for inventories and numbers | B/C | Cell/formula semantics need capture |
| Notes | Worldbuilding notes and Quill notes/annotations | C | Scope and anchoring rules not fully described |
| Conversation | Named in older built-in tools list | C | Exact feature behaviour unknown |
| 3D Model Viewer | Named in older tools list | C | SDK has lazy shared Three loader; viewer controls unknown |
| Radar Chart | Named in older built-in tools list | C | Data binding/configuration unknown |
| Embed | Named in older built-in tools list | C | Accepted embed sources/security unknown |
| Character/stat sheets | D&D 5e, Call of Cthulhu and Daggerheart sheets/stat blocks appear in tool list | C | Exact schemas and rules unknown |

The older Tools help page names Canvas, Notes, Conversation, Maps, Relation Trees, two D&D 5e character sheets, D&D 5e Stat Block, Call of Cthulhu Character Sheet, Daggerheart Character Sheet, Daggerheart Adversary Stat Block, 3D Model Viewer, Radar Chart, Embed and Tables as vvd-owned tools.

The marketing site highlights example tools such as Travel, Terminal, Spotify and a 5e character sheet. These examples should not be treated as proof that all are built-in or available on every account.

## Media Gallery

The help centre describes a Gallery of images used across a world, with visibility into which cards reference an image and tag-based filtering/sorting. It documents starter images and user uploads. Do not copy commissioned reference artwork into this project; use original or properly licensed sample media.

Audio, cover images, map backdrops, and 3D model assets are separate file types in the reconstruction design even if the reference UI surfaces them through one media picker.

## Quill

See [Quill](QUILL.md) for the detailed workflow. Current public material describes stories, chapters, drafts, a writing surface, contextual world references, notes, styling, audio, history and publishing/export.

## Wiki and public surfaces

- Wiki is an app that reads a world rather than maintaining its own copy of every card/map/note.
- It can present a reader-friendly site with search, sections, inline card links and map pins.
- The current developer wiki reference describes theme fields and audience modes: public, unlisted capability URL, password and entitled.
- Public pricing material describes invite-only publishing, public/password publication and custom domains at different tiers.
- The older help centre documents desktop/tablet preview modes and configurable title/description/banner/featured content.

## Collaboration and recovery

- Product listings claim real-time collaboration and live cursors.
- SDK docs identify Yjs CRDT state and a separate ephemeral presence/awareness channel.
- Presence is per-document, deduplicated per user, and includes user id, name, colour, self marker and optional avatar id.
- Google Play description says local typing does not wait for the network and sync resumes after reconnection.
- Older help material describes cloud autosave, revision history and an Archive where deleted documents may be searched/restored/permanently deleted.

The exact offline protocol, revision retention, backup cadence and restore guarantee are not public enough to specify. Do not turn one older support-page backup interval into a service-level promise.

## Workshop and developer ecosystem

- A library/Workshop for discovering and installing tools.
- Tool manifests declare the document type and capability grants.
- Tool components may render as editor panel, fullscreen surface or embedded block.
- Apps own routes/spaces and can host other tools.
- Projects are app instances within a world.
- Tool data codecs describe typed fields and CRDT merge behaviour.
- Tools can be saved privately, shared to a world/team, or submitted for public review.
- Installed versions can be pinned; updating a draft does not automatically update an installation.
- Removing a tool from a world does not remove documents previously created by it, according to older help guidance.

## API and integration

- REST API at https://vvd.world/api/v1.
- MCP server at https://vvd.world/api/mcp.
- CLI with same server-side operations.
- API keys, one-time-code/device connect flow, and OAuth 2.1/PKCE.
- Common world-membership permission authority.
- Full-text search over world document names/content.
- Typed content operations based on the document type.
- Access through external APIs is plan-gated in the current docs; tool/app building via CLI is documented as free on all plans.

## Plans and entitlements

The live pricing page names Free, Hobbyist, Pro and Studio. It groups limits around world/document counts, media storage, Quill stories and chapters, tool access, publishing audience, custom domains, collaborator capacity, roles, studio ownership and API access.

Older terms and help material differ. App-store purchase channels and regional availability may also differ. The app should have a central entitlement service and versioned plan configuration; never scatter hardcoded numerical plan checks across UI components.

## Device and input support

- Apple listing describes iPad and Mac support.
- Android listing explicitly highlights tablet-oriented UI with larger targets, long-press menus, drag between panels and stylus drawing.
- Older help material advises against narrow mobile browser use.

Treat desktop, tablet and phone browser as separate layout classes until current app capture proves the actual support matrix.

## Explicit legacy boundary

The help centre says Campaigns are being reworked and unavailable in the current version. Older Campaigns data remains separate on the legacy service. Do not implement Campaigns as a current product feature without new evidence.

## Definition of parity

A feature is not complete when its main canvas renders. For every major surface, verify:
- Empty, loading, populated, read-only, offline, error and permission-denied states.
- Create, open, edit, rename, move, archive, restore and permanent-delete semantics where applicable.
- Keyboard, pointer, touch and stylus alternatives.
- Cross-document references after rename, type changes and deletion.
- Undo, history and export behaviour.
- Responsive behaviour and accessibility.
- Server-side permission tests and data integrity tests.

## Instagram-led additions and product-status corrections

### Trade Routes — first-party core tool

The Instagram announcement describes a trade/economy simulation for fictional worlds: assign resources to settlements, connect settlements with roads and rivers, and simulate supply movement. The first-party listing at https://vvd.world/t/trade-routes classifies Trade Routes as a core vvd tool (version 0.1.50 at the 2026-11-05 research snapshot). Its public tool page currently has no detailed description, so the social post is the only public functional summary found in this pass.

Treat this as a first-party tool in the product inventory. The precise resource schema, route graph, simulation rules, event cadence, visual outputs and persistence behaviour remain unverified.

### Overworld — first-party Wiki template

The current Wiki developer reference identifies Default and Overworld as built-in first-party site templates. Instagram's Overworld demonstration describes map-first Wiki navigation, interactive regions/pins, a cleaner reader UI and animated clouds. This is an extension of Wiki publishing, not an independent content database or a new world model.

### Calendar — community Workshop creation

Instagram demonstrates a custom fictional calendar with events, holidays, lunar cycles and a world-matched visual theme. The public listing at https://vvd.world/t/calendar identifies HHaseeb as its creator, not vvd. Treat it as a community Workshop tool example and a requirement for extensible custom calendar codecs—not as a built-in core tool.

### 3D showcase versus 3D Model Viewer

Instagram showcases a creator workflow involving 3D maps, historical timelines and Quill. That is a product-use example, not evidence of a native 3D map editor. The first-party 3D Model Viewer is a separate documented tool for inspecting 3D characters, environments and items from different angles. Keep 2D Maps, 3D asset viewing and any future 3D scene surface distinct.

### Creator link-in-bio — announcement, status unverified

A profile post previews customisable creator link-in-bio pages for writers, worldbuilders, artists and studios. No current route or technical reference was found. Keep it outside the core world/document model until current availability and its relationship to Wiki/profile features are confirmed.
