# 0004. Rust API and PostgreSQL persistence

- Status: Accepted
- Date: 2026-11-05
- Owners: Project maintainers

## Context

The repository needs a real account, membership and document boundary before the preview UI can become an editor. Public vvd material documents typed APIs and world membership, but does not reveal its private backend language, database or object-storage provider.

The reconstruction should keep the canonical world/document model independent of Next.js routes and UI components. It also needs relational constraints that can prevent a card from pointing into a different world.

## Decision

Use a Rust modular monolith with an HTTP API, backed by PostgreSQL:

- Rust 1.99.1 as the pinned stable toolchain.
- Axum for HTTP routing and request handling.
- SQLx for PostgreSQL queries, connection pooling and versioned migrations.
- PostgreSQL 18.6 as the current local/CI database image.
- Argon2id password hashing and opaque server-side sessions.
- Next.js remains the frontend and will call the API through a same-origin route proxy.

PostgreSQL owns accounts, sessions, worlds, memberships, document identities, card properties, text blocks and document versions. It enforces same-world references with composite foreign keys. Every world read and write checks membership on the server. Owners, admins and editors can mutate documents; viewers are read-only.

Card updates use an expected document version. A stale update returns a conflict rather than overwriting a newer edit. Metadata and card content changes run inside one database transaction.

The session cookie is HttpOnly, SameSite=Strict and Secure in production. Only a SHA-256 digest of the opaque token is stored in the database; the raw token is returned once in the cookie. Sessions expire after 14 days. Passwords are stored with Argon2id, never plaintext.

## Deferred choices

- S3-compatible object storage is deferred until the media upload/Gallery slice. No object-storage service or public bucket is created now.
- The Yjs provider, durable update store, presence transport and snapshot/compaction strategy remain open until the collaboration slice.
- Search remains a derived projection; it is not another canonical document store.
- Billing, entitlements and publication are outside this backend slice.

## Security and operational boundary

This is the first authenticated API slice, not a production launch checklist. Before public deployment it still needs account verification and recovery, login/register rate limits, abuse monitoring, session revocation/device management, structured audit events, backup/restore drills and a security review. Configure APP_ORIGIN and secure cookies in production, and put the API behind HTTPS.

## Alternatives

- A TypeScript backend would share the frontend language, but Rust was selected for the backend direction of this reconstruction.
- A document database or untyped JSON blob would weaken relational integrity for membership, typed references and canonical identities.
- Separate microservices are unnecessary at this stage; a modular monolith is easier to test and operate.

## Consequences

- Backend schema and migrations live under `backend/`.
- Local development and CI use PostgreSQL 18.
- API contracts remain JSON and vendor-independent at the domain boundary.
- The current Next.js preview is not considered connected until its server repository and auth UI call this API.
- These choices describe this reconstruction only. They are not claims about vvd's private infrastructure.
