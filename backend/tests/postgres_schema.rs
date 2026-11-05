use sha2::{Digest, Sha256};
use sqlx::postgres::PgPoolOptions;
use uuid::Uuid;
use vvd_api::store;

#[tokio::test]
async fn migrations_enforce_membership_and_same_world_references() {
    let Ok(database_url) = std::env::var("DATABASE_URL") else {
        return;
    };

    let pool = PgPoolOptions::new()
        .max_connections(3)
        .connect(&database_url)
        .await
        .expect("connect to the PostgreSQL test service");

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("apply backend migrations");

    let account_id = Uuid::new_v4();
    let world_id = Uuid::new_v4();
    let other_world_id = Uuid::new_v4();
    let source_document_id = Uuid::new_v4();
    let local_target_id = Uuid::new_v4();
    let foreign_target_id = Uuid::new_v4();
    let unique = Uuid::new_v4().simple().to_string();

    sqlx::query(
        "INSERT INTO accounts (id, email, display_name, password_hash)
         VALUES ($1, $2, 'Test Account', 'test-only')",
    )
    .bind(account_id)
    .bind(format!("{unique}@example.test"))
    .execute(&pool)
    .await
    .expect("create test account");

    sqlx::query(
        "INSERT INTO worlds (id, slug, name, created_by)
         VALUES ($1, $2, 'First world', $3), ($4, $5, 'Second world', $3)",
    )
    .bind(world_id)
    .bind(format!("first-{unique}"))
    .bind(account_id)
    .bind(other_world_id)
    .bind(format!("second-{unique}"))
    .execute(&pool)
    .await
    .expect("create test worlds");

    sqlx::query(
        "INSERT INTO world_memberships (world_id, account_id, role)
         VALUES ($1, $2, 'viewer'), ($3, $2, 'owner')",
    )
    .bind(world_id)
    .bind(account_id)
    .bind(other_world_id)
    .execute(&pool)
    .await
    .expect("create test memberships");

    assert!(
        store::require_world(&pool, account_id, &format!("first-{unique}"), false)
            .await
            .is_ok()
    );
    assert!(
        store::require_world(&pool, account_id, &format!("first-{unique}"), true)
            .await
            .is_err()
    );
    assert!(
        store::require_world(&pool, Uuid::new_v4(), &format!("first-{unique}"), false)
            .await
            .is_err()
    );

    sqlx::query(
        "UPDATE world_memberships SET role = 'editor'
         WHERE world_id = $1 AND account_id = $2",
    )
    .bind(world_id)
    .bind(account_id)
    .execute(&pool)
    .await
    .expect("promote test editor");
    assert!(
        store::require_world(&pool, account_id, &format!("first-{unique}"), true)
            .await
            .is_ok()
    );

    for (id, owning_world) in [
        (source_document_id, world_id),
        (local_target_id, world_id),
        (foreign_target_id, other_world_id),
    ] {
        sqlx::query(
            "INSERT INTO documents
             (world_id, id, slug, document_type, entity_type, name, created_by)
             VALUES ($1, $2, $3, 'card', 'character', 'Test record', $4)",
        )
        .bind(owning_world)
        .bind(id)
        .bind(format!("record-{}", id.simple()))
        .bind(account_id)
        .execute(&pool)
        .await
        .expect("create test document");
    }

    sqlx::query(
        "INSERT INTO card_properties
         (world_id, document_id, id, label, kind, reference_document_id)
         VALUES ($1, $2, 'local-link', 'Local link', 'reference', $3)",
    )
    .bind(world_id)
    .bind(source_document_id)
    .bind(local_target_id)
    .execute(&pool)
    .await
    .expect("same-world reference should be accepted");

    let cross_world_reference = sqlx::query(
        "INSERT INTO card_properties
         (world_id, document_id, id, label, kind, reference_document_id)
         VALUES ($1, $2, 'foreign-link', 'Foreign link', 'reference', $3)",
    )
    .bind(world_id)
    .bind(source_document_id)
    .bind(foreign_target_id)
    .execute(&pool)
    .await;

    assert!(
        cross_world_reference.is_err(),
        "cross-world references must be rejected by the database"
    );


    let current_session_id = Uuid::new_v4();
    let other_session_id = Uuid::new_v4();
    let current_token_hash = Sha256::digest(b"current-browser-token").to_vec();
    let other_token_hash = Sha256::digest(b"other-browser-token").to_vec();

    sqlx::query(
        "INSERT INTO sessions (id, account_id, token_hash, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '1 day'),
                ($4, $2, $5, NOW() + INTERVAL '1 day')",
    )
    .bind(current_session_id)
    .bind(account_id)
    .bind(&current_token_hash)
    .bind(other_session_id)
    .bind(&other_token_hash)
    .execute(&pool)
    .await
    .expect("create test sessions");

    let sessions = store::list_sessions(&pool, account_id, &current_token_hash)
        .await
        .expect("list account sessions");
    assert_eq!(sessions.len(), 2);
    assert!(sessions.iter().any(|session| session.id == current_session_id && session.current));
    assert!(sessions.iter().any(|session| session.id == other_session_id && !session.current));

    assert!(
        store::revoke_session(&pool, account_id, current_session_id, &current_token_hash)
            .await
            .is_err(),
        "the active browser must use logout rather than revoke itself"
    );
    assert!(
        store::revoke_session(&pool, Uuid::new_v4(), other_session_id, &current_token_hash)
            .await
            .is_err(),
        "an account must not revoke another account's session"
    );
    store::revoke_session(&pool, account_id, other_session_id, &current_token_hash)
        .await
        .expect("revoke another browser session");

    let remaining = store::list_sessions(&pool, account_id, &current_token_hash)
        .await
        .expect("list sessions after revocation");
    assert_eq!(remaining.len(), 1);
    assert_eq!(remaining[0].id, current_session_id);
    assert!(remaining[0].current);

    sqlx::query("DELETE FROM worlds WHERE id = $1 OR id = $2")
        .bind(world_id)
        .bind(other_world_id)
        .execute(&pool)
        .await
        .expect("remove test worlds");
    sqlx::query("DELETE FROM accounts WHERE id = $1")
        .bind(account_id)
        .execute(&pool)
        .await
        .expect("remove test account");

    pool.close().await;
}
