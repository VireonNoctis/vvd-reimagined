# Era inheritance and document resolution

This document describes the implementation contract for the first era slice. It is an internal reconstruction decision, not a claim that VVD uses the same database schema or override algorithm.

## Model

A world owns one or more eras. The migration creates a default **Prime** era for every existing world; world creation inserts Prime for new worlds. An era has a stable id and an optional parent era in the same world. A child references its parent rather than cloning the world.

Canonical documents remain in `documents`. An era-specific edit is stored in `document_era_overrides` as a sparse JSON object keyed by document id. Supported override fields in this slice are:

- `name`
- `aliases`
- `properties`
- `blocks`

Only fields that differ from the parent state are stored. Returning a field to the parent's current value removes that field from the patch. The patch row remains, including when it becomes an empty object, so its version can continue increasing monotonically.

## Read resolution

To read a world in an era:

1. Load the canonical, non-archived document set.
2. Walk from the selected era to Prime using the parent chain.
3. Apply patches from oldest ancestor to selected child.
4. Overlay only the keys present in each patch.

A field that is not overridden remains live-linked to its parent. An ancestor edit therefore flows into descendants unless a descendant has overridden that field.

The resolver returns an opaque optimistic-concurrency token for each document. It is the canonical document version plus the override versions along the selected ancestry. The token changes when the canonical document or any ancestor override changes, including when a parent change affects a child that has a local override on a different field. A save with an older token is rejected rather than silently overwriting a newer inherited state.

## Write resolution

A Prime edit uses the canonical document transaction and revision path. An edit to a non-default era:

1. Verifies membership and edit permission.
2. Locks the selected era, its ancestor chain and the canonical document.
3. Compares the submitted effective version with the current resolved token.
4. Validates property references against documents in the same world.
5. Compares submitted fields to the immediate parent state.
6. Upserts only the changed fields into the selected era's patch and increments that patch's version.

The frontend carries the selected era in the URL (`?era=...`) and sends its id on card reads and writes. New eras are created as children of the currently selected era. The editor labels non-Prime changes as branch-local.

## Guardrails and current boundaries

- Prime is the canonical editing surface. Explicitly selecting Prime in an API write still performs a canonical write; it does not create a Prime-only override.
- Canonical document creation, folder moves and archive/restore remain Prime-only in the current UI. A Prime archive affects the canonical document and therefore removes it from every era.
- Era-local document additions and per-era hide/tombstone operations are not implemented. Alternate eras can currently revise existing canonical cards but cannot create entirely new records that exist only in one branch.
- Era-specific revision snapshots and restore are not implemented yet. The existing revision history records canonical edits.
- Era-specific folder structure, media attachments, graph projections and reference-target visibility are not implemented. References remain stable ids to canonical documents in the same world.
- Cards are still the only registered document type. This is not the final typed document engine.

These boundaries are deliberate and visible in the workspace: global operations are hidden outside Prime rather than being allowed to mutate shared state from an alternate branch.

## Verification

The PostgreSQL integration test covers:

- Prime seeding and era listing.
- Creating an era and a nested child era.
- Inheritance of canonical content without document copies.
- Parent changes propagating through fields not overridden by the child.
- Child fields staying local when a parent field changes.
- Effective version changes invalidating a stale child save.
- Cross-world references being rejected in era overrides.
- Prime remaining unchanged by alternate-era edits.

Run the Rust/PostgreSQL CI job to validate migrations and transactional behaviour. This implementation has not been exercised against the production VVD service.
