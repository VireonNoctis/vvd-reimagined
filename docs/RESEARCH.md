# Research Dossier

- Research baseline: 5 November 2026
- Target: vvd.world, its current public developer platform and its documented creator experience
- Method: first-party product pages, developer documentation, help-centre workflows and app-store descriptions
- Access boundary: public material only; no authenticated account session, private source code or production credentials

## Executive summary

vvd is a connected worldbuilding and storytelling workspace. The product is built around one shared body of world content that can be structured as cards and other typed documents, connected through references, explored through spatial tools, used as context while writing in Quill, and presented through a wiki or published story.

The key reconstruction insight is that the tools are different views and editors over related content—not a set of isolated mini-apps. A card can be referenced in prose, placed on a map, included in a graph and exposed through a wiki. The world remains the shared source of truth.

The public material describes two layers that need to be reconciled carefully:

1. **Creator workspace and UI workflows.** The support centre gives specific navigation and editing procedures for the workspace, cards, maps, graph, trees and Quill. Some articles are marked as works in progress, and some reflect an older desktop-first interface.
2. **Current developer platform.** The current docs describe a formal model of worlds, eras, documents, projects, apps, tools, blocks, hosts and codecs. The same server operations are surfaced through REST, MCP and CLI. Workshop tools use typed codecs and platform-managed collaboration.

These sources are complementary, but they do not prove that the older help-centre layout is still the exact current beta layout. The reconstruction should preserve confirmed workflows while treating exact screen geometry and current control placement as open research.

## Evidence levels

| Level | Evidence | Use in this project |
| --- | --- | --- |
| A — current technical docs | Current first-party API, SDK and platform contracts | Strong evidence for public domain concepts and documented integration behaviour |
| B — current product material | Current marketing page, app listings and pricing | Evidence for positioning, feature scope and marketed device capabilities |
| C — help-centre workflows | First-party user instructions, sometimes marked work in progress | Useful for interaction requirements; verify against current app before exact UI replication |
| D — reconstruction inference | Our own design or architecture conclusion | Keep explicitly labelled as a proposal until tested or confirmed |

A first-party source can still be stale. Evidence level does not remove the need to check its date, product generation and scope.

## Product identity and surfaces

The live marketing site describes a modern storytelling toolkit with world organisation, interactive maps, visualised connections, custom wikis and real-time collaboration. It currently claims 300K+ storytellers. The separate app subdomain currently shows a 200K+ counter. Those counters conflict, are marketing copy and should not be copied into the reconstruction as a factual metric.

Public research surfaces:

| Surface | Address | Research purpose |
| --- | --- | --- |
| Product site | https://vvd.world/ | Current product positioning and feature overview |
| App entry | https://app.vvd.world/ | Public entry page and product demonstrations |
| Beta host | https://beta.vvd.world/ | Current developer CLI host and sign-in flow |
| Developer docs | https://docs.vvd.world/ | API, SDK, Workshop and app/tool contracts |
| Help centre | https://vvd.crisp.help/en/ | Creator-facing workflows |
| Legacy app | https://legacy.vvd.world/ | Separate legacy environment; not a current content source |
| Apple listing | https://apps.apple.com/ie/app/vvd-world/id6795331755 | iPad/Mac positioning and feature description |
| Google Play listing | https://play.google.com/store/apps/details?id=world.vvd.desktop | Android/tablet positioning and feature description |

## Current technical model

The developer docs define the following canonical nouns:

- **World:** one storytelling universe and shared content substrate.
- **Era:** a named version of the world. Creating an era inherits content by reference rather than copying all documents.
- **Document:** a typed unit of world content, such as a card, map, timeline or folder.
- **Project:** one instance of an app inside a world, such as a Quill writing space or wiki.
- **App:** a full-screen experience that owns a space and may host tools.
- **Tool:** a capability that edits one declared document type.
- **Block:** an embeddable presentation of a tool inside another document.
- **Host:** the platform interface that exposes permission-gated capabilities.
- **Codec:** the typed description of a document or collaborative state shape.

The most important invariant is that an app project does not fork the world's shared cards. An era controls the version of world content read by the project.

## Workspace observations

