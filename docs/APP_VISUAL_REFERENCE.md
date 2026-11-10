# App Visual Reference — VVD Reimagined

- Research date: 2026-11-10
- Reference playlist: https://www.youtube.com/playlist?list=PLWsAD8ivimeDpt34c3xeuQKskechI-1Sg
- Playlist metadata and all ten video titles/order were retrieved. Manual English caption tracks were analysed; see [Official YouTube Tutorial Research](YOUTUBE_TUTORIAL_RESEARCH.md).
- Visual limitation: the videos have not been inspected frame-by-frame. Transcript evidence verifies spoken workflows, not exact geometry, styling, motion or every visible interaction.

## Evidence used

1. **Google Play listing and screenshots** — https://play.google.com/store/apps/details?id=world.vvd.desktop
   - One screenshot shows a dense graph on a dark full-bleed canvas with grid, coloured nodes, labels and relationship lines.
   - Another shows a focused grid-based tool surface with compact rail, top bar and bottom action strip; the exact tool is unidentified.
   - The listing describes cards, maps, timelines, eras, Canvas, tables, Quill, Wiki, collaboration and Workshop, plus tablet panels, long-press menus, drag between panels and stylus drawing.
2. **Help-centre workspace overview** — https://vvd.crisp.help/en/article/vvd-overview-wy5lsa/
3. **World Info panel** — https://vvd.crisp.help/en/article/world-info-gmmftq/
4. **Tools and Workshop overview** — https://vvd.crisp.help/en/article/tools-ttd107/
5. **Official product site** — https://vvd.world/
6. **Developer docs** — https://docs.vvd.world/workshop/guides/mental-model and https://docs.vvd.world/workshop/reference/tools

## Tutorial-series evidence

The official ten-video series covers first world creation, UI/editor overview, card types, card organisation, interactive maps, World Graph, Wiki/publishing, Canvas, Relation Trees and Quill. Its spoken workflows add requirements for creator-defined card taxonomies, sidebar pin/sort/hierarchy, richer map overlays, force-graph controls, line junctions, Canvas embeds/page presets and the full Quill writing/audio/export flow.

See [YOUTUBE_TUTORIAL_RESEARCH.md](YOUTUBE_TUTORIAL_RESEARCH.md). Caption retrieval is not visual inspection: exact toolbar placement, colours, typography, motion, hover/press states and responsive geometry remain unverified.

## UI/UX observations

- Keep world and era context persistent while moving between tools.
- Keep the document library, active editor and inspector connected.
- Resolve references to canonical records; do not maintain duplicate lore copies.
- Treat graph/map/canvas/timeline as distinct tools with distinct input models.
- Use a dark, quiet workspace as a visual reference, but do not infer exact tokens from limited screenshots.
- Support tablet targets, touch-safe drag affordances and stylus drawing.
- Respect reduced motion and keep DOM-accessible controls around WebGL surfaces.

## What remains unverified

- Frame-by-frame tutorial inspection and exact control geometry.
- Authenticated desktop/tablet screen geometry, menus, hover/press states and transitions.
- Feature availability by plan/account.
- Exact tool identity for every public store screenshot.
- Offline editing and collaboration recovery behaviour.
