# 0004. Backend and persistence candidates

- Status: Proposed
- Date: 2026-11-05
- Owners: Project maintainers

## Context

The repository does not contain a backend yet. Public vvd material documents APIs, typed operations and Yjs collaboration, but does not reveal its private backend language, database or object-storage provider.

## Proposal

The leading reconstruction direction is:
- Rust for API/domain services.
- PostgreSQL for relational metadata, memberships, document identities, typed properties, version pointers and entitlements.
- S3-compatible object storage for images, audio, attachments, model files and exports.
- A Yjs-compatible collaboration layer with durable updates, snapshots and ephemeral awareness.
- Search projections derived from canonical world content.

These are our candidate choices, not statements about vvd's private infrastructure.

## Alternatives

A TypeScript backend would share language types with the frontend. Other databases or object stores could work if they preserve transactional integrity, access controls and operational simplicity. The collaboration provider should be selected after a vertical slice proves the sync/offline requirements.

## Consequences

- Do not create Rust, database or storage infrastructure until this proposal is accepted.
- Keep domain types and service contracts vendor-independent.
- Test permissions, migrations, collaboration, backup and restore before production.
- Record the final decision in an accepted ADR when the backend direction is confirmed.
