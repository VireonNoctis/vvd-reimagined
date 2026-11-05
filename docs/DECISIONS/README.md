# Architecture Decision Records

ADRs record choices that affect multiple components or are expensive to reverse. The status label is binding: accepted decisions guide implementation; proposed decisions do not.

## Decisions

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-frontend.md) | Next.js with React and TypeScript | Accepted |
| [0002](0002-rendering.md) | WebGL selectively; Three.js optional and lazy | Accepted |
| [0003](0003-domain-model.md) | World/era/document/project boundaries | Accepted reconstruction model |
| [0004](0004-backend-candidates.md) | Rust API and PostgreSQL persistence | Accepted; S3 deferred |

## Record format

Each ADR should include a status, date, context, decision, realistic alternatives and consequences. Superseding an accepted decision requires a new record that links back to the prior ADR.
