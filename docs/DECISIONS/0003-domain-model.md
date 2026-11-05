# 0003. Preserve world, era, document and project boundaries

- Status: Accepted as the reconstruction domain model
- Date: 2026-11-05
- Owners: Project maintainers

## Context

The current public developer docs distinguish worlds, eras, documents, projects, apps, tools and blocks. Older help-centre material uses workspace and tab language but describes the connected creator experience.

The key distinction is that eras version world content, while projects are app instances that own app-specific output. Projects read shared world cards; they do not fork them.

## Decision

Use the following domain model:
- World: shared content substrate.
- Era: world-content version axis.
- Document: typed content unit.
- Project: app instance inside a world.
- App: owns a space/route and can host tools.
- Tool: edits one declared document type.
- Block: embedded representation of a tool.
- Host: permission-gated platform services.
- Codec: typed durable/collaborative data declaration.

Keep Graph links and Relation Tree edges distinct. Do not merge their semantics without a deliberate product decision.

## Alternatives

- Treat every tab as an independent project: rejected because the current project/era model does not support it.
- Duplicate cards into every app project: rejected because shared references would become stale.
- One untyped JSON blob for every document: rejected because type validation and typed content operations are central to the public API.

## Consequences

- API and storage need stable world/era/document identities.
- Project-owned content remains separate from world-shared records.
- Tools require a type registry and explicit capabilities.
- Search and graph structures are derived projections, not alternate canonical stores.
