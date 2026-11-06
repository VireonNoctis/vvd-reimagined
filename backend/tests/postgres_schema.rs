use chrono::{Duration, Utc};
use sha2::{Digest, Sha256};
use sqlx::postgres::PgPoolOptions;
use uuid::Uuid;
use vvd_api::{
    models::{
        CardBlockInput, CardCreateInput, CardPropertyInput, CardPropertyKind, CardTemplateBlock,
        CardTemplateCreateInput, CardTemplatePropertyDefinition, CardUpdateInput, EntityType,
        EraCreateInput, FolderCreateInput, FolderUpdateInput, MediaAssetCreate, MoveDocumentInput,
    },
    store,
};

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
    let default_era_id = Uuid::new_v4();
    let other_default_era_id = Uuid::new_v4();

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
        "INSERT INTO world_document_types (world_id, type_key, enabled)
         SELECT worlds.id, registry.type_key, registry.type_key = 'card'
         FROM (VALUES ($1::UUID), ($2::UUID)) AS worlds(id)
         CROSS JOIN document_type_registry registry",
    )
    .bind(world_id)
    .bind(other_world_id)
    .execute(&pool)
    .await
    .expect("register document types for both test worlds");

    sqlx::query(
        "INSERT INTO eras (world_id, id, name, description, is_default, created_by)
         VALUES
            ($1, $2, 'Prime', '', TRUE, $3),
            ($4, $5, 'Prime', '', TRUE, $3)",
    )
    .bind(world_id)
    .bind(default_era_id)
    .bind(account_id)
    .bind(other_world_id)
    .bind(other_default_era_id)
    .execute(&pool)
    .await
    .expect("create default test eras");

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

    let alternate_era = store::create_era(
        &pool,
        account_id,
        &format!("first-{unique}"),
        EraCreateInput {
            name: "After the Meridian".to_owned(),
            description: "A branch that inherits the shared world.".to_owned(),
            parent_id: None,
        },
    )
    .await
    .expect("create an era inheriting from Prime");

    let eras = store::list_eras(&pool, account_id, &format!("first-{unique}"))
        .await
        .expect("list world eras");
    assert!(eras.iter().any(|era| era.id == alternate_era.id));
    assert!(
        eras.iter()
            .any(|era| era.id == default_era_id && era.is_default)
    );

    let era_world = store::get_world(
        &pool,
        account_id,
        &format!("first-{unique}"),
        Some(alternate_era.id),
    )
    .await
    .expect("load a world in the selected era");
    assert_eq!(era_world.active_era_id, alternate_era.id);
    assert_eq!(
        era_world
            .documents
            .iter()
            .find(|document| document.id == source_document_id)
            .expect("find the inherited source document")
            .version,
        1
    );

    let inherited = store::get_document(
        &pool,
        account_id,
        &format!("first-{unique}"),
        source_document_id,
        Some(alternate_era.id),
    )
    .await
    .expect("read the inherited document");
    assert_eq!(inherited.name, "Test record");
    assert_eq!(inherited.version, 1);

    let cross_world_era_edit = store::update_card(
        &pool,
        account_id,
        &format!("first-{unique}"),
        source_document_id,
        Some(alternate_era.id),
        CardUpdateInput {
            expected_version: 1,
            name: "Invalid cross-world reference".to_owned(),
            aliases: Vec::new(),
            properties: vec![CardPropertyInput::Reference {
                id: "foreign-link".to_owned(),
                label: "Foreign link".to_owned(),
                document_id: foreign_target_id,
            }],
            blocks: Vec::new(),
        },
    )
    .await;
    assert!(
        cross_world_era_edit.is_err(),
        "era overrides must reject references to another world"
    );

    let alternate_update = store::update_card(
        &pool,
        account_id,
        &format!("first-{unique}"),
        source_document_id,
        Some(alternate_era.id),
        CardUpdateInput {
            expected_version: 1,
            name: "A different history".to_owned(),
            aliases: vec!["The alternate".to_owned()],
            properties: vec![CardPropertyInput::Reference {
                id: "local-link".to_owned(),
                label: "Local link".to_owned(),
                document_id: local_target_id,
            }],
            blocks: Vec::new(),
        },
    )
    .await
    .expect("write an era-specific override");
    assert_eq!(alternate_update.name, "A different history");
    assert_eq!(alternate_update.version, 2);

    let child_era = store::create_era(
        &pool,
        account_id,
        &format!("first-{unique}"),
        EraCreateInput {
            name: "A second branch".to_owned(),
            description: String::new(),
            parent_id: Some(alternate_era.id),
        },
    )
    .await
    .expect("create a child era");
    let inherited_child = store::get_document(
        &pool,
        account_id,
        &format!("first-{unique}"),
        source_document_id,
        Some(child_era.id),
    )
    .await
    .expect("resolve the child from its parent");
    assert_eq!(inherited_child.name, "A different history");
    assert_eq!(inherited_child.version, 2);

    store::update_card(
        &pool,
        account_id,
        &format!("first-{unique}"),
        source_document_id,
        Some(alternate_era.id),
        CardUpdateInput {
            expected_version: 2,
            name: "The parent keeps changing".to_owned(),
            aliases: vec!["The alternate".to_owned()],
            properties: vec![CardPropertyInput::Reference {
                id: "local-link".to_owned(),
                label: "Local link".to_owned(),
                document_id: local_target_id,
            }],
            blocks: Vec::new(),
        },
    )
    .await
    .expect("update the parent era");

    let stale_child_save = store::update_card(
        &pool,
        account_id,
        &format!("first-{unique}"),
        source_document_id,
        Some(child_era.id),
        CardUpdateInput {
            expected_version: 2,
            name: "This edit was opened before the parent changed".to_owned(),
            aliases: Vec::new(),
            properties: Vec::new(),
            blocks: Vec::new(),
        },
    )
    .await;
    assert!(
        stale_child_save.is_err(),
        "a parent edit must invalidate an outdated child version token"
    );

    store::update_card(
        &pool,
        account_id,
        &format!("first-{unique}"),
        source_document_id,
        Some(child_era.id),
        CardUpdateInput {
            expected_version: 3,
            name: "The parent keeps changing".to_owned(),
            aliases: vec!["Only in the child".to_owned()],
            properties: vec![CardPropertyInput::Reference {
                id: "local-link".to_owned(),
                label: "Local link".to_owned(),
                document_id: local_target_id,
            }],
            blocks: Vec::new(),
        },
    )
    .await
    .expect("override one field in the child era");

    store::update_card(
        &pool,
        account_id,
        &format!("first-{unique}"),
        source_document_id,
        Some(alternate_era.id),
        CardUpdateInput {
            expected_version: 3,
            name: "The parent changes once more".to_owned(),
            aliases: vec!["The alternate".to_owned()],
            properties: vec![CardPropertyInput::Reference {
                id: "local-link".to_owned(),
                label: "Local link".to_owned(),
                document_id: local_target_id,
            }],
            blocks: Vec::new(),
        },
    )
    .await
    .expect("update a parent after its child has a sparse override");

    let resolved_child = store::get_document(
        &pool,
        account_id,
        &format!("first-{unique}"),
        source_document_id,
        Some(child_era.id),
    )
    .await
    .expect("resolve the child with inherited and local fields");
    assert_eq!(resolved_child.name, "The parent changes once more");
    assert_eq!(resolved_child.aliases, vec!["Only in the child"]);
    assert_eq!(resolved_child.version, 5);

    let base_document = store::get_document(
        &pool,
        account_id,
        &format!("first-{unique}"),
        source_document_id,
        Some(default_era_id),
    )
    .await
    .expect("read the unchanged Prime document");
    assert_eq!(base_document.name, "Test record");
    assert!(base_document.aliases.is_empty());

    let root_folder = store::create_folder(
        &pool,
        account_id,
        &format!("first-{unique}"),
        FolderCreateInput {
            name: "Characters".to_owned(),
            parent_id: None,
        },
    )
    .await
    .expect("create a root folder");
    let nested_folder = store::create_folder(
        &pool,
        account_id,
        &format!("first-{unique}"),
        FolderCreateInput {
            name: "Leaders".to_owned(),
            parent_id: Some(root_folder.id),
        },
    )
    .await
    .expect("create a nested folder");
    let folders = store::list_folders(&pool, account_id, &format!("first-{unique}"))
        .await
        .expect("list nested folders");
    assert_eq!(folders.len(), 2);
    assert!(
        store::update_folder(
            &pool,
            account_id,
            &format!("first-{unique}"),
            root_folder.id,
            FolderUpdateInput {
                name: "Characters".to_owned(),
                parent_id: Some(nested_folder.id),
            },
        )
        .await
        .is_err(),
        "folder moves must reject cycles"
    );

    let moved = store::move_document(
        &pool,
        account_id,
        &format!("first-{unique}"),
        source_document_id,
        MoveDocumentInput {
            expected_version: 1,
            folder_id: Some(nested_folder.id),
        },
    )
    .await
    .expect("move document into nested folder");
    assert_eq!(moved.folder_id, Some(nested_folder.id));
    assert_eq!(moved.version, 2);

    let updated = store::update_card(
        &pool,
        account_id,
        &format!("first-{unique}"),
        source_document_id,
        None,
        CardUpdateInput {
            expected_version: 2,
            name: "Updated test record".to_owned(),
            aliases: Vec::new(),
            properties: vec![CardPropertyInput::Reference {
                id: "local-link".to_owned(),
                label: "Local link".to_owned(),
                document_id: local_target_id,
            }],
            blocks: vec![CardBlockInput {
                id: "body".to_owned(),
                text: "A recoverable body".to_owned(),
            }],
        },
    )
    .await
    .expect("update card and capture its previous version");
    assert_eq!(updated.version, 3);

    let revisions = store::list_document_revisions(
        &pool,
        account_id,
        &format!("first-{unique}"),
        source_document_id,
    )
    .await
    .expect("list document revisions");
    assert_eq!(revisions.len(), 2);
    assert_eq!(revisions[0].version, 2);

    store::archive_document(
        &pool,
        account_id,
        &format!("first-{unique}"),
        source_document_id,
        3,
    )
    .await
    .expect("archive document");
    assert!(
        store::list_documents(&pool, account_id, &format!("first-{unique}"), None)
            .await
            .expect("list active documents")
            .iter()
            .all(|document| document.id != source_document_id)
    );
    let archive = store::list_archived_documents(&pool, account_id, &format!("first-{unique}"))
        .await
        .expect("list archive");
    assert_eq!(archive.len(), 1);
    assert_eq!(archive[0].id, source_document_id);

    store::restore_archived_document(
        &pool,
        account_id,
        &format!("first-{unique}"),
        source_document_id,
        4,
    )
    .await
    .expect("restore archived document");

    let restored = store::restore_document_revision(
        &pool,
        account_id,
        &format!("first-{unique}"),
        source_document_id,
        revisions[0].id,
        5,
    )
    .await
    .expect("restore an earlier revision");
    assert_eq!(restored.name, "Test record");
    assert_eq!(restored.version, 6);
    assert_eq!(restored.folder_id, Some(nested_folder.id));
    assert_eq!(restored.blocks.len(), 0);

    let renamed_folder = store::update_folder(
        &pool,
        account_id,
        &format!("first-{unique}"),
        nested_folder.id,
        FolderUpdateInput {
            name: "Main cast".to_owned(),
            parent_id: Some(root_folder.id),
        },
    )
    .await
    .expect("rename nested folder");
    assert_eq!(renamed_folder.name, "Main cast");
    assert!(
        store::delete_folder(
            &pool,
            account_id,
            &format!("first-{unique}"),
            nested_folder.id
        )
        .await
        .is_err(),
        "a folder containing a record cannot be deleted"
    );
    let media_id = Uuid::new_v4();
    let object_key = format!("assets/{}", media_id.simple());
    store::create_media_asset(
        &pool,
        account_id,
        &format!("first-{unique}"),
        MediaAssetCreate {
            id: media_id,
            object_key: object_key.clone(),
            file_name: "cover.png".to_owned(),
            content_type: "image/png".to_owned(),
            size_bytes: 1_024,
            document_id: Some(source_document_id),
            expires_at: Utc::now() + Duration::minutes(10),
        },
    )
    .await
    .expect("create pending private media record");

    let pending =
        store::pending_media_upload(&pool, account_id, &format!("first-{unique}"), media_id)
            .await
            .expect("read the pending media upload");
    assert_eq!(pending, (object_key.clone(), "image/png".to_owned(), 1_024));

    let media =
        store::complete_media_upload(&pool, account_id, &format!("first-{unique}"), media_id)
            .await
            .expect("complete verified private media record");
    assert_eq!(media.id, media_id);
    assert_eq!(media.document_id, Some(source_document_id));
    assert_eq!(media.size_bytes, 1_024);

    let gallery = store::list_media_assets(&pool, account_id, &format!("first-{unique}"))
        .await
        .expect("list ready private media");
    assert_eq!(gallery.len(), 1);
    assert_eq!(gallery[0].id, media_id);
    assert_eq!(
        store::media_object_key(
            &pool,
            account_id,
            &format!("first-{unique}"),
            media_id,
            false,
        )
        .await
        .expect("read private media object key"),
        object_key
    );

    store::delete_media_asset(&pool, account_id, &format!("first-{unique}"), media_id)
        .await
        .expect("remove media asset metadata");
    assert!(
        store::list_media_assets(&pool, account_id, &format!("first-{unique}"))
            .await
            .expect("list gallery after deletion")
            .is_empty()
    );

    let empty_folder = store::create_folder(
        &pool,
        account_id,
        &format!("first-{unique}"),
        FolderCreateInput {
            name: "Empty".to_owned(),
            parent_id: None,
        },
    )
    .await
    .expect("create empty folder");
    store::delete_folder(
        &pool,
        account_id,
        &format!("first-{unique}"),
        empty_folder.id,
    )
    .await
    .expect("delete an empty folder");

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
    assert!(
        sessions
            .iter()
            .any(|session| session.id == current_session_id && session.current)
    );
    assert!(
        sessions
            .iter()
            .any(|session| session.id == other_session_id && !session.current)
    );

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

