UPDATE document_type_registry
SET implementation_status = 'ready'
WHERE type_key IN ('map', 'relation_tree', 'canvas', 'timeline');

UPDATE world_document_types
SET enabled = TRUE, updated_at = NOW()
WHERE type_key IN ('map', 'relation_tree', 'canvas', 'timeline');

CREATE TABLE visual_tool_documents (
    world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
    id UUID NOT NULL,
    tool_kind TEXT NOT NULL CHECK (tool_kind IN ('map', 'relation_tree', 'canvas', 'timeline')),
    era_id UUID NOT NULL,
    name TEXT NOT NULL CHECK (LENGTH(BTRIM(name)) BETWEEN 1 AND 120),
    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
    data JSONB NOT NULL CHECK (
        jsonb_typeof(data) = 'object' AND pg_column_size(data) <= 1500000
    ),
    created_by UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (world_id, id),
    FOREIGN KEY (world_id, era_id)
        REFERENCES eras(world_id, id) ON DELETE CASCADE,
    FOREIGN KEY (world_id, tool_kind)
        REFERENCES world_document_types(world_id, type_key) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX visual_tool_documents_name_unique
    ON visual_tool_documents (
        world_id, era_id, tool_kind, LOWER(name)
    );

CREATE INDEX visual_tool_documents_world_tool_updated_idx
    ON visual_tool_documents (world_id, era_id, tool_kind, updated_at DESC);
