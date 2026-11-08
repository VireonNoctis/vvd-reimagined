# App Visual Reference — VVD Reimagined

- Research date: 2026-11-08
- Purpose: capture the public-facing in-app visual language and workspace structure for the reconstruction.
- Reference playlist: https://www.youtube.com/playlist?list=PLWsAD8ivimeDpt34c3xeuQKskechI-1Sg
- Playlist access: YouTube throttled direct playlist retrieval during this pass. Individual video titles, order, timestamps and footage were therefore not verified. This document does not claim that the playlist was watched.

## Evidence used

1. **Google Play app listing and screenshots** — https://play.google.com/store/apps/details?id=world.vvd.desktop
   - The screenshots show the application rather than its marketing site.
   - One visible surface is a dense world graph: a dark, full-bleed canvas, a fine spatial grid, many small colored nodes, labels and relationship lines, with application chrome and graph controls around the work area.
   - Another screenshot shows a focused grid-based tool surface with a compact left rail, a restrained top bar and a bottom action strip. The public screenshot does not identify its exact tool, so this is recorded as a layout observation rather than labelled as Canvas, Relation Tree or another feature.
   - The listing describes the product as one workspace over shared documents, with cards, maps, timelines, eras, canvas, tables, Quill, Wiki, collaboration and Workshop. It also calls out tablet-oriented panels, larger touch targets, long-press menus, drag between panels and stylus drawing.

2. **VVD help-centre workspace overview** — https://vvd.crisp.help/en/article/vvd-overview-wy5lsa/
   - Describes a narrow world switcher/sidebar, account settings at its lower end, a world-name control for the home page and a nearby World Info panel.
   - Describes multiple tabs that can open the World Editor, Wiki, Quill or Tools.
   - Defines Cards as the central content building blocks, with other tools creating documents and blocks connected to those cards.

3. **World Info panel** — https://vvd.crisp.help/en/article/world-info-gmmftq/
   - Publicly documented sections include world details, types/templates, media, collaboration, site/domain, theme and import.

4. **Tools and Workshop overview** — https://vvd.crisp.help/en/article/tools-ttd107/
   - Separates discovering tools, the current world's installed library and the Workshop for creating/publishing tools.

5. **Official product site** — https://vvd.world/
   - Frames the product around world organisation, interactive maps, visual connections, Wiki publishing and real-time collaboration.

6. **Official developer documentation**
   - Workspace mental model: https://docs.vvd.world/workshop/guides/mental-model
   - Tool rendering contexts: https://docs.vvd.world/workshop/reference/tools
   - App model: https://docs.vvd.world/workshop/apps
   - These references reinforce that tools may render in an editor side panel, fullscreen surface or embedded block, while apps own a route/space. The implementation should preserve those distinctions rather than forcing every feature into one canvas.

7. **Secondary visual example** — https://vvdworldbuilding.substack.com/p/welcome-to-vvd-the-modern-storytelling
   - Includes a world graph image for a sample world. Useful as an additional example of graph density and information hierarchy, not treated as a definitive product specification.

## UI/UX observations to carry into the implementation

### Workspace shell
- Keep the world as the persistent context. Users should understand which world and era they are editing while moving between tools.
- Use a compact navigation rail for world switching and account access, with world-level navigation kept distinct from the active tab.
- Support multiple work tabs for Editor, Tools, Wiki and Quill. Tab changes should not discard an unsaved editor state.
- Keep World Info as a contextual panel with clear sections rather than scattering settings across unrelated screens.

### Editor and shared records
- The document library, active editor and contextual inspector should work as one workspace. Avoid navigating away for routine inspection.
- Search and card references should resolve to canonical records. Other surfaces should read those same records rather than maintain duplicate copies.
- Keep tabs, panels and tool surfaces visually related, but make each working surface's purpose clear.

### Visual tools
- Treat graph/map/canvas/timeline as distinct tools with their own input model and empty/loading/error states.
- The World Graph can justify a full-canvas spatial view with lightweight surrounding chrome. Keep node labels and dense edges legible, and expose filters without permanently covering the graph.
- For tablet, allow panels to share the screen; use generous targets, touch-safe drag affordances and stylus-friendly drawing where appropriate.
- Use motion to communicate panel transitions, selection and save/sync state. Respect reduced-motion preferences and avoid continuous decoration that competes with the work.

### Visual direction
- The public screens suggest a dark, quiet workspace with the working canvas receiving most of the visual space. The screenshots are not sufficient to infer exact color tokens, typefaces, dimensions or animation timing.
- Reconstruct the information architecture and interaction density; do not copy proprietary artwork, exact assets or undocumented implementation details.
- Keep DOM controls accessible around WebGL surfaces. Graph rendering must have keyboard-operable alternatives for selecting and opening records.

## What remains unverified

- The supplied YouTube playlist's individual video contents and exact sequence.
- Current authenticated desktop/tablet screen geometry, active menus, hover/press states and transition timing.
- Current feature availability by plan and account type.
- Exact tool identities for every visible store screenshot.
- Offline editing and collaboration recovery behaviour from a live session.

Treat this page as visual research notes, not proof that all listed product surfaces have been reconstructed. Update it after direct video or authenticated-app inspection becomes available.