#[tokio::test]
async fn document_registry_and_card_templates_are_world_scoped_and_validated() {
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
    let unique = Uuid::new_v4().simple().to_string();
    sqlx::query(
        "INSERT INTO accounts (id, email, display_name, password_hash)
         VALUES ($1, $2, 'Template Author', 'test-only')",
    )
    .bind(account_id)
    .bind(format!("templates-{unique}@example.test"))
    .execute(&pool)
    .await
    .expect("create template author");

    let world = store::create_world(
        &pool,
        account_id,
        "Template Workshop".to_owned(),
        "A world for testing reusable card structures.".to_owned(),
        "Fantasy".to_owned(),
    )
    .await
    .expect("create a world with default document types and templates");

    let card_type = world
        .document_types
        .iter()
        .find(|item| item.type_key == "card")
        .expect("card type is registered");
    assert!(card_type.enabled);
    assert_eq!(card_type.implementation_status, "ready");

    let map_type = world
        .document_types
        .iter()
        .find(|item| item.type_key == "map")
        .expect("map type is in the registry");
    assert!(!map_type.enabled);
    assert_eq!(map_type.implementation_status, "planned");

    assert_eq!(world.card_templates.len(), 3);
    assert!(
        world
            .card_templates
            .iter()
            .all(|template| template.is_default)
    );

    let templates = store::list_card_templates(&pool, account_id, &world.slug)
        .await
        .expect("list default card templates");
    assert_eq!(templates.len(), 3);

    let custom = store::create_card_template(
        &pool,
        account_id,
        &world.slug,
        CardTemplateCreateInput {
            entity_type: EntityType::Character,
            name: "Royal Heir".to_owned(),
            description: "A character template for a named successor.".to_owned(),
            property_definitions: vec![CardTemplatePropertyDefinition {
                id: "rank".to_owned(),
                label: "Rank".to_owned(),
                kind: CardPropertyKind::Text,
                required: true,
                default_value: None,
            }],
            starter_blocks: vec![CardTemplateBlock {
                id: "claim".to_owned(),
                label: "Claim".to_owned(),
                text: String::new(),
            }],
            is_default: false,
        },
    )
    .await
    .expect("create a custom per-type template");

    assert_eq!(custom.entity_type, EntityType::Character);
    assert_eq!(custom.property_definitions.len(), 1);
    assert_eq!(custom.starter_blocks[0].id, "claim");

    let missing_required = store::create_card(
        &pool,
        account_id,
        &world.slug,
        CardCreateInput {
            name: "Ari".to_owned(),
            entity_type: EntityType::Character,
            template_id: Some(custom.id),
            aliases: Vec::new(),
            properties: Vec::new(),
            blocks: vec![CardBlockInput {
                id: "claim".to_owned(),
                text: "A contested inheritance.".to_owned(),
            }],
        },
    )
    .await;
    assert!(
        missing_required.is_err(),
        "required fields from a selected template must be supplied"
    );

    let card = store::create_card(
        &pool,
        account_id,
        &world.slug,
        CardCreateInput {
            name: "Ari".to_owned(),
            entity_type: EntityType::Character,
            template_id: Some(custom.id),
            aliases: vec!["The Heir".to_owned()],
            properties: vec![CardPropertyInput::Text {
                id: "rank".to_owned(),
                label: "Rank".to_owned(),
                value: "First in line".to_owned(),
            }],
            blocks: vec![CardBlockInput {
                id: "claim".to_owned(),
                text: "A contested inheritance.".to_owned(),
            }],
        },
    )
    .await
    .expect("create a card from the selected template");

    assert_eq!(card.template_id, Some(custom.id));
    assert_eq!(card.properties.len(), 1);

    let removed_required = store::update_card(
        &pool,
        account_id,
        &world.slug,
        card.id,
        None,
        CardUpdateInput {
            expected_version: card.version,
            name: "Ari, revised".to_owned(),
            aliases: vec!["The Heir".to_owned()],
            properties: Vec::new(),
            blocks: vec![CardBlockInput {
                id: "claim".to_owned(),
                text: "Still contested.".to_owned(),
            }],
        },
    )
    .await;
    assert!(
        removed_required.is_err(),
        "required fields remain enforced after a card has been created"
    );
}
