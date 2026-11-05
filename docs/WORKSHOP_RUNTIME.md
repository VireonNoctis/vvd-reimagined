# Workshop Runtime and Extension Model

This page records the current public Workshop developer contract. It is a reference for a compatible extension architecture; the reconstruction does not need to reproduce the vvd CLI or package format unless that becomes an explicit product goal.

## Tool versus app

A tool consumes a host and edits a declared document type. It can appear in the editor as a panel, as a fullscreen tool or as an embedded block.

An app provides a host and owns a space. It has a route, a project identity and a registry of tools it can mount. Quill and Wiki are examples of app-style products in the public domain model.

A block is the embeddable face of a tool. A block does not turn the parent document into a new app project.

## Project scaffold anatomy

The public CLI guide describes a new tool/app project with:
- vvd.json manifest.
- src/codec.ts for pure data schema.
- src/tool.tsx for a tool UI.
- src/app.tsx for an app UI.
- tsconfig.json with strict TypeScript.
- docs, README and agent guidance.
- local ignored .vvd/ and build output.

The reference scaffold intentionally has no package.json, node_modules or lockfile by default because the vvd host injects React, React DOM, JSX runtime, @vvd/sdk and Yjs as shared platform dependencies. Other npm packages can still be added and bundled.

This is specific to vvd's extension runtime. It does **not** mean our standalone Next.js application should omit package.json or a lockfile.

## Manifest

The public tool/app manifest includes identity and runtime declarations such as:
- id: stable identity key.
- name: human-facing label.
- kind: tool or app.
- version: semantic version.
- icon: host icon id.
- documentTypes: types a tool edits or an app creates.
- codecModule: pure data schema module.
- needs: required host capabilities.
- capabilities: read/write/sharing grants.
- entryModule: component entry.
- route: app URL segment.
- category: storefront grouping, including site-oriented wiki apps.

The tool/app id is not a display name and is permanent in the documented CLI flow. App routes are one lowercase segment. Two apps cannot own the same route. An app can opt into owning deeper subroutes; otherwise deeper paths are not part of its route contract.

## App contract and scope

The SDK's defineApp declaration includes:
- id, name and route.
- Host provider.
- Surface wrapper.
- Tool registry.
- optional subRoutes.
- version and engine compatibility.
- capability declaration.
- author, icon and description.
- category and assets.

A world can have one canonical world-scope app state and multiple project-scoped instances. A project has its own app space and documents but reads the world's shared documents. The scope is exposed by the host; code should not invent its own project-id routing.

The public route shape is /worlds/{world-slug}/{app-route}. An app that claims the subroute tree can navigate within its own path through the host navigation capability.

## Capability mapping

The current app docs give this mapping:

| Manifest grant | Host capabilities | Meaning |
| --- | --- | --- |
| readsWorld | world, search | Query world documents, eras, media and index |
| writesWorld | projects, documents | Create projects/documents and mutate typed content |
| sharing | publish, access, sitePublish | Public links, entitlement checks and site publication |

A tool/app should derive grants from the code's requirements where possible, and fail clearly when a required capability is not supplied. The host—not the extension—decides whether the user has the authority to perform the operation.

## Codecs and merge semantics

The storage guide documents four common field shapes:

| Field | Typical use | Concurrent behaviour |
| --- | --- | --- |
| value | title, mode, colour, scalar config | Last-write-wins |
| list | ordered sequence | Concurrent inserts converge; both inserts land |
| map | keyed collection/settings | Merge by key; conflicts on same key resolve to one winner |
| prose | rich-text field | Character-level collaborative merge |

The codec is pure and should not import React or browser-only services. It defines the data shape once and is used by the platform to manage collaboration. The platform can derive agent operations and search-index metadata from it.

Do not put unrelated collections into one scalar JSON blob: two people editing different parts of that blob can overwrite each other. For keyed entities use a map with stable ids; use a list where order is the meaning.

Important list edge case: the public guide says a concurrent list move is implemented as delete plus insert. Two concurrent moves can cause duplicate copies at two destinations. Use stable item ids and deduplicate when rendering, or choose a keyed map if independent identity matters more than positional semantics.

Adding a new field can be backward-compatible when a default is defined; renaming or reshaping an existing field needs an actual migration plan.

## Rich text

The SDK provides CollaborativeText for prose fields. It wraps TipTap, Yjs and shared document plumbing. A prose field is an opaque token, not a plain string. The editor receives the document handle and prose field token. This avoids turning a collaborative rich-text field into a last-write-wins scalar.

## Loading and error states

The SDK documents a DocumentGate around connection status and retry, with states such as connecting/loading/ready/error. The component should not render a fake empty value while the document has not synced. The UI should distinguish unavailable, empty, disconnected and permission-denied states.

## Assets

The asset manifest declares version-stable logical slots for images, audio, fonts, video and data. Code references a slot key instead of a file path, allowing the user to replace the asset without changing code.

The SDK resolves assets through an override cascade: document override, install override, then shipped default. This supports user customisation while keeping the code stable.

## Build and shipping

The current shipping guide describes:
1. Build the client bundle.
2. Optionally build a server bundle for the tool's api/ directory.
3. Derive and validate the manifest.
4. Derive agent/index metadata from the codec.
5. Hash the bundle and create an immutable version.
6. Save privately.
7. Share to the world/team if desired.
8. Submit for public Workshop review if desired.

The guide says third-party extension code is not executed on the server; server-side package data remains inert JSON. Server-side API integration is separate and secrets remain outside the browser bundle.

Package formats are versioned. Hosts can ignore additive fields they do not understand, but should refuse unsupported major format requirements rather than half-load an extension.

## Testing

The SDK documents a fake host for previews and tests. Test tools against the host capabilities they require, and verify:
- Missing required grant fails explicitly.
- Optional grant absence degrades cleanly.
- Document type mismatch is rejected.
- Read-only identity cannot mutate content.
- Concurrent operations converge.
- Assets resolve at each override layer.
- App project scope remains separate from world scope.
- An old pinned version remains stable after a new save.


## First-party versus community creations

The public tool catalogue should not be treated as a list of exclusively vvd-authored features. The Instagram research pass cross-checked two examples against their first-party listing pages:

- **Trade Routes** is marked as a core vvd tool and is created by vvd. The social announcement describes assigning resources to settlements, connecting them with roads/rivers and simulating supply movement. Its current public tool page still lacks a detailed interaction specification.
- **Calendar** is a community creation credited to HHaseeb, not vvd. Social content demonstrates custom fictional dates, holidays and lunar cycles. This is a good example of the extension model, but it should not be represented as a built-in Timeline replacement.

Keep author/ownership and catalog category attached to tool metadata. In UI, distinguish first-party/core tools from community Workshop creations. The platform host and codec contract should be the same where applicable, but authorship, version source, review status and install/update provenance remain distinct.

The profile also announces a creator link-in-bio surface; no public manifest or SDK route was found, so it is not included in the tool/app runtime model yet.
