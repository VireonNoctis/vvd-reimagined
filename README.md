# vvd Reimagined

An independent reconstruction of a connected worldbuilding, writing, collaboration and publishing workspace. This project is not affiliated with or endorsed by vvd or Pact Social Inc., and does not use their private source code or internal services.

## Status

The Next.js workspace and Rust API are connected when VVD_API_URL is configured: account sessions, world membership, world creation, canonical card reads and version-checked card updates use PostgreSQL. Without that setting, the app remains an explicitly read-only synthetic preview.

Research baseline: 5 November 2026. Public documentation cannot replace direct inspection of the authenticated workspace. Exact current geometry, hidden menus, transition timings and some beta behaviour remain unverified.

## Current implementation

- Next.js App Router with React and strict TypeScript.
- Rust 1.99.1 API using Axum and SQLx, with PostgreSQL 18 migrations.
- A world and card model with stable document IDs, aliases, text blocks, scalar properties and canonical document references.
- World selector and editor shell with a document library and details inspector.
- Search across document names, aliases and entity types.
- Responsive desktop, tablet and phone layouts.
- Domain tests for canonical reference resolution and duplicate/missing-reference detection.
- Login/register/logout, a same-origin API proxy, persistent world creation and a version-checked card editor.
- Account security page with active-session listing, best-effort browser/platform context and account-scoped remote session revocation.
- PostgreSQL-backed authentication throttles, nested folders, reversible archive, revision history and same-world card moves.
- Private Gallery with short-lived presigned S3-compatible uploads and downloads, object metadata verification before publication, and membership-checked asset access.
- CI configured for repository validation, lint, type-check, tests and production build.

The sample world is deliberately synthetic and read-only when no API is configured. In connected mode, account and world data come from PostgreSQL; card saves are confirmed by the API before the UI refreshes.

## Not implemented yet

Email verification/recovery, eras, multi-user collaboration, Quill, additional visual tools, Workshop, Wiki publishing, billing and account operations, production security review and operational hardening.

## Technology direction

| Area | Direction | Status |
| --- | --- | --- |
| Web application | Next.js 16, React 19 and TypeScript | Scaffolded |
| Runtime | Node.js 26 LTS | Selected for the scaffold |
| Visual surfaces | DOM/CSS by default; WebGL where it earns its cost | Accepted |
| 3D rendering | Three.js, optional and lazy-loaded | Accepted |
| Backend | Rust + Axum + SQLx | Implemented API slice |
| Primary database | PostgreSQL 18 | Implemented schema and migrations |
| Media storage | Private S3-compatible object storage through the AWS Rust SDK | Adapter and Gallery upload flow implemented; a bucket and credentials must be configured |
| Collaboration | Yjs-compatible CRDT model and ephemeral presence | Research-backed target; provider decision pending |

Next.js is the framework, React is the component model and TypeScript is the language. Ordinary product UI stays in the DOM. Use SVG or Canvas for suitable 2D work and WebGL only for surfaces that benefit from it. Three.js is optional and should load only for real 3D features.

The backend candidates are implementation options, not claims about vvd's private stack.

## Run locally

Start PostgreSQL and the Rust API as described in [Project Setup](docs/PROJECT_SETUP.md). For the frontend, use Node.js 26 LTS and npm:

~~~
nvm use
npm install
npm run dev
~~~

Then open http://localhost:3000.

Available checks:

~~~
npm run lint
npm run typecheck
npm test
npm run build
python3 scripts/validate.py
~~~

The frontend CI checks run on GitHub Actions. Rust CI also checks formatting, Clippy, unit tests, PostgreSQL migration/membership constraints and the API build. The npm and Cargo lockfiles still need to be generated and committed from the network-enabled runner before treating dependency installs as fully reproducible.

## Documentation

Start with [the documentation index](docs/README.md).

| Document | Purpose |
| --- | --- |
| [Research dossier](docs/RESEARCH.md) | Sources, evidence levels, product generations and inspection limits |
| [Product model](docs/PRODUCT_MODEL.md) | Worlds, eras, documents, projects, apps, tools and blocks |
| [Feature inventory](docs/FEATURE_INVENTORY.md) | Product capabilities and implementation status |
| [Instagram research](docs/INSTAGRAM_RESEARCH.md) | Public product demos, tool announcements and creator ecosystem |
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

## License

No license has been selected. Until one is added, do not assume that the repository grants permission to reuse or redistribute its contents.
