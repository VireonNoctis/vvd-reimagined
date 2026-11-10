ALTER TABLE documents
    ADD COLUMN archived_at TIMESTAMPTZ,
    ADD COLUMN archived_by UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX documents_active_world_idx
    ON documents (world_id, name ASC)
    WHERE archived_at IS NULL;

CREATE INDEX documents_archive_world_idx
    ON documents (world_id, archived_at DESC)
    WHERE archived_at IS NOT NULL;

CREATE TABLE document_revisions (
    id UUID PRIMARY KEY,
    world_id UUID NOT NULL,
    document_id UUID NOT NULL,
    version BIGINT NOT NULL CHECK (version > 0),
    snapshot JSONB NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
    created_by UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (world_id, document_id)
        REFERENCES documents(world_id, id) ON DELETE CASCADE,
    UNIQUE (world_id, document_id, version)
);

CREATE INDEX document_revisions_history_idx
    ON document_revisions (world_id, document_id, version DESC);
