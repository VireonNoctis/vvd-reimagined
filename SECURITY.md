# Security Policy

This product will eventually hold unpublished writing, worldbuilding notes, media, collaborator identities and private share links. Those are sensitive user assets.

## Reporting a vulnerability

Do not disclose suspected vulnerabilities in public issues, pull requests or discussions.

Use GitHub's **Report a vulnerability** feature in the Security tab when private vulnerability reporting is enabled. If it is unavailable, contact the maintainers through a privately published route and ask for a secure channel before sending technical details.

Include the affected commit/version, impact, concise reproduction and required conditions. Redact credentials, private URLs, personal information and real user content.

## Areas requiring particular care

- Authentication, sessions, account recovery and API credentials.
- World membership, role checks, share-link audiences and published-site access.
- Cross-world and cross-project document access.
- Upload validation, media URLs, file parsing and object-storage permissions.
- Rich-text rendering, embeds, imported documents and link handling.
- Collaboration channels, presence payloads and document operations.
- Revision restore, archive, deletion and export.
- Tool/app manifests, grants, integrations and secrets.

## Security expectations

- Enforce authorization server-side for every read and write.
- Treat unlisted URLs as capabilities with explicit scope, expiry/revocation and rotation.
- Keep storage objects private by default; issue signed URLs only after authorization.
- Validate file type, size and contents; never trust client MIME metadata alone.
- Keep presence ephemeral and out of durable document content.
- Do not execute third-party tool bundles with server privileges.
- Audit sensitive membership, sharing, billing and account changes.
- Keep user-authored content and credentials out of analytics and error traces by default.

## Scope

Reports are reviewed by maintainers. A report is not accepted until impact and scope are confirmed. Before public deployment, enable private vulnerability reporting and document supported versions and response expectations.