The help-centre overview describes a workspace containing the World Info panel, home page, Radio, Clock and Feedback controls. It describes a world switcher, account settings, tabs and a New Tab search surface. The tab flow can open the World Editor, Tools, Wikis or Quill. The World Editor shows cards and other documents in a sidebar, permits multiple documents to remain open, and supports nested document creation through context actions.

A card's visible structure includes its name, optional alias, type/subtype, properties, image and body blocks. Blocks can include text, media and embedded tool surfaces. The older support material names Maps, Canvases, Relation Trees and Timelines as document/block experiences.

These are workflow-level observations, not an exact screenshot specification of the current workspace.

## Cards, properties and connections

Cards are reusable world records. The help centre describes aliases, type/subtype, optional image, per-card properties and type-level properties. Properties can hold text or references to cards of an allowed type. Templates can define a starting structure for a card type.

The older graph is derived from card mentions and typed properties. The help centre explicitly distinguishes graph connections from Relation Tree edges: relation-tree links do not automatically become graph links, and graph links do not become tree edges. Preserve the two semantics separately.

The help centre also documents automatic entity linking and optional Entity Detection. Guided Templates and Entity Detection are described as assistance for reorganising or detecting supplied content, not as generative authorship. Their current availability and any third-party processing should be checked against current privacy disclosures before implementation.

## Maps, timelines and spatial tools

The Maps guide describes the map as a supplied/uploaded base image with interactive overlays. Overlay content includes layers, labels, pins and polygonal zones. Pins and zones can link back to cards. Replacing the base image is described as retaining pins and zones.

Relation Trees use their own nodes and explicitly authored typed edges. Nodes may be linked to cards or left independent. Variants can represent different states of the same relationship tree. Free drawing and labels are also documented.

The current API documents typed content operations, including adding timeline events with a label, date value, optional description and precision. Older help material describes Earth-style, generic and custom calendars, while marking the timeline UI as beta. Treat the capability as documented, but verify the current calendar editor and supported date semantics before matching it.

## Quill writing workflow

Quill is an app/project for stories or books. Public help pages describe a cover, ordered chapter list, multiple drafts per chapter, chapter count and story word count, side-by-side chapter opening, a collapsible contextual side panel, focus mode, notes, styling, world references, entity detection, revision history, audio mode and publish preview.

The side panel can contain fixed and configurable blocks such as Focus Mode, Drafts, Notes, Styling, World Documents, Detected Cards, Radio and a Gallery image. Notes may be general or chapter-linked; selecting text can create an attached note. The publish surface has Styling, Export and Publish areas. EPUB, PDF and DOCX are documented export formats, and chapter-level publishing is described.

Several Quill support pages are explicitly works in progress. The feature concepts are evidence; exact current toolbar positions, keyboard shortcuts and every edge case are not yet known.

## Publishing and the Wiki model

The current developer docs describe a wiki as an app that reads the existing world and renders its cards, maps and notes as a themed site. It does not need a second copy of that content. That is a high-value architectural rule for this reconstruction.

The platform shipping guide distinguishes Save, Share and Publish. Saving creates an immutable private version. Sharing changes which version is available to a world/team. Publishing a tool/app to the Workshop submits a version for review. Site publication exposes the wiki at an address. These are different visibility transitions.

The wiki reference documents public, unlisted capability URL, password and entitled audiences. The audience must be enforced by the serving layer, not only by hidden UI routes.

## Developer platform and collaboration

The docs expose one server-side operation layer via REST at https://vvd.world/api/v1, MCP at https://vvd.world/api/mcp and the vvd CLI. The docs say these entry points execute the same operations and enforce the same world membership permissions.

API authentication includes account API keys, a device/one-time-code connect flow and OAuth 2.1 with PKCE. The documented model uses the account's world membership and role as the permission authority. The account plan gates external programmatic content access; developer creation/build workflows have a different plan rule.

Workshop storage guidance describes Yjs as the CRDT underneath collaborative document state. Typed codecs define merge behaviour for fields. Presence is a separate ephemeral awareness channel, scoped to an open document, and exposes stable user identity, display name, colour and optional avatar media id. Presence is not durable content.

The SDK also exposes a lazy shared Three.js loader. A tool that does not use 3D does not fetch the module, while 3D consumers share the platform's loaded instance and example loaders. This is useful precedent for keeping Three.js optional in the reconstruction.

## Pricing and entitlement conflicts

