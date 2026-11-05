# Engineering Instructions

These instructions apply throughout the repository. Read the relevant research and architecture pages before making product or data-model changes.

## Product truth

- The target is an independent reconstruction of vvd.world, not a claim to possess or reproduce its private source code.
- Read docs/RESEARCH.md, docs/PRODUCT_MODEL.md and docs/OPEN_QUESTIONS.md before changing foundational behaviour.
- For Trade Routes, Wiki templates, community calendars, 3D showcases or creator link-in-bio surfaces, also read docs/INSTAGRAM_RESEARCH.md and preserve its evidence classifications.
- Mark statements as confirmed, partially confirmed, inferred or unknown.
- Keep older help-centre UI descriptions separate from the newer developer-platform model.
- Do not implement legacy Campaigns as a current feature. The help centre says they are unavailable in the current product and legacy data is separate.

## Stack and boundaries

- The accepted frontend is Next.js with React and TypeScript.
- Use the App Router unless implementation evidence identifies a concrete limitation.
- Use server components for suitable data composition; client components for editors, browser APIs, collaboration hooks and interactive visual surfaces.
- DOM/CSS is the default renderer. Use WebGL only where the workload benefits from it.
- Three.js is optional and lazy-loaded for real 3D use cases. Do not import it globally.
- Rust, PostgreSQL and S3-compatible storage are candidates, not accepted facts. Do not scaffold those services until the backend decision is confirmed.
- Keep the product domain independent of route and component structure.

## Before changing code

1. Inspect the existing implementation, repository structure, docs and tests.
2. Identify the user workflow and affected data invariants.
3. Reuse existing helpers and dependencies when sensible.
4. Choose the smallest complete solution. Do not create a framework inside the framework.
5. Update docs and ADRs when the public model or accepted architecture changes.

## Implementation standards

- Prefer simple, explicit, maintainable code.
- Keep the canonical version of a world document in one place. Views, search indexes and graph edges should be derived projections or references.
- Validate typed document writes at service boundaries.
- Enforce permissions on the server; a hidden or disabled React button is not access control.
- Avoid destructive edits. Provide archive, restore, revision and export paths.
- Make collaboration and offline failure states visible. Never show a false saved state.
- Do not add placeholders, fake persistence, hard-coded success responses or silent fallbacks.
- Keep credentials, personal data and real unpublished content out of source control and logs.
- Cursor positions and presence are ephemeral, not durable document content.

## Verification

- Run the narrowest relevant tests first, then broader checks when practical.
- Run formatter, linter, type checker, tests and build when those tools exist.
- Test permissions, concurrent writes, version boundaries and export/import paths.
- Review the final diff for generated output, secrets and unrelated changes.
- State exactly which checks ran. Never report an unexecuted check as passing.

## Documentation

- Update docs/FEATURE_INVENTORY.md when a product surface changes.
- Update docs/PRODUCT_MODEL.md when identity, relationships, versioning or permissions change.
- Update architecture and ADRs when a system boundary changes.
- Add source URLs and a research date for new external observations.
- Keep docs/OPEN_QUESTIONS.md current.

## Git hygiene

- Keep commits focused and descriptive.
- Do not rewrite shared history or force-push unless explicitly requested.
- Do not commit generated bundles, local IDE state, private exports or environment-specific files.
