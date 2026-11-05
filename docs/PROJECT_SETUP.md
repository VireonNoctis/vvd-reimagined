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
- Media storage: S3-compatible object storage deferred until the media slice.
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
- `GET /health`: checks API/database connectivity.

Authentication uses an HttpOnly, SameSite=Strict cookie. Production must set APP_ORIGIN and use HTTPS so the cookie is Secure. Never put the session token in a URL or log it.

## Outstanding before public deployment

Email verification and recovery still need a real mail-delivery provider and verified sender configuration. Request rate limits and best-effort session device labels are implemented. Production secret management, audit events, backup/restore drills and a security review remain open. Active-session listing and remote session revocation are implemented. S3 and collaboration infrastructure are also not part of this slice.