The live pricing page currently names Free, Hobbyist, Pro and Studio. It groups entitlements around worlds, document counts, media storage, Quill stories/chapters, tools, private/public publishing, password protection, custom domains, collaborators, roles, ownership and API access.

Older Terms and help-centre material contain different limits and prices. App-store descriptions can also vary by purchase channel or region. The currently extracted pricing page does not yield a dependable complete monthly price table. Do not hard-code plan limits from the old Terms or scrape. Build a central, data-driven entitlement configuration and confirm current values against the live product and account region before implementing checkout.

## Device and input caveats

The Apple listing describes iPad and Mac support. The Android listing explicitly promotes tablet interactions such as large touch targets, long-press menus, dragging between panels and stylus drawing. Older help material warns against small-screen mobile browser use. These facts are not inherently contradictory: tablet apps and phone browsers are different contexts.

The rebuild should target desktop and tablet deliberately, then treat phone-browser editing as an explicit product decision rather than assuming full parity.

## Legacy boundary

The help centre says Campaigns are being reworked and unavailable in the current product; older Campaigns data remains on the separate legacy environment. Do not treat Campaigns as a current feature without new evidence.

## What has not been reverse-engineered

Public material does not expose the authenticated workspace's exact route tree, current toolbar controls, modal states, animation curves, typography, spacing tokens, breakpoints, hidden keyboard shortcuts, every built-in tool configuration, complete import/export format, pricing entitlements by region, or production infrastructure.

There is no evidence from these sources that vvd uses Rust, PostgreSQL or S3. Those are possible choices for our implementation, not facts about vvd.

## Next research capture

The next strongest evidence would be redacted screenshots or short recordings from an authenticated current app session using a synthetic world. Capture:
- Home, world switcher and World Info tabs.
- Document sidebar and context menus.
- Card empty/populated/edit states and type/property editor.
- Map layers, zones and pin interactions.
- Graph filtering and node selection.
- Relation Tree node/edge creation and variants.
- Canvas and Timeline editing.
- Quill writing, draft, notes, styling and focus states.
- Quill publish preview, export and chapter publication.
- Wiki editor and published reader.
- Collaboration role flow, Archive, restore and plan settings.
- The same high-value workflows at desktop and tablet sizes.

Do not send passwords, API keys or unpublished private creative content.

## Source register

### Product and app
- https://vvd.world/
- https://app.vvd.world/
- https://beta.vvd.world/
- https://apps.apple.com/ie/app/vvd-world/id6795331755
- https://play.google.com/store/apps/details?id=world.vvd.desktop

### Developer documentation
- https://docs.vvd.world/
- https://docs.vvd.world/docs/concepts
- https://docs.vvd.world/docs/authentication
- https://docs.vvd.world/docs/content
- https://docs.vvd.world/docs/mcp
- https://docs.vvd.world/workshop/guides
- https://docs.vvd.world/workshop/guides/storing-data
- https://docs.vvd.world/workshop/guides/presence
- https://docs.vvd.world/workshop/guides/shipping
- https://docs.vvd.world/workshop/reference/sdk
- https://docs.vvd.world/workshop/wiki

### Help centre
- https://vvd.crisp.help/en/article/vvd-overview-wy5lsa/
- https://vvd.crisp.help/en/article/cards-62i16j/
- https://vvd.crisp.help/en/article/properties-umr3at/
- https://vvd.crisp.help/en/article/connections-the-graph-eir68m/
- https://vvd.crisp.help/en/article/media-gallery-w1fuka/
- https://vvd.crisp.help/en/article/world-info-gmmftq/
- https://vvd.crisp.help/en/article/maps-akxl85/
- https://vvd.crisp.help/en/article/relation-trees-1v7xebv/
- https://vvd.crisp.help/en/article/quill-overview-jpl3u0/
- https://vvd.crisp.help/en/article/chapters-and-drafts-qoqr7j/
- https://vvd.crisp.help/en/article/quill-side-panel-kwwch0/
- https://vvd.crisp.help/en/article/quill-publishing-5m51zu/
- https://vvd.crisp.help/en/article/tools-ttd107/
- https://vvd.crisp.help/en/article/saving-1ceh8lh/

### Commercial and legacy references
- https://www.vvd.world/pricing
- https://vvd.world/terms
- https://legacy.vvd.world/
