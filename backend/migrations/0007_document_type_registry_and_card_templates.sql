CREATE TABLE document_type_registry (
    type_key TEXT PRIMARY KEY CHECK (type_key ~ '^[a-z][a-z0-9_]{0,63}$'),
    name TEXT NOT NULL CHECK (LENGTH(BTRIM(name)) BETWEEN 1 AND 80),
    description TEXT NOT NULL DEFAULT '' CHECK (LENGTH(description) <= 500),
    implementation_status TEXT NOT NULL CHECK (
        implementation_status IN ('ready', 'planned')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO document_type_registry (type_key, name, description, implementation_status)
VALUES
    ('card', 'Card', 'Structured world records with aliases, properties and ordered content.', 'ready'),
    ('map', 'Map', 'Image-backed maps with layers, regions and linked pins.', 'planned'),
    ('timeline', 'Timeline', 'Calendar-aware events linked to world records.', 'planned'),
    ('relation_tree', 'Relation Tree', 'Explicit nodes and typed relationships.', 'planned'),
    ('canvas', 'Canvas', 'Spatial documents containing cards, media and drawing.', 'planned');

CREATE TABLE world_document_types (
    world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
    type_key TEXT NOT NULL REFERENCES document_type_registry(type_key) ON DELETE RESTRICT,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (world_id, type_key)
);

INSERT INTO world_document_types (world_id, type_key, enabled)
SELECT worlds.id, types.type_key, types.type_key = 'card'
FROM worlds
CROSS JOIN document_type_registry types;

ALTER TABLE documents
    DROP CONSTRAINT documents_document_type_check;

ALTER TABLE documents
    ADD CONSTRAINT documents_document_type_registry_fk
    FOREIGN KEY (document_type)
    REFERENCES document_type_registry(type_key)
    ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE TABLE card_type_templates (
    world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
    id UUID NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('character', 'place', 'faction')),
    name TEXT NOT NULL CHECK (LENGTH(BTRIM(name)) BETWEEN 1 AND 80),
    description TEXT NOT NULL DEFAULT '' CHECK (LENGTH(description) <= 500),
    property_definitions JSONB NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(property_definitions) = 'array'),
    starter_blocks JSONB NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(starter_blocks) = 'array'),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (world_id, id),
    UNIQUE (world_id, entity_type, id),
    UNIQUE (world_id, entity_type, name)
);

CREATE UNIQUE INDEX card_type_templates_one_default_idx
    ON card_type_templates (world_id, entity_type)
    WHERE is_default;

CREATE INDEX card_type_templates_world_type_idx
    ON card_type_templates (world_id, entity_type, created_at DESC);

INSERT INTO card_type_templates (
    world_id, id, entity_type, name, description,
    property_definitions, starter_blocks, is_default, created_by
)
SELECT
    worlds.id,
    gen_random_uuid(),
    seed.entity_type,
    seed.name,
    seed.description,
    seed.property_definitions::jsonb,
    seed.starter_blocks::jsonb,
    TRUE,
    worlds.created_by
FROM worlds
CROSS JOIN (
    VALUES
    (
        'character',
        'Character',
        'A person or being with a place in the world.',
        '[{"id":"role","label":"Role","kind":"text","required":false,"defaultValue":""},{"id":"age","label":"Age","kind":"text","required":false,"defaultValue":""}]',
        '[{"id":"intro","label":"Introduction","text":""},{"id":"background","label":"Background","text":""}]'
    ),
    (
        'place',
        'Place',
        'A location, settlement or region.',
        '[{"id":"region","label":"Region","kind":"text","required":false,"defaultValue":""},{"id":"climate","label":"Climate","kind":"text","required":false,"defaultValue":""}]',
        '[{"id":"overview","label":"Overview","text":""},{"id":"details","label":"Details","text":""}]'
    ),
    (
        'faction',
        'Faction',
        'An organisation, culture or political group.',
        '[{"id":"seat","label":"Seat","kind":"text","required":false,"defaultValue":""},{"id":"influence","label":"Influence","kind":"text","required":false,"defaultValue":""}]',
        '[{"id":"overview","label":"Overview","text":""},{"id":"history","label":"History","text":""}]'
    )
) AS seed(entity_type, name, description, property_definitions, starter_blocks);

ALTER TABLE documents
    ADD COLUMN template_id UUID;

UPDATE documents AS document
SET template_id = template.id
FROM card_type_templates AS template
WHERE template.world_id = document.world_id
  AND template.entity_type = document.entity_type
  AND template.is_default;

ALTER TABLE documents
    ADD CONSTRAINT documents_card_template_fk
    FOREIGN KEY (world_id, entity_type, template_id)
    REFERENCES card_type_templates(world_id, entity_type, id)
    ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX documents_template_idx
    ON documents (world_id, template_id)
    WHERE template_id IS NOT NULL;
