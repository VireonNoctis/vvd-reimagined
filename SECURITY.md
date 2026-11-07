# Security Policy

This repository handles unpublished writing, worldbuilding records, media, collaborator identities and private links. Treat all world content and account data as sensitive.

## Reporting a vulnerability

Do not disclose suspected vulnerabilities in public issues, pull requests or discussions.

Use GitHub's **Report a vulnerability** feature in the Security tab when private vulnerability reporting is enabled. If it is unavailable, contact the maintainers through a privately published route and establish a secure channel before sending technical details.

Include the affected commit/version, impact, concise reproduction and required conditions. Redact credentials, private URLs, personal information and real user content.

## Controls implemented in the current branch

The current implementation includes the following controls. They are implementation facts, not a claim that the whole service has passed an independent security audit.

- Passwords are hashed with Argon2id; registration enforces a 12–128 character length.
- Sessions use opaque random tokens. Only SHA-256 token digests are stored in PostgreSQL. Session cookies are HttpOnly, SameSite=Strict, expire after 14 days, and receive Secure in production.
- Users can inspect active sessions, end one remote session or end every other session without deleting the current browser.
- Account security history records successful sign-ins/sign-outs, password changes and remote-session revocations for 90 days; the signed-in account can inspect its latest 50 events. Event details do not include raw IP addresses, credentials or session tokens.
- Password changes require the current password, reject reusing the existing password, rotate the current session token and revoke all other sessions inside one database transaction.
- Registration and login use database-backed IP and normalized-email throttles with 15-minute windows. Source IP is taken from the TCP peer address; forwarded headers are not trusted by the API.
- Mutating browser requests check the configured application Origin and Fetch Metadata. Cross-site and same-site browser contexts are rejected; clients that do not send Fetch Metadata remain distinguishable as non-browser clients.
- The Next.js application and Rust API set no-sniff, frame-denial, referrer and permission headers. Production frontend responses set HSTS.
- Next.js 16 Proxy generates a fresh per-request nonce and forwards a nonce-based Content Security Policy to the renderer and browser. Script execution uses `strict-dynamic`; inline script attributes are blocked. Inline style attributes remain allowed for the graph's pointer interaction. Presigned storage PUT requests are restricted to exact origins configured in `VVD_CSP_CONNECT_ORIGINS`.
- World membership and role checks are enforced in Rust for reads and writes. Viewers are read-only; world writes require owner, admin or editor. Composite foreign keys keep canonical references inside their world.
- Card changes use transactions and expected versions. Immutable snapshots support revision inspection and conflict-checked restore. Archive is reversible and does not silently destroy canonical IDs.
- Private media uses server-generated object keys, short-lived signed URLs, membership-checked access and server-side size/content-type metadata comparisons. Unsupported file types, including SVG, are rejected. An upload cannot receive a ticket or become ready unless a ClamAV daemon is configured; completed objects are streamed through ClamAV INSTREAM before publication, and infected objects are rejected and deleted.

## Important boundaries and production gates

**Security is not complete and this branch is not production-certified.** The following work remains before a public launch:

- Email verification, password recovery, multifactor authentication and account-deletion/export workflows.
- Independent security review and penetration testing of authentication, authorization, session lifecycle, CSRF, storage and deployment.
- Verified deployment topology, TLS termination, trusted reverse-proxy configuration, host allow-listing and network restrictions for PostgreSQL and object storage.
- A defined secret-management and rotation process. Production credentials must not be committed or exposed to browser bundles.
- Production must run a maintained, network-isolated ClamAV daemon, set `VVD_CLAMAV_ADDRESS`, configure `StreamMaxLength` above the largest permitted upload (250 MB), monitor scanner availability/signature freshness and test rejection/deletion behaviour. The API fails closed for new uploads when the scanner is unavailable. The integration is implemented, but the repository cannot provision or verify the production daemon.
- Storage bucket policies, CORS rules, lifecycle cleanup for expired pending uploads, backup policy and restore drills.
- Extend the current account security history to world membership, sharing and destructive operations; central alerting, monitoring and incident response remain open.
- Browser verification of the nonce-based policy across production routes, plus configuration of every presigned-upload origin in `VVD_CSP_CONNECT_ORIGINS`. The policy still allows inline style attributes for the graph and must not be described as a fully strict style policy.
- Automated dependency vulnerability review and a reproducible lockfile-backed installation for both npm and Cargo.
- Private vulnerability reporting must be enabled in repository settings and tested; the presence of this document does not prove that setting is active.

The current rate limiter uses pseudonymous SHA-256 identifiers, not anonymisation. Treat the rate-limit table as sensitive operational data and restrict database access.

## Security expectations

- Enforce authorization server-side for every read and write. UI visibility is never permission enforcement.
- Treat unlisted URLs as bearer capabilities with explicit scope, expiry, revocation and rotation.
- Keep storage objects private by default; issue signed URLs only after authorization.
- Validate file type, size and contents; client MIME metadata alone is not trusted.
- Keep presence ephemeral and out of durable document content.
- Do not execute third-party tool bundles with server privileges.
- Keep user-authored content and credentials out of analytics and error traces by default.
- Review migrations and destructive operations for retention, backup and recovery consequences.

## Supported versions

Until a stable release is published, security fixes target the open development branch. Record the affected commit when reporting an issue. The project does not yet publish a supported-version or response-time guarantee.
