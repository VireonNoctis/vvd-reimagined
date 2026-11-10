ALTER TABLE sessions ADD COLUMN user_agent TEXT;

CREATE TABLE auth_rate_limits (
    identifier_hash BYTEA PRIMARY KEY CHECK (OCTET_LENGTH(identifier_hash) = 32),
    attempts INTEGER NOT NULL CHECK (attempts > 0),
    window_started_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX auth_rate_limits_expiry_idx ON auth_rate_limits (expires_at);
