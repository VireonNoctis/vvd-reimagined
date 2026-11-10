CREATE TABLE account_security_events (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'sign_in',
            'sign_out',
            'password_changed',
            'session_revoked',
            'sessions_revoked'
        )
    ),
    details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX account_security_events_recent_idx
    ON account_security_events (account_id, created_at DESC, id DESC);
