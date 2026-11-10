ALTER TABLE media_assets
    DROP CONSTRAINT IF EXISTS media_assets_status_check;

ALTER TABLE media_assets
    ADD CONSTRAINT media_assets_status_check
    CHECK (status IN ('pending', 'ready', 'rejected', 'deleting', 'deleted'));
