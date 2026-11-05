# Platform, Extensions and Collaboration

This page summarises vvd's current public developer-platform contract. It is evidence about the published extension/API surface—not proof of the private production implementation.

## One operation engine, three entry points

The API overview presents one server-side operation layer through:

| Surface | Endpoint | Role |
| --- | --- | --- |
| REST | https://vvd.world/api/v1 | HTTP operations and OpenAPI contract |
| MCP | https://vvd.world/api/mcp | MCP clients and agent workflows |
| CLI | vvd command-line tool | Developer and terminal workflows |

The docs say all three execute the same server-side operations, authenticate the same way and enforce the same world permissions. Our implementation should avoid separate business rules per transport.

## Authentication

The current documentation describes:
1. **API key:** bearer credential created from account settings and revocable by the account.
2. **Connect/device flow:** a tool asks the creator to approve a connection through a vvd sign-in/approval page; the user receives a durable credential after completing the flow.
3. **OAuth 2.1 with PKCE:** authorization-code flow for third-party connectors.

The CLI guide describes a one-time code from Workshop → Developer that is exchanged for local credentials. The SDK reference describes server-side API secrets separately from browser code.

Never put API keys or client secrets in a Next.js client bundle. A browser app should use the user's authenticated session; server integrations should use a secret manager and explicit capability grants.

## Permission model

The current API docs say the credential acts as the account. World membership and role provide the content permission authority:
- A world member can read.
- Owner, admin or editor can change content according to current concepts.
- Removing a user from a world revokes access through that same membership authority.
- The docs say there is no separate API-scope permission system for world content in the documented v1 model.
- External API/MCP/CLI reading and editing is plan-gated; building tools/apps with the CLI is described as free on all plans.

Our service layer must authorize every read and write. Hiding a control in React is not access control.

## Documents and typed operations

The API separates document metadata from content. Metadata creation establishes the document id, name and document type. Its body is then populated by the app editor or typed content operation.

Document types must be part of the world's valid type allow-list: built-in types plus types registered by installed tools. The content API applies operations appropriate to the selected type. The docs show timeline event creation and animator clip updates as examples. A wrong-type operation returns a clear error describing supported operations.

A document response can indicate content is live, a stored fallback is used, or the content is empty. This distinction should appear in the UI as a useful state, not be flattened into a generic empty document.

## Tools, apps and blocks

A **tool** edits one declared document type. The manifest declares the type and requested platform capabilities. A React component can render as a panel, fullscreen surface or embedded block.

An **app** owns a route and a space. It can create projects and project documents, and host other tools. An **app project** is one instance inside a world.

A **block** is the embedded representation of a tool. It appears inside another document but retains the underlying tool identity and permission boundary.

The host can provide shared document opening, sync, merge, undo, presence and permission enforcement. Tool UI should not reimplement those services independently.

## Capabilities and manifest grants

The current SDK names capability families including:
- World/document reads: docs, eras, projects, media, index, metadata and graph projections.
- Writes: create/archive/restore documents and typed content changes.
- Projects: list/create app instances and their documents.
- Media: resolve and handle world assets.
- Navigation and host UI services.
- Sharing and publishing.
- Access checks and entitlement requirements.
- Feedback, analytics and tutorial state.

A manifest declares the capabilities the creation requires. Missing grants should not be bypassed. A required unavailable grant should result in an explicit error, while optional capabilities should be checked and degrade cleanly.

## Yjs and typed codecs

The Workshop storage guide identifies Yjs as the CRDT underneath collaborative document state. Tool authors generally work through the typed SDK codec rather than manipulating Yjs directly.

The guide documents merge behaviour for different field kinds:
- Scalar values: last-write-wins.
- Lists: collaborative list operations.
- Maps: merge by key.
- Prose: character-level collaborative rich text.

Custom codecs can expose typed snapshots and operations for complex documents such as canvases and trees. The codec should be the boundary between domain shape and underlying CRDT mechanics. Keep editor components typed and unaware of Yjs internals.

## Presence

Presence is separate from durable document state. The SDK describes it through Yjs awareness and a per-document peer list. The public peer shape includes userId, name, colour, isSelf and optional avatarMediaId. The list updates as people arrive and leave; the SDK handles the signalling/heartbeat work.

Presence can also represent transient pointers or selections. It should disappear on disconnect and must never be persisted as document content. Scope it to a document/session rather than implying that one open-document peer list means someone is present throughout an entire world.

## Offline and reconnect behaviour

The Google Play description says typing does not wait for the network and synchronisation resumes when the connection returns. This is product-level evidence for an offline-tolerant experience, not a full protocol description.

Our reconstruction should explicitly design a local edit queue, pending/syncing/synced/failed states, reconnect/retry behaviour and recovery. Do not claim offline support until those semantics are implemented and tested under network interruption.

## Save, share, publish and site publication

The current shipping guide separates these operations:

- **Save:** creates an immutable private version.
- **Share:** points a world/team at a saved version.
- **Publish:** submits a creation to Workshop for human review.
- **Site publish:** publishes a wiki/app instance to a public address or configured audience.

A save should not silently change visibility. An installed creation can pin a specific version. Updating a private draft should not silently upgrade every installation. Rollback should point at an earlier immutable version rather than mutating its contents.

## Wiki audiences

The current wiki reference documents:
- Public: anyone with the address can read.
- Unlisted: readers need the capability URL.
- Password: readers must pass the configured password gate.
- Entitled: only people granted access can read.

The serving layer must enforce the selected audience. Unlisted URLs should be treated as bearer capabilities and should be revocable/rotatable.

## Optional Three.js support

The SDK reference exposes loadThree(), a lazy shared loader. The library is not fetched until a creation calls it; the promise is cached, and multiple creations in the session share the same Three.js instance and bundled example loaders (OBJ, GLTF, STL, PLY and FBX).

This aligns with our accepted rendering decision: keep Three.js optional and load it only for an actual 3D surface. Ordinary forms, cards, writing and navigation should not incur the 3D runtime cost.

## Unknown private infrastructure

Public docs do not establish the database vendor, object storage, deployment topology, websocket service, search engine, queue infrastructure, observability provider, backup cadence or exact production retention model. Rust, PostgreSQL and S3-compatible storage are candidates for our implementation only.
