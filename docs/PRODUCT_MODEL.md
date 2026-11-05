# Product Model

This is the domain model for the reconstruction. It follows the current public developer documentation rather than treating every older workspace tab as a separate data silo.

## The mental model

**One world, multiple ways to work with it.**

World content is stored as typed documents. Eras determine which version of world content is active. Apps and projects provide specialised experiences over that world. Tools edit specific document types, and blocks let those tools appear inside other documents. A wiki is an app that reads existing world documents; it does not become a duplicate content database.

## Conceptual hierarchy

~~~text
Account
└── Studio (team / organisation context)
    └── World (shared content substrate)
        ├── Memberships and roles
        ├── Eras (world-content version axis)
        │   └── Era-resolved document state
        ├── Documents (typed content)
        │   ├── Card
        │   ├── Map
        │   ├── Timeline
        │   ├── Folder
        │   └── Tool-defined types
        ├── Media library
        ├── Projects (app instances)
        │   └── App-owned output documents
        └── Installed tools and apps
            ├── Tool (document capability)
            ├── App (space and host)
            └── Block (embedded tool view)
~~~

This is a conceptual model from public docs, not a verified relational schema.

## Core entities

### Account

An account is the identity behind an interactive session, API key or OAuth connection. The current API says programmatic credentials act as the account that issued or approved them. World membership and role are the access authority described by the platform.

### Studio

Studio represents an organisation/team context. Public pricing describes studio ownership of worlds, role controls, collaborator capacity and offboarding. The exact billing and membership internals are not public enough to reproduce without direct inspection.

### World

A world is one storytelling universe: characters, places, lore, timelines and other content. A user must belong to a world to see it. The current concepts page says owner, admin and editor roles can change content.

A world is the shared content substrate. It contains canonical typed documents and has settings, membership, themes, media and one or more eras. A project does not own a private copy of all world cards.

### Era

An era is a named version of a world, such as the same world centuries later. The docs say a new era inherits the world's full content by reference; creating one copies nothing.

Implementation implication: the model needs stable document identity plus era-aware version/override resolution. Do not represent each era as a wholly unrelated world or duplicate every document. The public docs do not disclose the exact internal override algorithm; design that carefully and keep it testable.

### Document

A document is a typed unit of world content. Examples include cards, maps, timelines and folders; tools can contribute additional registered types. Document creation first establishes metadata. The editor or typed content API fills in content.

A public list-row example includes:
- id
- name
- slug
- documentType
- updatedAt
- entityTypeId for card subtypes
- avatarMediaId where applicable
- aliases
- isViewable

That is a read/list projection, not a complete storage schema. Document content is read through the typed document runtime.

### Card

A card is a reusable structured world record. The help centre describes name, alias, type/subtype, optional image, properties and ordered body blocks. A card may represent a character, location, faction, object, creature or other entity.

Properties may be text/scalar values or references to other cards of an allowed type. Definitions can belong to one card or apply to all cards of a type. Type templates can provide starter structure. Card body blocks may contain text, media and embedded tool views.

References should point to canonical document ids. Do not duplicate an entity's full text into every map, project or wiki where it appears.

### Project

A project is one instance of an app in a world. Its kind is the app id. A world may have more than one project, including more than one instance of the same app. The project owns app-specific output documents/state while reading shared world content for its selected era.

Quill and Wiki are examples of project kinds in the public docs. A project is not an era and does not fork the world's shared card set.

### App

An app owns a route and a space. It can create/manage projects and host tools. The wiki reference explicitly defines a wiki as an app with site-oriented manifest fields that reads existing world documents.

### Tool

A tool edits one declared document type. It has a React component and may render as an editor panel, fullscreen surface or embedded block. The host supplies platform services such as opening documents, synchronization, merging, undo, presence and permission enforcement.

### Block

A block is the embedded face of a tool. It can be mounted inside another document—for example, a timeline or relation-tree view inside a card. An embedded block remains a view of tool state; it should not silently fork or duplicate the parent's document.

### Host and capabilities

The host is the platform interface injected into an app/tool. Capabilities are permission-gated and described by the manifest. The SDK reference includes world reads, writing, projects, media, navigation, sharing, publication/access, feedback, analytics and tutorial services.

A missing optional capability should result in a clear unavailable state; a required undeclared capability should fail explicitly rather than silently grant access.

### Codec

A codec declares the typed data shape and merge behaviour of a document or collaborative state. It is intended to keep UI state, durable state and indexed projections aligned. Complex tools may use custom codecs for graph/canvas/tree-like data. The current SDK documents Yjs as the underlying collaborative CRDT and hides its mechanics behind SDK codecs and hooks.

## Relationship types

Do not flatten every relationship into a generic edge without retaining its origin and semantics.

| Relationship | Meaning | Source of truth |
| --- | --- | --- |
| Text mention | A card name or alias points to another card | Text content plus resolved reference |
| Typed property reference | A property points to a card of an allowed type | Card property |
| Map pin | Card is placed at a map coordinate | Map document |
| Zone association | Polygonal map region references a card | Map document |
| World graph link | Older graph visualises mention/property relationships | Derived graph projection |
| Relation-tree edge | Explicit connection between tree nodes | Relation Tree document |
| Project ownership | App instance owns app-specific documents | Project |
| Block embedding | Tool view is mounted in a parent document | Parent block structure and tool identity |

The help centre explicitly says graph and tree links do not automatically synchronise in either direction. Keep this distinction in both API and UI.

## Content lifecycle

The public API separates document metadata from typed content. It has a set of allowed document types and type-specific content operations. An operation for the wrong type is expected to fail with an explicit supported-operation error.

A document read can report whether its content came from a live source, stored fallback or is empty. The reconstruction should keep metadata, canonical content, collaboration state and read/search projections distinct.

## Publication model

The current shipping material describes independent actions:
- Save creates an immutable private version.
- Share points a world/team at a saved version.
- Publish submits an app/tool creation to the Workshop for human review.
- Site publish makes a wiki or site available to an audience.

A wiki is a live app that reads canonical world data. For publication safety, the serving view may need an immutable snapshot or pinned content version so a public page does not change unexpectedly when an author edits a draft. The exact snapshot strategy for published wiki data is still a reconstruction decision.

The wiki reference documents public, unlisted/capability URL, password and entitled audiences. Audience checks must be enforced server-side.

## Invariants

1. World is the shared content substrate.
2. Era is the world-content version axis.
3. Project is an app instance; it does not fork world cards.
4. Documents are typed and type-validated.
5. Tools edit declared document types.
6. Blocks embed tool views without changing parent identity.
7. Host capabilities and world roles are enforced server-side.
8. Cross-document references resolve to canonical records.
9. Graph and Relation Tree links preserve separate semantics.
10. Presence is ephemeral, per-document, and not durable document content.
11. Save, share and publish are separate actions.
12. Archive, restore and permanent deletion are distinct operations.
