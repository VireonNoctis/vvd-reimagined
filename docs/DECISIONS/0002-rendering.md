# 0002. Use WebGL selectively and keep Three.js optional

- Status: Accepted
- Date: 2026-11-05
- Owners: Project maintainers

## Context

The product includes visual surfaces such as graphs, maps, canvases and a 3D model viewer. The user selected WebGL as a rendering capability and explicitly said Three.js is optional. The current vvd SDK also documents a lazy shared Three.js loader.

## Decision

Use DOM and CSS for ordinary product UI. Choose SVG or Canvas 2D for smaller 2D visuals. Use WebGL when profiling or interaction scale shows a measurable benefit. Use Three.js only for real 3D scenes/model viewing and lazy-load it.

## Alternatives

- WebGL for every screen: rejected; it harms accessibility and text interaction without helping ordinary UI.
- Global Three.js import: rejected; most routes do not need 3D.
- SVG for every graph/canvas: workable for small scenes but may not scale to dense spatial content.

## Consequences

- The workspace remains accessible and responsive.
- Visual dependencies stay isolated to surfaces that need them.
- Each graph/map/canvas implementation chooses a renderer based on scale and interaction requirements.
- Three.js is not required for the first application slice.
