# vvd Reimagined

An independent reconstruction of a connected worldbuilding, writing, collaboration and publishing workspace. This project is not affiliated with or endorsed by vvd or Pact Social Inc., and does not use their private source code or internal services.

## Status

The Next.js workspace and Rust API are connected when VVD_API_URL is configured: account sessions, world membership, world creation, canonical card reads and version-checked card updates use PostgreSQL. Without that setting, the app remains an explicitly read-only synthetic preview.

Research baseline: 10 November 2026. [Official YouTube tutorial research](docs/YOUTUBE_TUTORIAL_RESEARCH.md) covers all ten official vvd tutorials. [Public social/community research](docs/SOCIAL_MEDIA_AND_COMMUNITY_RESEARCH.md) covers official social channels, vvd3 announcements, changelog additions, Reddit feedback, third-party video and screenshot references. Spoken captions and social posts verify advertised workflows, not exact frame-by-frame UI geometry.

## Current implementation

- Next.js App Router with React and strict TypeScript.
- Rust 1.99.1 API using Axum and SQLx, with PostgreSQL 18 migrations.
- Canonical world/card model with aliases, typed properties, ordered body blocks and references.
- Responsive world selector/editor shell, searchable document library and inspector.
- Login/register/logout, same-origin API proxy, persistent world creation and version-checked card edits.
- Account security centre, session revocation and 90-day security activity history.
- PostgreSQL-backed nested folders, named eras, archive/restore, revision history and personal graph layouts.
- Private Gallery foundation with signed S3-compatible transfers and server-side validation.
- WebGL World Graph with typed-reference and inferred-mention edges, filters and evidence excerpts.
- Persisted Map, Relation Tree, Canvas and Timeline first implementations with same-world validation and optimistic saves.
- CI for frontend, Rust, PostgreSQL integration and repository checks.

## Not implemented yet

Email verification/recovery, MFA, multi-user collaboration, Quill, advanced visual-tool parity, Trade Routes, Workshop, Wiki publishing, billing, account export/deletion, operational audit/backup/restore and independent production security review remain open. Current authentication/security is a hardening baseline, not a certification.

## Documentation

- [Official YouTube tutorial research](docs/YOUTUBE_TUTORIAL_RESEARCH.md) — ten videos, feature findings and code-to-product gaps.
- [Social/community research](docs/SOCIAL_MEDIA_AND_COMMUNITY_RESEARCH.md) — official channels, vvd3, changelog, public media, Reddit feedback and parity implications.
- [App visual reference](docs/APP_VISUAL_REFERENCE.md) — screenshots, workspace structure and visual verification limits.
- [Research dossier](docs/RESEARCH.md) — sources, evidence levels and inspection limits.
- [Feature inventory](docs/FEATURE_INVENTORY.md) — capabilities and implementation status.
- [Roadmap](docs/ROADMAP.md) — implementation sequence.

## Working rules

1. Separate confirmed behaviour from inference and implementation proposals.
2. Do not claim a feature is built until verified.
3. Keep one canonical data model instead of disconnected copies of lore.
4. Make the interface tactile and responsive without animating every control.
5. Treat keyboard, pointer, touch and stylus as first-class where needed.
6. Do not silently discard user data; archive, revision, export and restore matter.
7. Keep extension capabilities explicit and server-enforced.
8. Record expensive-to-reverse choices in ADRs.
