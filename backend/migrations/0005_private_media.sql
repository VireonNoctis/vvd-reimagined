CREATE TABLE media_assets (
    id UUID PRIMARY KEY,
    world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
    document_id UUID,
    owner_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    object_key TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL CHECK (LENGTH(BTRIM(file_name)) BETWEEN 1 AND 180),
    content_type TEXT NOT NULL CHECK (LENGTH(content_type) BETWEEN 1 AND 100),
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'rejected', 'deleted')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (world_id, document_id)
        REFERENCES documents(world_id, id) ON DELETE RESTRICT
);

CREATE INDEX media_assets_world_gallery_idx
    ON media_assets (world_id, created_at DESC)
    WHERE status = 'ready';

CREATE INDEX media_assets_pending_expiry_idx
    ON media_assets (expires_at)
    WHERE status = 'pending';

CREATE INDEX media_assets_document_idx
    ON media_assets (world_id, document_id)
    WHERE status = 'ready';
