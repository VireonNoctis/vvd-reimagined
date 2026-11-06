CREATE TABLE eras (
    world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
    id UUID NOT NULL,
    name TEXT NOT NULL CHECK (LENGTH(BTRIM(name)) BETWEEN 1 AND 80),
    description TEXT NOT NULL DEFAULT '' CHECK (LENGTH(description) <= 2_000),
    parent_era_id UUID,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (world_id, id),
    FOREIGN KEY (world_id, parent_era_id)
        REFERENCES eras(world_id, id) ON DELETE RESTRICT,
    CHECK (parent_era_id IS NULL OR parent_era_id <> id)
);

CREATE UNIQUE INDEX eras_name_unique
    ON eras (world_id, LOWER(name));

CREATE UNIQUE INDEX eras_single_default_idx
    ON eras (world_id)
    WHERE is_default;

INSERT INTO eras (world_id, id, name, description, parent_era_id, is_default, created_by)
SELECT id, gen_random_uuid(), 'Prime', 'The shared starting state of this world.', NULL, TRUE, created_by
FROM worlds;

CREATE TABLE document_era_overrides (
    world_id UUID NOT NULL,
    era_id UUID NOT NULL,
    document_id UUID NOT NULL,
    patch JSONB NOT NULL CHECK (jsonb_typeof(patch) = 'object'),
    version BIGINT NOT NULL CHECK (version > 0),
    updated_by UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (world_id, era_id, document_id),
    FOREIGN KEY (world_id, era_id)
        REFERENCES eras(world_id, id) ON DELETE CASCADE,
    FOREIGN KEY (world_id, document_id)
        REFERENCES documents(world_id, id) ON DELETE CASCADE
);

CREATE INDEX document_era_overrides_document_idx
    ON document_era_overrides (world_id, document_id, era_id);
