CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX accounts_email_lower_unique ON accounts (LOWER(email));

CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_hash BYTEA NOT NULL UNIQUE CHECK (OCTET_LENGTH(token_hash) = 32),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sessions_account_id_idx ON sessions (account_id);
CREATE INDEX sessions_expiry_idx ON sessions (expires_at);

CREATE TABLE worlds (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    genre TEXT NOT NULL DEFAULT '',
    created_by UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE world_memberships (
    world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (world_id, account_id)
);

CREATE INDEX world_memberships_account_idx ON world_memberships (account_id, world_id);

CREATE TABLE documents (
    world_id UUID NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
    id UUID NOT NULL,
    slug TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type = 'card'),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('character', 'place', 'faction')),
    name TEXT NOT NULL,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
    created_by UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (world_id, id),
    UNIQUE (world_id, slug)
);

CREATE INDEX documents_world_updated_idx ON documents (world_id, updated_at DESC);

CREATE TABLE card_properties (
    world_id UUID NOT NULL,
    document_id UUID NOT NULL,
    id TEXT NOT NULL,
    label TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('text', 'reference')),
    text_value TEXT,
    reference_document_id UUID,
    PRIMARY KEY (world_id, document_id, id),
    FOREIGN KEY (world_id, document_id)
        REFERENCES documents(world_id, id) ON DELETE CASCADE,
    FOREIGN KEY (world_id, reference_document_id)
        REFERENCES documents(world_id, id) ON DELETE RESTRICT,
    CHECK (
        (kind = 'text' AND text_value IS NOT NULL AND reference_document_id IS NULL)
        OR
        (kind = 'reference' AND text_value IS NULL AND reference_document_id IS NOT NULL)
    )
);

CREATE INDEX card_properties_reference_idx
    ON card_properties (world_id, reference_document_id)
    WHERE reference_document_id IS NOT NULL;

CREATE TABLE card_blocks (
    world_id UUID NOT NULL,
    document_id UUID NOT NULL,
    id TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    text TEXT NOT NULL,
    PRIMARY KEY (world_id, document_id, id),
    UNIQUE (world_id, document_id, position),
    FOREIGN KEY (world_id, document_id)
        REFERENCES documents(world_id, id) ON DELETE CASCADE
);
