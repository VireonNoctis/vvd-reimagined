# Architecture

**Status:** Next.js/React/TypeScript, WebGL rendering, a Rust modular monolith and PostgreSQL persistence are accepted for this reconstruction. S3 and collaboration-provider choices remain deferred.

## System overview

The application should have one canonical world/document model behind a typed service API. Next.js presents that data through the creator workspace, tools, writing surfaces and published readers. Permissions, durable state and publication rules live behind service boundaries, not inside client components.

~~~text
Browser / tablet
└── Next.js application (React + TypeScript)
    ├── Public routes and account flows
    ├── Authenticated workspace shell
    ├── World home and document library
    ├── Typed document editors
    ├── Quill writing projects
    ├── Tool and app host
    ├── Visual tools
    └── Published wiki and story reader
             |
             v
Typed application API
├── Identity and sessions
├── Worlds, memberships and roles
├── Eras and document resolution
├── Typed document operations
├── Projects, apps and tool manifests
├── Collaboration and presence
├── Media and uploads
├── Search and projections
├── Sharing and publication
└── Billing and entitlements
             |
             v
Persistence adapters
├── Relational database (PostgreSQL candidate)
├── Object storage (S3-compatible candidate)
├── Collaborative update store/provider (selection pending)
└── Search projection (selection pending)
~~~

This is our implementation proposal. It is not a diagram of vvd's private infrastructure.

## Frontend

### Framework

Use Next.js with React and TypeScript. The App Router is the current intended direction. Keep domain types and validation schemas independent of React components.

Suggested route groups:
- Public landing and auth.
- Authenticated workspace.
- World home and document editor.
- Quill projects.
- Tool/app surfaces.
- Wiki authoring/preview.
- Published reader routes.

Use server components for data-oriented composition where practical. Use client components for rich editors, local interaction, browser APIs, collaboration hooks and visual surfaces. Do not turn every component into a client component by default.

### Rendering boundaries

DOM and CSS are the default. SVG is suitable for icons and smaller diagrams. Canvas 2D can handle moderate drawing workloads. WebGL is reserved for dense spatial surfaces where measured performance or interaction complexity justifies it.

Three.js is optional and must be lazy-loaded for genuine 3D use cases such as the Model Viewer. The public SDK reference documents a shared lazy Three loader; this is strong precedent for not bundling 3D runtime into the ordinary workspace. No core route should require Three.js.

## Backend direction

A Rust modular monolith now owns identity, sessions, memberships, world/document operations and relational integrity. The service is in `backend/`, uses Axum and SQLx, and applies SQL migrations on startup. Start with clear modules and extract services only when operational needs justify it.

The API stores only a digest of each opaque session token. It checks world membership on every world/document read and write. Write permission is role-based and database transactions contain both document metadata and card-content changes. Optimistic version checks prevent silent overwrites. The API does not yet include email verification, account recovery, public-deployment rate limits or session-device management; those are required before launch.

Candidate modules:
- Identity and session management.
- World membership/role checks.
- World, era and document metadata.
- Typed document/content operations.
- Projects and app/tool registry.
- Media metadata, uploads and access URLs.
- Collaboration handshakes and durable updates.
- Search/index projection.
- Sharing, wiki publishing and version pointers.
- Billing and entitlement evaluation.
- Audit events and account lifecycle.

## Persistence candidates

### PostgreSQL

Accepted for the reconstruction's relational source of truth: accounts, hashed sessions, worlds, memberships, document identities, card properties, ordered text blocks and version pointers. Composite foreign keys keep a reference inside its source world. Migrations live in `backend/migrations`. This is not a claim that vvd uses PostgreSQL.

### S3-compatible object storage

Deferred until media upload and Gallery are implemented. When selected, use private objects by default and issue short-lived signed URLs only after an access check. Avoid guessable public object paths.

### Collaboration state

The target behaviour is Yjs-compatible CRDT collaboration with separate ephemeral presence. The provider, durable update storage, snapshots, compaction and offline cache still need a concrete design and ADR.

### Search

Search should index names, aliases, searchable text and selected typed fields. Search results must carry source ids and be re-authorized before content is returned. Search is a projection, not an alternate canonical content store.

## Domain boundaries

- **World service:** world metadata, membership and role enforcement.
- **Era resolver:** selects inherited/default and era-specific document versions.
- **Document service:** stable identities, names, slugs and type registration.
- **Typed content service:** type-specific validation and operations.
- **Project service:** app instances and their app-owned documents.
- **Tool registry:** manifests, codecs, versions, grants and installations.
- **Collaboration service:** shared updates, snapshots and ephemeral presence.
- **Media service:** upload policy, metadata, transformations and private object access.
- **Publication service:** immutable snapshots, audience checks and reader endpoints.
- **Entitlement service:** central plan/feature evaluation.
- **Audit service:** sensitive membership, share, billing and account events.

## Important invariants

1. World is the shared content substrate.
2. Era resolution behaves consistently across all readers.
3. Project documents do not fork shared world cards.
4. Document types are registered and validated before mutation.
5. Every read and write is authorized server-side.
6. Typed operations are validated against the target document type.
7. Search and graph are projections, not independent sources of truth.
8. Relation Tree edges are distinct from graph mention/property edges.
9. Presence is ephemeral and is not saved as document content.
10. Published versions are immutable; new publication creates a new version.
11. Save, share and publish are separate visibility operations.
12. Archive and permanent deletion are distinct.
13. References keep a stable target identity through rename.
14. Replacing a map background should not lose region/pin data.

## Failure and recovery

- Distinguish connecting, ready, offline, syncing, saved, failed, read-only and permission-denied states.
- Keep local pending changes visible.
- Make retries safe and mutations idempotent where possible.
- Use resumable or retry-safe uploads for large files.
- Keep the old live publication until the next publication has validated.
- Restore should create a recoverable state and preserve prior revisions.
- Do not display a saved state before the server or durable local store confirms it.

## Operational requirements

Before production:
- Structured logs and request correlation ids.
- No user-authored content or secret values in logs by default.
- Metrics for sync lag, reconnects, upload failures and publication failures.
- Database backups and point-in-time recovery where supported.
- Restore drills, not only backup creation.
- Retention, export and account deletion rules.
- Dependency, secret and permission reviews.
- Documented migrations, deployment, rollback and incident handling.

## Related decisions

- [ADR 0001 — Frontend](DECISIONS/0001-frontend.md)
- [ADR 0002 — Rendering](DECISIONS/0002-rendering.md)
- [ADR 0003 — Domain model](DECISIONS/0003-domain-model.md)
- [ADR 0004 — Backend candidates](DECISIONS/0004-backend-candidates.md)
