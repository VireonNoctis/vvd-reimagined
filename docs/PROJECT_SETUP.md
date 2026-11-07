# Project Setup

## Current state

The repository has a Next.js workspace and a Rust API with PostgreSQL-backed accounts, sessions, worlds, memberships and card documents. When VVD_API_URL is configured, the frontend uses a same-origin proxy for auth and mutations, and server-rendered world reads use the HttpOnly session cookie. Without it, the app deliberately stays in its synthetic read-only preview mode.

## Accepted direction

- Frontend: Next.js with React and TypeScript.
- Runtime: Node.js 26 LTS.
- Visual surfaces: DOM/CSS by default; WebGL 2 for the World Graph.
- 3D rendering: Three.js remains optional and lazy-loaded for a real 3D surface.
- Backend: Rust 1.99.1, Axum 0.8.9 and SQLx 0.9.0.
- Database: PostgreSQL 18.6 for local development and CI.
- Media storage: private S3-compatible bucket through the AWS SDK for Rust; configure a bucket, region and credential provider to enable Gallery uploads.
- Collaboration: Yjs-compatible behaviour remains the target; provider and durable update design are deferred.

## Local development

Start PostgreSQL:

~~~sh
docker compose up -d db
~~~

Run the API:

~~~sh
export DATABASE_URL=postgres://vvd:vvd@localhost:5432/vvd_dev
export APP_ENV=development
export BIND_ADDRESS=127.0.0.1:4100
cargo run -p vvd-api
~~~

The API applies pending migrations on startup. It listens on `http://127.0.0.1:4100` by default.

Private Gallery uploads stay disabled unless `VVD_S3_BUCKET`, `VVD_S3_REGION` and `VVD_CLAMAV_ADDRESS` are set. Run ClamAV in a private network reachable only by the API and set `VVD_CLAMAV_ADDRESS=clamav:3310` (adjust for your network). Configure ClamAV `StreamMaxLength` above the 250 MB maximum Gallery upload. The AWS SDK uses its normal credential chain, such as environment credentials or an attached workload role. For an S3-compatible development endpoint, set `VVD_S3_ENDPOINT` and `VVD_S3_FORCE_PATH_STYLE=true` when the provider requires path-style requests. Production custom endpoints must use HTTPS.

Run the frontend in a second terminal:

~~~sh
nvm use
npm install
export VVD_API_URL=http://127.0.0.1:4100
npm run dev
~~~

Set VVD_API_URL=http://127.0.0.1:4100 in the frontend environment. The same-origin /api route forwards the current browser session to the API; server-rendered world reads use the HttpOnly cookie without exposing it to client code. When VVD_API_URL is absent, the read-only fixture is used.

## Checks

~~~sh
python3 scripts/validate.py
npm run lint
npm run typecheck
npm test
npm run build
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
DATABASE_URL=postgres://vvd:vvd@localhost:5432/vvd_dev cargo test --workspace
cargo build --workspace --release
~~~

The Rust integration test applies the migrations and checks membership enforcement plus same-world reference constraints. Unit tests can run without DATABASE_URL; the PostgreSQL integration test is skipped when the variable is absent.

## API surface

- `POST /v1/auth/register` and `POST /v1/auth/login`: create an account/session or start a session.
- `POST /v1/auth/logout` and `GET /v1/auth/me`: end/read the current session.
- `GET /v1/auth/sessions` and `DELETE /v1/auth/sessions/{id}`: list active sessions with a best-effort browser/platform label and revoke another browser session. The current browser is marked and must use logout.
- Registration and login attempts are throttled in PostgreSQL using hashed IP/email identifiers and 15-minute windows. The API uses the direct peer address; proxy deployments must preserve a trustworthy network boundary rather than accepting arbitrary forwarded headers.
- `GET /v1/worlds` and `POST /v1/worlds`: list accessible worlds or create an owner-managed world.
- `GET /v1/worlds/{slug}`: read a world and its canonical card records.
- `GET/POST /v1/worlds/{slug}/documents`: list or create cards.
- `GET/PATCH /v1/worlds/{slug}/documents/{id}`: read or version-check and update a card.
- `GET /v1/worlds/{slug}/documents/{id}/revisions` and `POST /v1/worlds/{slug}/documents/{id}/revisions/{revisionId}/restore`: inspect prior snapshots and restore one with an expected-version check.
- `POST /v1/worlds/{slug}/documents/{id}/archive`, `GET /v1/worlds/{slug}/archive` and `POST /v1/worlds/{slug}/documents/{id}/restore`: archive cards and restore them later. Archive is reversible; there is no permanent-delete endpoint in this slice.
- `GET/POST /v1/worlds/{slug}/folders`, `PATCH/DELETE /v1/worlds/{slug}/folders/{id}`: list, create, rename, nest, reparent and delete empty folders.
- `POST /v1/worlds/{slug}/documents/{id}/move`: move a card between folders or back to the world root with an expected-version check.
- `GET /v1/worlds/{slug}/media` and `POST /v1/worlds/{slug}/media/uploads`: list private Gallery assets or request a short-lived signed upload.
- `POST /v1/worlds/{slug}/media/{id}/complete`: verify stored object size and declared content type before listing it.
- `GET /v1/worlds/{slug}/media/{id}/download` and `DELETE /v1/worlds/{slug}/media/{id}`: access a short-lived private download or delete an asset.
- `GET /health`: checks API/database connectivity.

Authentication uses an HttpOnly, SameSite=Strict cookie. Production must set APP_ORIGIN and use HTTPS so the cookie is Secure. Never put the session token in a URL or log it.

## Outstanding before public deployment

Nested world folders, card moves, revision history, reversible archive, request rate limits, best-effort session device labels and the private-media API/UI are implemented. Gallery uploads require a configured private S3-compatible bucket and working credentials. The API verifies the stored object's size and declared content type, then streams the complete object through ClamAV before marking it ready. Upload tickets are unavailable if the scanner is not configured; scanner failures fail closed. Configure bucket CORS for the exact app origin and PUT with the Content-Type header, keep public access blocked, and grant only required object-level permissions. Expired pending uploads need a storage lifecycle/cleanup policy. Production must also maintain ClamAV signatures, monitor scanner health and restrict scanner network access.

Email verification and recovery still need a real mail-delivery provider and verified sender configuration. Production secret management, audit events, backup/restore drills and a security review remain open. Collaboration infrastructure is not part of this slice.
