CREATE TABLE world_graph_layouts (
    id UUID PRIMARY KEY,
    world_id UUID NOT NULL,
    account_id UUID NOT NULL,
    era_id UUID NOT NULL,
    name TEXT NOT NULL CHECK (LENGTH(BTRIM(name)) BETWEEN 1 AND 80),
    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
    positions JSONB NOT NULL CHECK (jsonb_typeof(positions) = 'array'),
    view JSONB NOT NULL CHECK (jsonb_typeof(view) = 'object'),
    filters JSONB NOT NULL CHECK (jsonb_typeof(filters) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (world_id, account_id)
        REFERENCES world_memberships(world_id, account_id) ON DELETE CASCADE,
    FOREIGN KEY (world_id, era_id)
        REFERENCES eras(world_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX world_graph_layouts_name_unique
    ON world_graph_layouts (world_id, account_id, era_id, LOWER(name));

CREATE INDEX world_graph_layouts_owner_idx
    ON world_graph_layouts (world_id, account_id, era_id, updated_at DESC);
