# Project Setup

## Current repository state

This repository now contains the research dossier, domain model, feature inventory, implementation decisions, roadmap and developer tooling. It still does not contain a runnable Next.js app, Rust workspace or database migration set.

## Accepted direction

- Frontend: Next.js with React and TypeScript.
- Rendering: DOM/CSS by default, WebGL where it improves a visual workload.
- Three.js: optional and lazy-loaded for actual 3D surfaces.
- Backend: Rust candidate, not yet accepted.
- Database: PostgreSQL candidate, not yet accepted.
- Media storage: S3-compatible object storage candidate, not yet accepted.
- Collaboration: Yjs-compatible CRDT behaviour is supported by research; provider and durable storage design remain open.

## First application setup

1. Add a Next.js App Router project at the repository root.
2. Enable strict TypeScript and commit one package-manager lockfile.
3. Add formatting, linting, typecheck and test scripts.
4. Build the first app shell and one typed domain package.
5. Establish real session handling and server-side authorization.
6. Accept the backend ADR before scaffolding persistent services.
7. Add local database/object-storage services when their design is settled.
8. Extend CI to run the actual frontend and backend checks.

Do not create all of the product's tools before testing the canonical document model with a single end-to-end workflow.

## Runtime versions

Do not pin an arbitrary runtime version in this document. When the app is created, choose a supported Node.js LTS and Rust stable release, verify upstream support, and record exact versions in package metadata and toolchain files.

## Environment variables

The root .env.example is a planning inventory only. The application does not currently read those values. Keep real credentials in a secret manager and remove/rename entries as the implementation settles.

## Repository checks

Run:

~~~sh
python3 scripts/validate.py
~~~

This checks repository JSON configuration, full-SHA GitHub Action pins, required research pages and relative Markdown links. It does not build or test an application.

There is no frontend build command because no package manifest or application source exists yet.
