# Project Setup

## Current state

The repository contains a Next.js App Router application and its first read-only workspace slice. The app uses one synthetic sample world. It has no real account, session, persistence or server-side document service.

## Accepted direction

- Frontend: Next.js with React and TypeScript.
- Runtime: Node.js 26 LTS.
- Rendering: DOM/CSS by default, WebGL where it improves a visual workload.
- Three.js: optional and lazy-loaded for actual 3D surfaces.
- Backend: Rust candidate, not yet accepted.
- Database: PostgreSQL candidate, not yet accepted.
- Media storage: S3-compatible object storage candidate, not yet accepted.
- Collaboration: Yjs-compatible CRDT behaviour is research-backed; provider and durable storage design remain open.

## Local development

~~~sh
nvm use
npm install
npm run dev
~~~

The initial package manifest uses Next.js 16.4.5 and React 19.3.1. Node.js 26 is selected by .nvmrc and package.json.

Available checks:

~~~sh
npm run lint
npm run typecheck
npm test
npm run build
python3 scripts/validate.py
~~~

Generate and commit package-lock.json from a network-enabled environment before relying on npm ci or a reproducible dependency install. The implementation environment could not reach the npm registry, so no lockfile has been generated and application checks have not been run here.

## Current vertical slice

- World selector backed by one synthetic fixture.
- Responsive editor shell with document library and details inspector.
- Typed World and CardDocument domain types.
- Card names, aliases, text blocks, scalar properties and typed references.
- Navigation from a record to the canonical referenced record.
- Search across names, aliases and entity types.
- Read-only preview state is visible. Create/edit controls are disabled.

Domain tests cover canonical lookup, reference resolution and basic world integrity. CI is configured to run lint, type-check, tests and a production build, but those checks must still complete on GitHub before being treated as passing.

No edit/create action is wired to local state as a substitute for persistence.

## Next implementation steps

1. Finalise the backend ADR and service boundary.
2. Implement identity/session handling and server-side world membership.
3. Add persistent world/document repositories and migrations.
4. Replace the fixture adapter with server reads while retaining fixtures for visual review.
5. Add validated create/update/archive/revision operations and permission tests.
6. Expand the card editor only after durable write operations exist.
