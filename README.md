# vvd Reimagined

> A high-fidelity, independent reconstruction of vvd.world's worldbuilding, writing, collaboration and publishing ecosystem.

This repository is a research-led rebuild of the product surfaces described by vvd's public website, help centre, developer documentation and app listings. The aim is to reproduce documented workflows and relationships faithfully, then improve the implementation where behaviour is unclear or unnecessarily cumbersome.

**This is an independent project. It is not affiliated with, endorsed by, or sponsored by vvd or Pact Social Inc.** Product names are used only to identify the system being studied. We do not have access to vvd's private source code or internal services.

## Status

The repository currently contains the research dossier, product model, implementation decisions and development scaffold. It does **not** contain a working frontend, backend or production persistence layer yet. A feature is not implemented merely because it appears in a roadmap or research document.

Research baseline: **5 November 2026**. Public documentation cannot substitute for direct inspection of the authenticated workspace. Exact geometry, hidden menus, transition timings and some current beta behaviour are still unverified.

## Product

vvd is a connected worldbuilding and storytelling workspace. A creator builds a world from structured cards and other documents, connects those records through references and visual tools, writes stories in Quill using the same world as context, collaborates with other people, and publishes a reader-facing wiki or story. One world record can be reused across maps, graphs, prose and public reading surfaces.

## Reconstruction priorities

- **Worlds and documents:** one durable content base with typed records, aliases, properties, folders, media and reusable references.
- **Worldbuilding tools:** cards, maps, timelines, graph views, relation trees, canvas boards, notes, tables and specialist tools.
- **Quill:** books, chapters, multiple drafts, contextual world references, focus mode, notes, revision history, audio and publishing.
- **Apps and tools:** installable extensions with typed document models, embedded blocks and full-screen app surfaces.
- **Collaboration:** concurrent editing, presence, offline tolerance, recovery and clear permission boundaries.
- **Publishing:** wikis and stories with previews, themes, access controls, custom domains and versioned publication.
- **Workspace:** fast navigation, multiple open documents, contextual side panels and useful tablet layouts.

## Technology direction

| Area | Direction | Status |
| --- | --- | --- |
| Web application | Next.js, React and TypeScript | Accepted |
| Visual surfaces | WebGL where it earns its cost | Accepted |
| 3D rendering | Three.js, optional and lazy-loaded | Accepted |
| Backend | Rust | Candidate; not locked |
| Primary database | PostgreSQL | Candidate; not locked |
| Media storage | S3-compatible object storage | Candidate; not locked |
| Collaboration | Yjs-compatible CRDT model and ephemeral presence | Research-backed target; provider decision pending |

Next.js is the framework, React is the component model and TypeScript is the language. WebGL should not be forced into ordinary forms, navigation or text editing. Use the DOM for product UI, SVG/Canvas for smaller 2D visuals, and WebGL for dense spatial surfaces where it improves scale or interaction. Three.js is optional and should load only for real 3D features.

The backend candidates are our implementation choices, not claims about vvd's private stack.

## Documentation

Start with [the documentation index](docs/README.md).

| Document | Purpose |
| --- | --- |
| [Research dossier](docs/RESEARCH.md) | Sources, evidence levels, product generations and inspection limits |
| [Product model](docs/PRODUCT_MODEL.md) | Worlds, eras, documents, projects, apps, tools and blocks |
| [Feature inventory](docs/FEATURE_INVENTORY.md) | Product capabilities and evidence caveats |
| [Quill](docs/QUILL.md) | Writing, drafts, notes, references, audio and publishing |
| [Workspace interactions](docs/WORKSPACE_INTERACTIONS.md) | Navigation, menus and known interaction patterns |
| [Workshop runtime](docs/WORKSHOP_RUNTIME.md) | Tool/app manifests, codecs, capabilities and extension lifecycle |
| [Platform and collaboration](docs/PLATFORM_AND_COLLABORATION.md) | APIs, permissions, CRDTs and presence |
| [Publishing and Wiki](docs/PUBLISHING_AND_WIKI.md) | Versioning, audience modes and site publication |
| [Plans and entitlements](docs/PLANS_AND_ENTITLEMENTS.md) | Current public plan matrix and downgrade behaviour |
| [Design reconstruction](docs/DESIGN_RECONSTRUCTION.md) | Visual principles and responsive constraints |
| [Architecture](docs/ARCHITECTURE.md) | Proposed application boundaries |
| [Roadmap](docs/ROADMAP.md) | Dependency-aware implementation sequence |
| [Open questions](docs/OPEN_QUESTIONS.md) | Behaviour requiring direct verification |

## Working rules

1. Separate confirmed product behaviour from inference and implementation proposals.
2. Do not claim a feature has been reverse-engineered or built until it has been inspected or verified.
3. Keep one canonical data model instead of disconnected copies of lore.
4. Make the interface tactile and responsive without animating every control.
5. Treat keyboard, pointer, touch and stylus as first-class where the surface needs them.
6. Do not silently discard user data; archive, revision, export and restore matter.
7. Keep extension capabilities explicit and server-enforced.
8. Record expensive-to-reverse choices in [ADRs](docs/DECISIONS/README.md).

## Current checks

Run:

~~~sh
python3 scripts/validate.py
~~~

This validates repository JSON configuration, pinned GitHub Actions, required research pages and local Markdown links. It does not run application tests. There is no package manifest yet, so no npm install, dev server or application build is available.

## License

No license has been selected. Until one is added, do not assume that the repository grants permission to reuse or redistribute its contents.
