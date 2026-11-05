# Publishing, Sharing and Wiki

The public developer docs separate private versioning, team visibility, Workshop distribution and website publication. Treat them as separate product actions and permissions.

## Four distinct operations

| Operation | Result | Audience |
| --- | --- | --- |
| Save | Creates an immutable private version | Creator |
| Share | Moves the world/team pointer to a selected saved version | Members of that world/team |
| Publish | Submits a creation to Workshop for human review | Public Workshop after approval |
| Site publish | Publishes a wiki/app instance to an address and audience | Audience configured by the site owner |

Saving is not sharing. Sharing is not Workshop publication. Workshop publication is not the same as publishing a world's wiki.

## Immutable versions

The shipping guide describes each save as minting an immutable version. A version includes the compiled client bundle, optional server bundle, derived manifest and a content hash.

A new private save does not automatically update:
- the version the team can open,
- the version already installed by another member,
- the current public Workshop version.

Each visibility target is an independent pointer. The docs describe explicit share/publish actions, pinned installs and rollback to an earlier version. Submitting a new public version keeps the previous public version available until the new one passes review.

This design gives creators a safe draft area and prevents unfinished code from being pushed into shared workspaces.

## Version and installation behaviour

- An install records an exact version.
- A later save does not silently update installed copies.
- Sharing a newer version does not automatically upgrade every existing installation in a multi-member world.
- An update is a deliberate install/pin action.
- Rollback points a visibility pointer at a prior immutable version.

The reconstruction should show the user which version is private, shared, installed and public.

## Workshop review

The current shipping guide says public publication is reviewed by a human. Review states include in review, changes requested, rejected and approved. The old public version remains live while a new version is under review. Do not pretend that a submitted extension is immediately public.

## Wiki is a world-reading app

The current Wiki guide makes a strong architecture point: a wiki reads a world rather than storing another copy of its content. Cards, maps and notes already exist in the world; the wiki renders them through a theme and lets the owner arrange the site.

This means:
- Editing a world card should be reflected in world-reading surfaces according to their version/snapshot policy.
- The wiki does not become an alternative source of truth for cards.
- Theme/layout configuration belongs to the wiki app/project.
- Reader-facing routes must enforce the site's configured audience.
- Published output should not expose documents the audience is not permitted to read.

The public docs demonstrate live world reads, but the exact policy for freezing wiki content at publication time versus live updates is not fully described. That is an important open question for this reconstruction.

## Wiki audience modes

The current wiki reference documents:

| Audience | Meaning |
| --- | --- |
| Public | Anyone with the address may read |
| Unlisted | Access requires the capability URL |
| Password | Reader must pass a configured password gate |
| Entitled | Reader must have been granted access by the creator |

The older overview says a wiki is not public by default. Default to private/unpublished until a creator explicitly publishes and chooses an audience.

Unlisted URLs are bearer capabilities. They need revocation/rotation and should not be indexed by default. Passwords must be stored hashed and checked server-side. Entitled access needs an explicit grant model.

## Reader experience

The help centre describes reader navigation through:
- Search.
- Top-level sections.
- Inline links to cards.
- Map pins linking to card pages.

The marketing site highlights a fully customisable wiki. The current developer Wiki guide describes themes and owner-arranged content. The exact current editor layout, header/banner controls, featured sections, font options and mobile navigation still need direct capture.

## Custom domains

The current pricing page lists custom domains for Pro and Studio. The help centre describes Site & Domain settings for selecting a vvd subdomain, adding a custom domain and managing published links.

Implementation questions include domain verification, ownership checks, SSL provisioning, redirect/canonical handling, removal and downtime on downgrade. Do not publish arbitrary user-supplied hostnames without a verified domain-ownership flow.

## Safety and correctness requirements

- Never publish on save.
- Keep private drafts private.
- Make audience selection explicit.
- Show exactly which world/project and version is being published.
- Preview the reader experience before publishing.
- Keep old publication live until a new one validates.
- Support unpublish, revoke and rollback.
- Re-check permissions at read time.
- Do not expose archived or private records from public site queries.
- Keep a publication audit trail.


## Overworld template and map-first publication

The current Wiki developer reference confirms that vvd ships Default and Overworld as first-party site templates. They are not separate copies of a world's content and are selected through the shared Wiki template switcher/design rail. Site-category apps share the Wiki host surface; the platform supplies its Customize rail and Publish action.

The Overworld Instagram demonstration highlights interactive regions and pins, a cleaner site UI and animated cloud layers. This suggests a map-first reader hierarchy: the map is the principal navigation surface, and regions/pins lead readers into canonical world entries. Treat the cloud layer as decorative, not as map geometry or a second copy of geographic content. It should be independently controllable, reduced-motion aware and inexpensive on devices that do not need animation.

The current Wiki technical reference adds a crucial live/published split: the live template reads the current world and may accept editor changes, while the published edition reads a frozen snapshot with no collaboration sockets, authentication or database access. Design the same page component to render both modes from their respective inputs; do not call live collaboration/customization hooks in the frozen published renderer.

These implementation details are grounded in the current developer reference. The exact Overworld map layout and cloud animation timing remain visual-inspection tasks.
