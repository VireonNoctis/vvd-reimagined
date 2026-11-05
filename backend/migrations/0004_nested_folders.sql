CREATE TABLE folders (
    world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
    id UUID NOT NULL,
    name TEXT NOT NULL CHECK (LENGTH(BTRIM(name)) BETWEEN 1 AND 80),
    parent_id UUID,
    created_by UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (world_id, id),
    FOREIGN KEY (world_id, parent_id)
        REFERENCES folders(world_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX folders_sibling_name_unique
    ON folders (
        world_id,
        COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
        LOWER(name)
    );

ALTER TABLE documents
    ADD COLUMN folder_id UUID,
    ADD CONSTRAINT documents_folder_world_fk
        FOREIGN KEY (world_id, folder_id)
        REFERENCES folders(world_id, id) ON DELETE RESTRICT;

CREATE INDEX documents_folder_idx
    ON documents (world_id, folder_id, name)
    WHERE archived_at IS NULL;
