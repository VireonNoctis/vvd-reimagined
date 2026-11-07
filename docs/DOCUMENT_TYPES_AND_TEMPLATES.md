# Document Types and Card Templates

This is the implementation contract for the first document registry and card-template slice. The registry is an explicit catalogue and world allow-list; a catalogue entry is not proof that its content editor exists.

## Document type registry

The global `document_type_registry` table records a stable type key, label, description and implementation status. A world has a matching `world_document_types` allow-list row for every catalogued type.

The current catalogue is:

| Type | Status | Default world availability | Current behaviour |
| --- | --- | --- | --- |
| Card | Ready | Enabled | Canonical card CRUD, properties, references, body blocks and templates |
| Map | Planned | Disabled | Registry metadata only; no map content handler |
| Timeline | Planned | Disabled | Registry metadata only; no timeline content handler |
| Relation Tree | Planned | Disabled | Registry metadata only; no tree content handler |
| Canvas | Planned | Disabled | Registry metadata only; no canvas content handler |

The `documents.document_type` column references the registry. New card creation also checks the world's enabled flag. Planned types cannot be created just because they appear in the catalogue. A type should become ready only when its typed content model, validation, operations and read/write surface exist.

The current API exposes `GET /v1/worlds/{slug}/document-types` and the world response includes the same capability summary. Enabling a future type is deliberately not exposed yet; it must not be enabled before its handler is complete.

## Card subtype templates

Character, Place and Faction remain the supported card subtypes in this slice. A world receives one default template for each subtype when it is created. Existing worlds receive the same defaults through migration 0007.

A template contains:

- A stable id, entity type, name and description.
- Property definitions with stable key, label, value kind, required flag and optional text default.
- Starter body sections with stable id, label and initial text.
- A single default-template flag per world and subtype.

Templates are stored in `card_type_templates`. A card stores its selected `template_id` so its structural origin remains known after creation. The foreign key requires the template to belong to the same world and match the card subtype.

Custom templates can be created through `POST /v1/worlds/{slug}/card-templates`; the world returns its templates in `cardTemplates`, and `GET /v1/worlds/{slug}/card-templates` provides a direct listing. The workspace includes a management page at `/worlds/{slug}/templates`. Templates carry an optimistic version token and can be edited through `PATCH /v1/worlds/{slug}/card-templates/{templateId}` or removed through `DELETE` on the same resource.

## Validation

The server validates template names, field ids, field labels, duplicate keys, value kinds, starter section ids and size limits. When a card is created or edited:

- Required template properties must be present.
- A defined property must use the value kind declared by the template.
- Required text properties cannot be blank.
- Reference values must still resolve to documents in the same world.
- Additional card-level properties remain allowed; a template is a reusable structure, not a closed schema for every individual record.

Template validation runs for canonical edits and era-local overrides. A template cannot be bypassed by sending a handcrafted request to the API.

## Current boundaries

- The three built-in card subtypes remain a fixed enum. Creating arbitrary new entity subtypes is not part of this slice.
- Templates can be created, selected, edited and deleted. Template updates are version-checked. Before a schema change is saved, existing cards using the template are checked for required properties and matching value kinds. A template cannot be deleted while it is the subtype default or while any canonical card (including archived cards) still references it.
- Templates currently describe scalar/reference properties and text starter sections. Media, embedded tool blocks, conditional fields, allowed-reference subtype rules and migration of existing cards after template changes are future work.
- The registry contains Map, Timeline, Relation Tree and Canvas metadata, but these types are planned only. No unsupported type is creatable.
- The world allow-list is seeded per world, but there is no UI/API toggle for it yet. Only Card is enabled by default.

## Verification

The PostgreSQL integration suite covers registry status and enabled flags, seeded defaults, custom template creation and updates, stale-version conflicts, safe default switching, compatibility checks against existing cards, protected deletion of default/in-use templates, deletion of unused templates, required fields on creation and later card edits, and storage of the selected template id.
