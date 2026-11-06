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
- Users can inspect their active sessions and revoke another session belonging to their own account. The current session signs out through the normal logout route.
- Registration and login use database-backed IP and normalized-email throttles with 15-minute windows. Source IP is taken from the TCP peer address; forwarded headers are not trusted by the API.
- Mutating browser requests check the configured application Origin and Fetch Metadata. Cross-site and same-site browser contexts are rejected; clients that do not send Fetch Metadata remain distinguishable as non-browser clients.
- The Next.js application and Rust API set no-sniff, frame-denial, referrer and permission headers. Production frontend responses set HSTS.
- World membership and role checks are enforced in Rust for reads and writes. Viewers are read-only; world writes require owner, admin or editor. Composite foreign keys keep canonical references inside their world.
- Card changes use transactions and expected versions. Immutable snapshots support revision inspection and conflict-checked restore. Archive is reversible and does not silently destroy canonical IDs.
- Private media uses server-generated object keys, short-lived signed URLs, membership-checked access and server-side size/content-type metadata comparisons. Unsupported file types, including SVG, are rejected.

## Important boundaries and production gates

**Security is not complete and this branch is not production-certified.** The following work remains before a public launch:

- Email verification, password recovery, multifactor authentication, password changes and account-deletion/export workflows.
- Independent security review and penetration testing of authentication, authorization, session lifecycle, CSRF, storage and deployment.
- Verified deployment topology, TLS termination, trusted reverse-proxy configuration, host allow-listing and network restrictions for PostgreSQL and object storage.
- A defined secret-management and rotation process. Production credentials must not be committed or exposed to browser bundles.
- Malware/content scanning and operational quarantine for uploaded files; metadata checks do not prove that a file is safe to open.
- Storage bucket policies, CORS rules, lifecycle cleanup for expired pending uploads, backup policy and restore drills.
- Central audit events for membership, sharing, account and destructive operations; alerting, monitoring and incident response.
- A Content Security Policy designed with Next.js nonce support. A permissive CSP is deliberately not asserted by the current configuration.
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
