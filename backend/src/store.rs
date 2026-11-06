use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgConnection, PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::{
    error::ApiError,
    models::{
        ArchivedDocumentSummary, BlockRow, CardBlock, CardBlockInput, CardCreateInput,
        CardDocument, CardProperty, CardPropertyInput, CardUpdateInput, DocumentRevisionSummary,
        DocumentRow, EntityType, EraCreateInput, EraRow, EraSummary, Folder, FolderCreateInput,
        FolderRow, FolderUpdateInput, MediaAssetCreate, MediaAssetSummary, MoveDocumentInput,
        PropertyRow, World, WorldRow,
    },
};

fn date_label(value: DateTime<Utc>) -> String {
    value.date_naive().format("%Y-%m-%d").to_string()
}

fn device_label(user_agent: Option<&str>) -> String {
    let value = user_agent.unwrap_or_default().to_ascii_lowercase();
    if value.is_empty() {
        return "Unknown browser".to_owned();
    }

    let platform = if value.contains("ipad") {
        "iPad"
    } else if value.contains("iphone") {
        "iPhone"
    } else if value.contains("android") {
        "Android"
    } else if value.contains("windows") {
        "Windows"
    } else if value.contains("mac os") || value.contains("macintosh") {
        "macOS"
    } else if value.contains("linux") {
        "Linux"
    } else {
        "Unknown device"
    };

    let browser = if value.contains("edg/") {
        "Edge"
    } else if value.contains("firefox/") {
        "Firefox"
    } else if value.contains("chrome/") || value.contains("chromium/") {
        "Chrome"
    } else if value.contains("safari/") {
        "Safari"
    } else {
        "Browser"
    };

    format!("{browser} on {platform}")
}

fn entity_type(value: &str) -> Result<EntityType, ApiError> {
    match value {
        "character" => Ok(EntityType::Character),
        "place" => Ok(EntityType::Place),
        "faction" => Ok(EntityType::Faction),
        _ => Err(ApiError::internal()),
    }
}

fn slug_part(value: &str) -> String {
    let mut output = String::new();
    let mut separator = false;

    for character in value.chars() {
        if character.is_ascii_alphanumeric() {
            if separator && !output.is_empty() {
                output.push('-');
            }
            output.push(character.to_ascii_lowercase());
            separator = false;
        } else {
            separator = true;
        }
    }

    if output.is_empty() {
        "world".to_owned()
    } else {
        output
    }
}

fn validate_key(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 64
        && value.bytes().all(|byte| {
            byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-' || byte == b'_'
        })
}

fn validate_aliases(aliases: &[String]) -> Result<(), ApiError> {
    if aliases.len() > 50 {
        return Err(ApiError::bad_request("A card can have at most 50 aliases."));
    }

    let mut seen = std::collections::HashSet::new();
    for alias in aliases {
        let clean = alias.trim();
        if clean.is_empty() || clean.chars().count() > 100 {
            return Err(ApiError::bad_request(
                "Aliases must contain between 1 and 100 characters.",
            ));
        }
        if !seen.insert(clean.to_lowercase()) {
            return Err(ApiError::bad_request("Aliases must be unique."));
        }
    }

    Ok(())
}

fn validate_card_content(
    name: &str,
    aliases: &[String],
    properties: &[CardPropertyInput],
    blocks: &[CardBlockInput],
) -> Result<(), ApiError> {
    if name.trim().is_empty() || name.chars().count() > 120 {
        return Err(ApiError::bad_request(
            "Card names must contain between 1 and 120 characters.",
        ));
    }
    validate_aliases(aliases)?;

    if properties.len() > 100 {
        return Err(ApiError::bad_request(
            "A card can have at most 100 properties.",
        ));
    }

    let mut property_ids = std::collections::HashSet::new();
    for property in properties {
        let (id, label) = match property {
            CardPropertyInput::Text { id, label, value } => {
                if value.chars().count() > 10_000 {
                    return Err(ApiError::bad_request(
                        "Text properties are limited to 10,000 characters.",
                    ));
                }
                (id, label)
            }
            CardPropertyInput::Reference { id, label, .. } => (id, label),
        };

        if !validate_key(id) || !property_ids.insert(id) {
            return Err(ApiError::bad_request(
                "Property ids must be unique lowercase keys.",
            ));
        }
        if label.trim().is_empty() || label.chars().count() > 100 {
            return Err(ApiError::bad_request(
                "Property labels must contain between 1 and 100 characters.",
            ));
        }
    }

    if blocks.len() > 200 {
        return Err(ApiError::bad_request(
            "A card can have at most 200 body blocks.",
        ));
    }

    let mut block_ids = std::collections::HashSet::new();
    for block in blocks {
        if !validate_key(&block.id) || !block_ids.insert(&block.id) {
            return Err(ApiError::bad_request(
                "Body block ids must be unique lowercase keys.",
            ));
        }
        if block.text.chars().count() > 50_000 {
            return Err(ApiError::bad_request(
                "A body block is limited to 50,000 characters.",
            ));
        }
    }

    Ok(())
}

pub async fn require_world(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    write: bool,
) -> Result<Uuid, ApiError> {
    let membership = sqlx::query_as::<_, (Uuid, String)>(
        "SELECT w.id, m.role
         FROM worlds w
         INNER JOIN world_memberships m ON m.world_id = w.id
         WHERE w.slug = $1 AND m.account_id = $2",
    )
    .bind(slug)
    .bind(account_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(ApiError::not_found)?;

    if write && !matches!(membership.1.as_str(), "owner" | "admin" | "editor") {
        return Err(ApiError::forbidden());
    }

    Ok(membership.0)
}

async fn load_documents(pool: &PgPool, world_id: Uuid) -> Result<Vec<CardDocument>, ApiError> {
    let documents = sqlx::query_as::<_, DocumentRow>(
        "SELECT id, entity_type, name, aliases, updated_at, version, folder_id
         FROM documents
         WHERE world_id = $1 AND archived_at IS NULL
         ORDER BY name ASC, id ASC",
    )
    .bind(world_id)
    .fetch_all(pool)
    .await?;

    if documents.is_empty() {
        return Ok(Vec::new());
    }

    let properties = sqlx::query_as::<_, PropertyRow>(
        "SELECT document_id, id, label, kind, text_value, reference_document_id
         FROM card_properties
         WHERE world_id = $1
         ORDER BY document_id, id",
    )
    .bind(world_id)
    .fetch_all(pool)
    .await?;

    let blocks = sqlx::query_as::<_, BlockRow>(
        "SELECT document_id, id, position, text
         FROM card_blocks
         WHERE world_id = $1
         ORDER BY document_id, position",
    )
    .bind(world_id)
    .fetch_all(pool)
    .await?;

    let mut properties_by_document: HashMap<Uuid, Vec<CardProperty>> = HashMap::new();
    for row in properties {
        let property = match row.kind.as_str() {
            "text" => CardProperty::Text {
                id: row.id,
                label: row.label,
                value: row.text_value.ok_or_else(ApiError::internal)?,
            },
            "reference" => CardProperty::Reference {
                id: row.id,
                label: row.label,
                document_id: row.reference_document_id.ok_or_else(ApiError::internal)?,
            },
            _ => return Err(ApiError::internal()),
        };
        properties_by_document
            .entry(row.document_id)
            .or_default()
            .push(property);
    }

    let mut blocks_by_document: HashMap<Uuid, Vec<CardBlock>> = HashMap::new();
    for row in blocks {
        blocks_by_document
            .entry(row.document_id)
            .or_default()
            .push(CardBlock {
                id: row.id,
                block_type: "text".to_owned(),
                text: row.text,
            });
    }

    documents
        .into_iter()
        .map(|row| {
            Ok(CardDocument {
                id: row.id,
                kind: "card",
                entity_type: entity_type(&row.entity_type)?,
                name: row.name,
                aliases: row.aliases,
                updated_at: date_label(row.updated_at),
                version: row.version,
                folder_id: row.folder_id,
                properties: properties_by_document.remove(&row.id).unwrap_or_default(),
                blocks: blocks_by_document.remove(&row.id).unwrap_or_default(),
            })
        })
        .collect()
}

async fn load_eras(pool: &PgPool, world_id: Uuid) -> Result<Vec<EraSummary>, ApiError> {
    let rows = sqlx::query_as::<_, EraRow>(
        "SELECT id, name, description, parent_era_id AS parent_id, is_default, created_at, updated_at
         FROM eras WHERE world_id = $1
         ORDER BY is_default DESC, created_at ASC, name ASC",
    )
    .bind(world_id)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| EraSummary {
            id: row.id,
            name: row.name,
            description: row.description,
            parent_id: row.parent_era_id,
            is_default: row.is_default,
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
        .collect())
}

async fn load_documents_in_era(
    pool: &PgPool,
    world_id: Uuid,
    era_id: Uuid,
) -> Result<Vec<CardDocument>, ApiError> {
    let mut documents = load_documents(pool, world_id).await?;
    let overrides = sqlx::query_as::<_, (Uuid, serde_json::Value, i64, DateTime<Utc>)>(
        "WITH RECURSIVE era_path(id, parent_era_id, depth) AS (
            SELECT id, parent_era_id, 0
            FROM eras
            WHERE world_id = $1 AND id = $2
            UNION ALL
            SELECT parent.id, parent.parent_era_id, child.depth + 1
            FROM eras parent
            INNER JOIN era_path child ON parent.id = child.parent_era_id
            WHERE parent.world_id = $1
         )
         SELECT era_override.document_id, era_override.patch, era_override.version, era_override.updated_at
         FROM document_era_overrides era_override
         INNER JOIN era_path path ON path.id = era_override.era_id
         WHERE era_override.world_id = $1
         ORDER BY path.depth DESC",
    )
    .bind(world_id)
    .bind(era_id)
    .fetch_all(pool)
    .await?;

    for (document_id, patch, version, updated_at) in overrides {
        let Some(document) = documents.iter_mut().find(|item| item.id == document_id) else {
            continue;
        };

        if let Some(value) = patch.get("name") {
            document.name =
                serde_json::from_value(value.clone()).map_err(|_| ApiError::internal())?;
        }
        if let Some(value) = patch.get("aliases") {
            document.aliases =
                serde_json::from_value(value.clone()).map_err(|_| ApiError::internal())?;
        }
        if let Some(value) = patch.get("properties") {
            document.properties =
                serde_json::from_value(value.clone()).map_err(|_| ApiError::internal())?;
        }
        if let Some(value) = patch.get("blocks") {
            document.blocks =
                serde_json::from_value(value.clone()).map_err(|_| ApiError::internal())?;
        }

        document.version = document.version.saturating_add(version);
        let updated_label = date_label(updated_at);
        if updated_label > document.updated_at {
            document.updated_at = updated_label;
        }
    }

    Ok(documents)
}

async fn resolve_era(
    pool: &PgPool,
    world_id: Uuid,
    requested_era_id: Option<Uuid>,
) -> Result<EraRow, ApiError> {
    let row = if let Some(era_id) = requested_era_id {
        sqlx::query_as::<_, EraRow>(
            "SELECT id, name, description, parent_era_id AS parent_id, is_default, created_at, updated_at
             FROM eras WHERE world_id = $1 AND id = $2",
        )
        .bind(world_id)
        .bind(era_id)
        .fetch_optional(pool)
        .await?
    } else {
        sqlx::query_as::<_, EraRow>(
            "SELECT id, name, description, parent_era_id AS parent_id, is_default, created_at, updated_at
             FROM eras WHERE world_id = $1 AND is_default",
        )
        .bind(world_id)
        .fetch_optional(pool)
        .await?
    };

    row.ok_or_else(ApiError::not_found)
}

async fn load_world(
    pool: &PgPool,
    world_id: Uuid,
    requested_era_id: Option<Uuid>,
) -> Result<World, ApiError> {
    let row = sqlx::query_as::<_, WorldRow>(
        "SELECT id, slug, name, description, genre, updated_at
         FROM worlds WHERE id = $1",
    )
    .bind(world_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(ApiError::not_found)?;

    let eras = load_eras(pool, world_id).await?;
    let active_era = resolve_era(pool, world_id, requested_era_id).await?;
    let documents = load_documents_in_era(pool, world_id, active_era.id).await?;
    Ok(World {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        genre: row.genre,
        updated_at: date_label(row.updated_at),
        eras,
        active_era_id: active_era.id,
        documents,
    })
}

pub async fn list_worlds(pool: &PgPool, account_id: Uuid) -> Result<Vec<World>, ApiError> {
    let rows = sqlx::query_as::<_, WorldRow>(
        "SELECT w.id, w.slug, w.name, w.description, w.genre, w.updated_at
         FROM worlds w
         INNER JOIN world_memberships m ON m.world_id = w.id
         WHERE m.account_id = $1
         ORDER BY w.updated_at DESC, w.name ASC",
    )
    .bind(account_id)
    .fetch_all(pool)
    .await?;

    let mut worlds = Vec::with_capacity(rows.len());
    for row in rows {
        worlds.push(load_world(pool, row.id, None).await?);
    }

    Ok(worlds)
}

pub async fn get_world(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    era_id: Option<Uuid>,
) -> Result<World, ApiError> {
    let world_id = require_world(pool, account_id, slug, false).await?;
    load_world(pool, world_id, era_id).await
}

pub async fn list_eras(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
) -> Result<Vec<EraSummary>, ApiError> {
    let world_id = require_world(pool, account_id, slug, false).await?;
    load_eras(pool, world_id).await
}

pub async fn create_era(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    input: EraCreateInput,
) -> Result<EraSummary, ApiError> {
    let name = input.name.trim();
    let description = input.description.trim();
    if name.is_empty() || name.chars().count() > 80 {
        return Err(ApiError::bad_request(
            "Era names must contain between 1 and 80 characters.",
        ));
    }
    if description.chars().count() > 2_000 {
        return Err(ApiError::bad_request(
            "Era descriptions are limited to 2,000 characters.",
        ));
    }

    let world_id = require_world(pool, account_id, slug, true).await?;
    let default_era_id =
        sqlx::query_scalar::<_, Uuid>("SELECT id FROM eras WHERE world_id = $1 AND is_default")
            .bind(world_id)
            .fetch_optional(pool)
            .await?
            .ok_or_else(ApiError::internal)?;
    let parent_id = input.parent_id.unwrap_or(default_era_id);

    let parent_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS (SELECT 1 FROM eras WHERE world_id = $1 AND id = $2)",
    )
    .bind(world_id)
    .bind(parent_id)
    .fetch_one(pool)
    .await?;
    if !parent_exists {
        return Err(ApiError::bad_request("Choose a parent era in this world."));
    }

    let name_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS (SELECT 1 FROM eras WHERE world_id = $1 AND LOWER(name) = LOWER($2))",
    )
    .bind(world_id)
    .bind(name)
    .fetch_one(pool)
    .await?;
    if name_exists {
        return Err(ApiError::conflict(
            "An era with that name already exists in this world.",
        ));
    }

    let row = sqlx::query_as::<_, EraRow>(
        "INSERT INTO eras (world_id, id, name, description, parent_era_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, description, parent_era_id AS parent_id, is_default, created_at, updated_at",
    )
    .bind(world_id)
    .bind(Uuid::new_v4())
    .bind(name)
    .bind(description)
    .bind(parent_id)
    .bind(account_id)
    .fetch_one(pool)
    .await?;

    Ok(EraSummary {
        id: row.id,
        name: row.name,
        description: row.description,
        parent_id: row.parent_id,
        is_default: row.is_default,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

pub async fn create_world(
    pool: &PgPool,
    account_id: Uuid,
    name: String,
    description: String,
    genre: String,
) -> Result<World, ApiError> {
    if name.trim().is_empty() || name.chars().count() > 100 {
        return Err(ApiError::bad_request(
            "World names must contain between 1 and 100 characters.",
        ));
    }
    if description.chars().count() > 2_000 || genre.chars().count() > 80 {
        return Err(ApiError::bad_request(
            "The description or genre is too long.",
        ));
    }

    let id = Uuid::new_v4();
    let slug = format!("{}-{}", slug_part(&name), &id.simple().to_string()[..8]);
    let mut transaction = pool.begin().await?;

    sqlx::query(
        "INSERT INTO worlds (id, slug, name, description, genre, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(id)
    .bind(&slug)
    .bind(name.trim())
    .bind(description.trim())
    .bind(genre.trim())
    .bind(account_id)
    .execute(&mut *transaction)
    .await?;

    sqlx::query(
        "INSERT INTO world_memberships (world_id, account_id, role)
         VALUES ($1, $2, 'owner')",
    )
    .bind(id)
    .bind(account_id)
    .execute(&mut *transaction)
    .await?;

    sqlx::query(
        "INSERT INTO eras (world_id, id, name, description, is_default, created_by)
         VALUES ($1, $2, 'Prime', 'The shared starting state of this world.', TRUE, $3)",
    )
    .bind(id)
    .bind(Uuid::new_v4())
    .bind(account_id)
    .execute(&mut *transaction)
    .await?;

    transaction.commit().await?;
    load_world(pool, id, None).await
}

async fn ensure_references_exist(
    connection: &mut PgConnection,
    world_id: Uuid,
    properties: &[CardPropertyInput],
) -> Result<(), ApiError> {
    for property in properties {
        if let CardPropertyInput::Reference { document_id, .. } = property {
            let exists = sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS (
                    SELECT 1 FROM documents WHERE world_id = $1 AND id = $2
                 )",
            )
            .bind(world_id)
            .bind(document_id)
            .fetch_one(&mut *connection)
            .await?;

            if !exists {
                return Err(ApiError::bad_request(
                    "A card reference must target a document in the same world.",
                ));
            }
        }
    }

    Ok(())
}

async fn insert_properties(
    connection: &mut PgConnection,
    world_id: Uuid,
    document_id: Uuid,
    properties: &[CardPropertyInput],
) -> Result<(), ApiError> {
    for property in properties {
        match property {
            CardPropertyInput::Text { id, label, value } => {
                sqlx::query(
                    "INSERT INTO card_properties
                     (world_id, document_id, id, label, kind, text_value)
                     VALUES ($1, $2, $3, $4, 'text', $5)",
                )
                .bind(world_id)
                .bind(document_id)
                .bind(id)
                .bind(label.trim())
                .bind(value)
                .execute(&mut *connection)
                .await?;
            }
            CardPropertyInput::Reference {
                id,
                label,
                document_id: target_id,
            } => {
                sqlx::query(
                    "INSERT INTO card_properties
                     (world_id, document_id, id, label, kind, reference_document_id)
                     VALUES ($1, $2, $3, $4, 'reference', $5)",
                )
                .bind(world_id)
                .bind(document_id)
                .bind(id)
                .bind(label.trim())
                .bind(target_id)
                .execute(&mut *connection)
                .await?;
            }
        }
    }

    Ok(())
}

async fn insert_blocks(
    connection: &mut PgConnection,
    world_id: Uuid,
    document_id: Uuid,
    blocks: &[CardBlockInput],
) -> Result<(), ApiError> {
    for (position, block) in blocks.iter().enumerate() {
        sqlx::query(
            "INSERT INTO card_blocks (world_id, document_id, id, position, text)
             VALUES ($1, $2, $3, $4, $5)",
        )
        .bind(world_id)
        .bind(document_id)
        .bind(&block.id)
        .bind(position as i32)
        .bind(&block.text)
        .execute(&mut *connection)
        .await?;
    }

    Ok(())
}

fn validate_folder_name(name: &str) -> Result<(), ApiError> {
    let clean = name.trim();
    if clean.is_empty() || clean.chars().count() > 80 {
        return Err(ApiError::bad_request(
            "Folder names must contain between 1 and 80 characters.",
        ));
    }
    Ok(())
}

async fn ensure_folder_parent(
    connection: &mut PgConnection,
    world_id: Uuid,
    parent_id: Option<Uuid>,
) -> Result<(), ApiError> {
    if let Some(parent_id) = parent_id {
        let exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS (SELECT 1 FROM folders WHERE world_id = $1 AND id = $2)",
        )
        .bind(world_id)
        .bind(parent_id)
        .fetch_one(&mut *connection)
        .await?;
        if !exists {
            return Err(ApiError::bad_request(
                "The parent folder does not belong to this world.",
            ));
        }
    }
    Ok(())
}

async fn folder_name_exists(
    connection: &mut PgConnection,
    world_id: Uuid,
    parent_id: Option<Uuid>,
    name: &str,
    excluding_id: Option<Uuid>,
) -> Result<bool, ApiError> {
    Ok(sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS (
            SELECT 1 FROM folders
            WHERE world_id = $1
              AND parent_id IS NOT DISTINCT FROM $2
              AND LOWER(name) = LOWER($3)
              AND ($4::uuid IS NULL OR id <> $4)
         )",
    )
    .bind(world_id)
    .bind(parent_id)
    .bind(name.trim())
    .bind(excluding_id)
    .fetch_one(&mut *connection)
    .await?)
}

pub async fn list_folders(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
) -> Result<Vec<Folder>, ApiError> {
    let world_id = require_world(pool, account_id, slug, false).await?;
    let rows = sqlx::query_as::<_, FolderRow>(
        "SELECT id, name, parent_id, created_at, updated_at
         FROM folders
         WHERE world_id = $1
         ORDER BY parent_id NULLS FIRST, LOWER(name), id",
    )
    .bind(world_id)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| Folder {
            id: row.id,
            name: row.name,
            parent_id: row.parent_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
        .collect())
}

pub async fn create_folder(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    input: FolderCreateInput,
) -> Result<Folder, ApiError> {
    validate_folder_name(&input.name)?;
    let world_id = require_world(pool, account_id, slug, true).await?;
    let mut transaction = pool.begin().await?;
    ensure_folder_parent(&mut transaction, world_id, input.parent_id).await?;
    if folder_name_exists(
        &mut transaction,
        world_id,
        input.parent_id,
        &input.name,
        None,
    )
    .await?
    {
        return Err(ApiError::conflict(
            "A folder with that name already exists here.",
        ));
    }

    let row = sqlx::query_as::<_, FolderRow>(
        "INSERT INTO folders (world_id, id, name, parent_id, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, parent_id, created_at, updated_at",
    )
    .bind(world_id)
    .bind(Uuid::new_v4())
    .bind(input.name.trim())
    .bind(input.parent_id)
    .bind(account_id)
    .fetch_one(&mut *transaction)
    .await?;
    transaction.commit().await?;

    Ok(Folder {
        id: row.id,
        name: row.name,
        parent_id: row.parent_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

pub async fn update_folder(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    folder_id: Uuid,
    input: FolderUpdateInput,
) -> Result<Folder, ApiError> {
    validate_folder_name(&input.name)?;
    let world_id = require_world(pool, account_id, slug, true).await?;
    let mut transaction = pool.begin().await?;
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS (SELECT 1 FROM folders WHERE world_id = $1 AND id = $2)",
    )
    .bind(world_id)
    .bind(folder_id)
    .fetch_one(&mut *transaction)
    .await?;
    if !exists {
        return Err(ApiError::not_found());
    }

    ensure_folder_parent(&mut transaction, world_id, input.parent_id).await?;
    if let Some(parent_id) = input.parent_id {
        let would_cycle = sqlx::query_scalar::<_, bool>(
            "WITH RECURSIVE descendants(id) AS (
                SELECT id FROM folders WHERE world_id = $1 AND id = $2
                UNION ALL
                SELECT child.id FROM folders child
                INNER JOIN descendants parent ON child.parent_id = parent.id
                WHERE child.world_id = $1
             )
             SELECT EXISTS (SELECT 1 FROM descendants WHERE id = $3)",
        )
        .bind(world_id)
        .bind(folder_id)
        .bind(parent_id)
        .fetch_one(&mut *transaction)
        .await?;
        if would_cycle {
            return Err(ApiError::bad_request(
                "A folder cannot be moved inside itself or one of its descendants.",
            ));
        }
    }

    if folder_name_exists(
        &mut transaction,
        world_id,
        input.parent_id,
        &input.name,
        Some(folder_id),
    )
    .await?
    {
        return Err(ApiError::conflict(
            "A folder with that name already exists here.",
        ));
    }

    let row = sqlx::query_as::<_, FolderRow>(
        "UPDATE folders
         SET name = $1, parent_id = $2, updated_at = NOW()
         WHERE world_id = $3 AND id = $4
         RETURNING id, name, parent_id, created_at, updated_at",
    )
    .bind(input.name.trim())
    .bind(input.parent_id)
    .bind(world_id)
    .bind(folder_id)
    .fetch_one(&mut *transaction)
    .await?;
    transaction.commit().await?;

    Ok(Folder {
        id: row.id,
        name: row.name,
        parent_id: row.parent_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

pub async fn delete_folder(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    folder_id: Uuid,
) -> Result<(), ApiError> {
    let world_id = require_world(pool, account_id, slug, true).await?;
    let occupied = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS (
            SELECT 1 FROM documents WHERE world_id = $1 AND folder_id = $2
            UNION ALL
            SELECT 1 FROM folders WHERE world_id = $1 AND parent_id = $2
         )",
    )
    .bind(world_id)
    .bind(folder_id)
    .fetch_one(pool)
    .await?;
    if occupied {
        return Err(ApiError::conflict(
            "Move its records and child folders before deleting this folder.",
        ));
    }

    let result = sqlx::query("DELETE FROM folders WHERE world_id = $1 AND id = $2")
        .bind(world_id)
        .bind(folder_id)
        .execute(pool)
        .await?;
    if result.rows_affected() == 0 {
        return Err(ApiError::not_found());
    }
    Ok(())
}

pub async fn move_document(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    document_id: Uuid,
    input: MoveDocumentInput,
) -> Result<CardDocument, ApiError> {
    if input.expected_version < 1 {
        return Err(ApiError::bad_request(
            "expectedVersion must be a positive integer.",
        ));
    }
    let world_id = require_world(pool, account_id, slug, true).await?;
    let mut transaction = pool.begin().await?;
    let current_version = lock_active_document(&mut transaction, world_id, document_id).await?;
    if current_version != input.expected_version {
        return Err(ApiError::conflict(
            "This card changed since it was opened. Reload it before moving it.",
        ));
    }
    ensure_folder_parent(&mut transaction, world_id, input.folder_id).await?;
    save_document_revision(&mut transaction, world_id, document_id, account_id).await?;

    sqlx::query(
        "UPDATE documents
         SET folder_id = $1, version = version + 1, updated_at = NOW()
         WHERE world_id = $2 AND id = $3",
    )
    .bind(input.folder_id)
    .bind(world_id)
    .bind(document_id)
    .execute(&mut *transaction)
    .await?;
    sqlx::query("UPDATE worlds SET updated_at = NOW() WHERE id = $1")
        .bind(world_id)
        .execute(&mut *transaction)
        .await?;
    transaction.commit().await?;

    get_document(pool, account_id, slug, document_id, None).await
}

pub async fn create_media_asset(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    input: MediaAssetCreate,
) -> Result<(), ApiError> {
    let world_id = require_world(pool, account_id, slug, true).await?;
    if let Some(document_id) = input.document_id {
        let exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS (
                SELECT 1 FROM documents
                WHERE world_id = $1 AND id = $2 AND archived_at IS NULL
             )",
        )
        .bind(world_id)
        .bind(document_id)
        .fetch_one(pool)
        .await?;
        if !exists {
            return Err(ApiError::bad_request(
                "Attach media to an active card in this world.",
            ));
        }
    }

    sqlx::query(
        "INSERT INTO media_assets
         (id, world_id, document_id, owner_account_id, object_key, file_name,
          content_type, size_bytes, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)",
    )
    .bind(input.id)
    .bind(world_id)
    .bind(input.document_id)
    .bind(account_id)
    .bind(input.object_key)
    .bind(input.file_name)
    .bind(input.content_type)
    .bind(input.size_bytes)
    .bind(input.expires_at)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn pending_media_upload(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    asset_id: Uuid,
) -> Result<(String, String, i64), ApiError> {
    let world_id = require_world(pool, account_id, slug, false).await?;
    sqlx::query_as::<_, (String, String, i64)>(
        "SELECT object_key, content_type, size_bytes
         FROM media_assets
         WHERE world_id = $1 AND id = $2 AND owner_account_id = $3
           AND status = 'pending' AND expires_at > NOW()",
    )
    .bind(world_id)
    .bind(asset_id)
    .bind(account_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(ApiError::not_found)
}

pub async fn complete_media_upload(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    asset_id: Uuid,
) -> Result<MediaAssetSummary, ApiError> {
    let world_id = require_world(pool, account_id, slug, false).await?;
    let row = sqlx::query_as::<_, (Uuid, Option<Uuid>, String, String, i64, DateTime<Utc>)>(
        "UPDATE media_assets
         SET status = 'ready', updated_at = NOW(), expires_at = NULL
         WHERE world_id = $1 AND id = $2 AND owner_account_id = $3
           AND status = 'pending' AND expires_at > NOW()
         RETURNING id, document_id, file_name, content_type, size_bytes, created_at",
    )
    .bind(world_id)
    .bind(asset_id)
    .bind(account_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::conflict("This upload has expired or was already completed."))?;

    Ok(MediaAssetSummary {
        id: row.0,
        document_id: row.1,
        file_name: row.2,
        content_type: row.3,
        size_bytes: row.4,
        created_at: row.5,
    })
}

pub async fn reject_media_upload(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    asset_id: Uuid,
) -> Result<(), ApiError> {
    let world_id = require_world(pool, account_id, slug, false).await?;
    sqlx::query(
        "UPDATE media_assets SET status = 'rejected', updated_at = NOW()
         WHERE world_id = $1 AND id = $2 AND owner_account_id = $3 AND status = 'pending'",
    )
    .bind(world_id)
    .bind(asset_id)
    .bind(account_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn list_media_assets(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
) -> Result<Vec<MediaAssetSummary>, ApiError> {
    let world_id = require_world(pool, account_id, slug, false).await?;
    let rows = sqlx::query_as::<_, (Uuid, Option<Uuid>, String, String, i64, DateTime<Utc>)>(
        "SELECT id, document_id, file_name, content_type, size_bytes, created_at
         FROM media_assets
         WHERE world_id = $1 AND status = 'ready'
         ORDER BY created_at DESC, id DESC",
    )
    .bind(world_id)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| MediaAssetSummary {
            id: row.0,
            document_id: row.1,
            file_name: row.2,
            content_type: row.3,
            size_bytes: row.4,
            created_at: row.5,
        })
        .collect())
}

pub async fn media_object_key(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    asset_id: Uuid,
    for_write: bool,
) -> Result<String, ApiError> {
    let world_id = require_world(pool, account_id, slug, for_write).await?;
    sqlx::query_scalar::<_, String>(
        "SELECT object_key FROM media_assets
         WHERE world_id = $1 AND id = $2 AND status = 'ready'",
    )
    .bind(world_id)
    .bind(asset_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(ApiError::not_found)
}

pub async fn delete_media_asset(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    asset_id: Uuid,
) -> Result<(), ApiError> {
    let world_id = require_world(pool, account_id, slug, true).await?;
    let result = sqlx::query(
        "UPDATE media_assets SET status = 'deleted', updated_at = NOW()
         WHERE world_id = $1 AND id = $2 AND status IN ('pending', 'ready')",
    )
    .bind(world_id)
    .bind(asset_id)
    .execute(pool)
    .await?;
    if result.rows_affected() == 0 {
        return Err(ApiError::not_found());
    }
    Ok(())
}

pub async fn list_documents(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    era_id: Option<Uuid>,
) -> Result<Vec<CardDocument>, ApiError> {
    let world_id = require_world(pool, account_id, slug, false).await?;
    let era = resolve_era(pool, world_id, era_id).await?;
    load_documents_in_era(pool, world_id, era.id).await
}

pub async fn get_document(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    document_id: Uuid,
    era_id: Option<Uuid>,
) -> Result<CardDocument, ApiError> {
    let world_id = require_world(pool, account_id, slug, false).await?;
    let era = resolve_era(pool, world_id, era_id).await?;
    load_documents_in_era(pool, world_id, era.id)
        .await?
        .into_iter()
        .find(|document| document.id == document_id)
        .ok_or_else(ApiError::not_found)
}

pub async fn create_card(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    input: CardCreateInput,
) -> Result<CardDocument, ApiError> {
    validate_card_content(
        &input.name,
        &input.aliases,
        &input.properties,
        &input.blocks,
    )?;
    let world_id = require_world(pool, account_id, slug, true).await?;
    let id = Uuid::new_v4();
    let document_slug = format!(
        "{}-{}",
        slug_part(&input.name),
        &id.simple().to_string()[..8]
    );
    let aliases = input
        .aliases
        .iter()
        .map(|value| value.trim().to_owned())
        .collect::<Vec<_>>();

    let mut transaction = pool.begin().await?;
    ensure_references_exist(&mut transaction, world_id, &input.properties).await?;

    sqlx::query(
        "INSERT INTO documents
         (world_id, id, slug, document_type, entity_type, name, aliases, created_by)
         VALUES ($1, $2, $3, 'card', $4, $5, $6, $7)",
    )
    .bind(world_id)
    .bind(id)
    .bind(document_slug)
    .bind(input.entity_type.as_str())
    .bind(input.name.trim())
    .bind(aliases)
    .bind(account_id)
    .execute(&mut *transaction)
    .await?;

    insert_properties(&mut transaction, world_id, id, &input.properties).await?;
    insert_blocks(&mut transaction, world_id, id, &input.blocks).await?;
    sqlx::query("UPDATE worlds SET updated_at = NOW() WHERE id = $1")
        .bind(world_id)
        .execute(&mut *transaction)
        .await?;

    transaction.commit().await?;
    get_document(pool, account_id, slug, id, None).await
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RevisionContent {
    name: String,
    #[serde(default)]
    aliases: Vec<String>,
    #[serde(default)]
    folder_id: Option<Uuid>,
    #[serde(default)]
    properties: Vec<CardPropertyInput>,
    #[serde(default)]
    blocks: Vec<CardBlockInput>,
}

async fn lock_active_document(
    connection: &mut PgConnection,
    world_id: Uuid,
    document_id: Uuid,
) -> Result<i64, ApiError> {
    sqlx::query_scalar::<_, i64>(
        "SELECT version FROM documents
         WHERE world_id = $1 AND id = $2 AND archived_at IS NULL
         FOR UPDATE",
    )
    .bind(world_id)
    .bind(document_id)
    .fetch_optional(&mut *connection)
    .await?
    .ok_or_else(ApiError::not_found)
}

async fn save_document_revision(
    connection: &mut PgConnection,
    world_id: Uuid,
    document_id: Uuid,
    account_id: Uuid,
) -> Result<Uuid, ApiError> {
    let snapshot = sqlx::query_scalar::<_, serde_json::Value>(
        r#"SELECT jsonb_build_object(
            'id', d.id,
            'kind', 'card',
            'entityType', d.entity_type,
            'name', d.name,
            'aliases', d.aliases,
            'folderId', d.folder_id,
            'updatedAt', to_char(d.updated_at, 'YYYY-MM-DD'),
            'version', d.version,
            'properties', COALESCE((
                SELECT jsonb_agg(
                    CASE WHEN p.kind = 'text' THEN
                        jsonb_build_object('kind', 'text', 'id', p.id, 'label', p.label, 'value', p.text_value)
                    ELSE
                        jsonb_build_object('kind', 'reference', 'id', p.id, 'label', p.label, 'documentId', p.reference_document_id)
                    END ORDER BY p.id
                )
                FROM card_properties p
                WHERE p.world_id = d.world_id AND p.document_id = d.id
            ), '[]'::jsonb),
            'blocks', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object('id', b.id, 'type', 'text', 'text', b.text)
                    ORDER BY b.position
                )
                FROM card_blocks b
                WHERE b.world_id = d.world_id AND b.document_id = d.id
            ), '[]'::jsonb)
        )
        FROM documents d
        WHERE d.world_id = $1 AND d.id = $2"#,
    )
    .bind(world_id)
    .bind(document_id)
    .fetch_optional(&mut *connection)
    .await?
    .ok_or_else(ApiError::not_found)?;

    let version = snapshot
        .get("version")
        .and_then(serde_json::Value::as_i64)
        .ok_or_else(ApiError::internal)?;
    let revision_id = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO document_revisions
         (id, world_id, document_id, version, snapshot, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(revision_id)
    .bind(world_id)
    .bind(document_id)
    .bind(version)
    .bind(snapshot)
    .bind(account_id)
    .execute(&mut *connection)
    .await?;

    Ok(revision_id)
}

pub async fn list_document_revisions(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    document_id: Uuid,
) -> Result<Vec<DocumentRevisionSummary>, ApiError> {
    let world_id = require_world(pool, account_id, slug, false).await?;
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS (
            SELECT 1 FROM documents
            WHERE world_id = $1 AND id = $2 AND archived_at IS NULL
         )",
    )
    .bind(world_id)
    .bind(document_id)
    .fetch_one(pool)
    .await?;
    if !exists {
        return Err(ApiError::not_found());
    }

    let rows = sqlx::query_as::<_, (Uuid, i64, DateTime<Utc>)>(
        "SELECT id, version, created_at
         FROM document_revisions
         WHERE world_id = $1 AND document_id = $2
         ORDER BY version DESC, created_at DESC",
    )
    .bind(world_id)
    .bind(document_id)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| DocumentRevisionSummary {
            id: row.0,
            version: row.1,
            created_at: row.2,
        })
        .collect())
}

pub async fn archive_document(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    document_id: Uuid,
    expected_version: i64,
) -> Result<(), ApiError> {
    let world_id = require_world(pool, account_id, slug, true).await?;
    let mut transaction = pool.begin().await?;
    let version = lock_active_document(&mut transaction, world_id, document_id).await?;
    if version != expected_version {
        return Err(ApiError::conflict(
            "This card changed since it was opened. Reload it before archiving.",
        ));
    }

    save_document_revision(&mut transaction, world_id, document_id, account_id).await?;
    sqlx::query(
        "UPDATE documents
         SET archived_at = NOW(), archived_by = $1, version = version + 1, updated_at = NOW()
         WHERE world_id = $2 AND id = $3",
    )
    .bind(account_id)
    .bind(world_id)
    .bind(document_id)
    .execute(&mut *transaction)
    .await?;
    sqlx::query("UPDATE worlds SET updated_at = NOW() WHERE id = $1")
        .bind(world_id)
        .execute(&mut *transaction)
        .await?;

    transaction.commit().await?;
    Ok(())
}

pub async fn list_archived_documents(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
) -> Result<Vec<ArchivedDocumentSummary>, ApiError> {
    let world_id = require_world(pool, account_id, slug, false).await?;
    let rows = sqlx::query_as::<_, (Uuid, String, String, i64, DateTime<Utc>)>(
        "SELECT id, name, entity_type, version, archived_at
         FROM documents
         WHERE world_id = $1 AND archived_at IS NOT NULL
         ORDER BY archived_at DESC, name ASC",
    )
    .bind(world_id)
    .fetch_all(pool)
    .await?;

    rows.into_iter()
        .map(|row| {
            Ok(ArchivedDocumentSummary {
                id: row.0,
                name: row.1,
                entity_type: entity_type(&row.2)?,
                version: row.3,
                archived_at: row.4,
            })
        })
        .collect()
}

pub async fn restore_archived_document(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    document_id: Uuid,
    expected_version: i64,
) -> Result<(), ApiError> {
    let world_id = require_world(pool, account_id, slug, true).await?;
    let mut transaction = pool.begin().await?;
    let row = sqlx::query_as::<_, (i64, Option<DateTime<Utc>>)>(
        "SELECT version, archived_at FROM documents
         WHERE world_id = $1 AND id = $2
         FOR UPDATE",
    )
    .bind(world_id)
    .bind(document_id)
    .fetch_optional(&mut *transaction)
    .await?
    .ok_or_else(ApiError::not_found)?;

    if row.0 != expected_version {
        return Err(ApiError::conflict(
            "This archived card changed. Reload the archive before restoring it.",
        ));
    }
    if row.1.is_none() {
        return Err(ApiError::conflict("This card is already active."));
    }

    sqlx::query(
        "UPDATE documents
         SET archived_at = NULL, archived_by = NULL, version = version + 1, updated_at = NOW()
         WHERE world_id = $1 AND id = $2",
    )
    .bind(world_id)
    .bind(document_id)
    .execute(&mut *transaction)
    .await?;
    sqlx::query("UPDATE worlds SET updated_at = NOW() WHERE id = $1")
        .bind(world_id)
        .execute(&mut *transaction)
        .await?;

    transaction.commit().await?;
    Ok(())
}

pub async fn restore_document_revision(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    document_id: Uuid,
    revision_id: Uuid,
    expected_version: i64,
) -> Result<CardDocument, ApiError> {
    let world_id = require_world(pool, account_id, slug, true).await?;
    let mut transaction = pool.begin().await?;
    let version = lock_active_document(&mut transaction, world_id, document_id).await?;
    if version != expected_version {
        return Err(ApiError::conflict(
            "This card changed since you opened it. Reload it before restoring a revision.",
        ));
    }

    let snapshot = sqlx::query_scalar::<_, serde_json::Value>(
        "SELECT snapshot FROM document_revisions
         WHERE id = $1 AND world_id = $2 AND document_id = $3",
    )
    .bind(revision_id)
    .bind(world_id)
    .bind(document_id)
    .fetch_optional(&mut *transaction)
    .await?
    .ok_or_else(ApiError::not_found)?;
    let content: RevisionContent =
        serde_json::from_value(snapshot).map_err(|_| ApiError::internal())?;
    validate_card_content(
        &content.name,
        &content.aliases,
        &content.properties,
        &content.blocks,
    )?;
    ensure_references_exist(&mut transaction, world_id, &content.properties).await?;
    ensure_folder_parent(&mut transaction, world_id, content.folder_id).await?;
    save_document_revision(&mut transaction, world_id, document_id, account_id).await?;

    sqlx::query(
        "UPDATE documents
         SET folder_id = $1, name = $2, aliases = $3, version = version + 1, updated_at = NOW()
         WHERE world_id = $4 AND id = $5",
    )
    .bind(content.folder_id)
    .bind(content.name.trim())
    .bind(
        content
            .aliases
            .iter()
            .map(|value| value.trim().to_owned())
            .collect::<Vec<_>>(),
    )
    .bind(world_id)
    .bind(document_id)
    .execute(&mut *transaction)
    .await?;
    sqlx::query("DELETE FROM card_properties WHERE world_id = $1 AND document_id = $2")
        .bind(world_id)
        .bind(document_id)
        .execute(&mut *transaction)
        .await?;
    sqlx::query("DELETE FROM card_blocks WHERE world_id = $1 AND document_id = $2")
        .bind(world_id)
        .bind(document_id)
        .execute(&mut *transaction)
        .await?;
    insert_properties(&mut transaction, world_id, document_id, &content.properties).await?;
    insert_blocks(&mut transaction, world_id, document_id, &content.blocks).await?;
    sqlx::query("UPDATE worlds SET updated_at = NOW() WHERE id = $1")
        .bind(world_id)
        .execute(&mut *transaction)
        .await?;

    transaction.commit().await?;
    get_document(pool, account_id, slug, document_id, None).await
}

pub async fn update_card(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    document_id: Uuid,
    era_id: Option<Uuid>,
    input: CardUpdateInput,
) -> Result<CardDocument, ApiError> {
    validate_card_content(
        &input.name,
        &input.aliases,
        &input.properties,
        &input.blocks,
    )?;
    if input.expected_version < 1 {
        return Err(ApiError::bad_request(
            "expectedVersion must be a positive integer.",
        ));
    }

    let world_id = require_world(pool, account_id, slug, true).await?;
    if let Some(era_id) = era_id {
        let selected_era = resolve_era(pool, world_id, Some(era_id)).await?;
        if !selected_era.is_default {
            return update_card_in_era(pool, account_id, slug, document_id, era_id, input).await;
        }
    }
    let aliases = input
        .aliases
        .iter()
        .map(|value| value.trim().to_owned())
        .collect::<Vec<_>>();
    let mut transaction: Transaction<'_, Postgres> = pool.begin().await?;
    let current_version = lock_active_document(&mut transaction, world_id, document_id).await?;
    if current_version != input.expected_version {
        return Err(ApiError::conflict(
            "This card changed since it was opened. Reload it before saving again.",
        ));
    }
    save_document_revision(&mut transaction, world_id, document_id, account_id).await?;

    let result = sqlx::query(
        "UPDATE documents
         SET name = $1, aliases = $2, version = version + 1, updated_at = NOW()
         WHERE world_id = $3 AND id = $4 AND version = $5",
    )
    .bind(input.name.trim())
    .bind(aliases)
    .bind(world_id)
    .bind(document_id)
    .bind(input.expected_version)
    .execute(&mut *transaction)
    .await?;

    if result.rows_affected() == 0 {
        let exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS (SELECT 1 FROM documents WHERE world_id = $1 AND id = $2)",
        )
        .bind(world_id)
        .bind(document_id)
        .fetch_one(&mut *transaction)
        .await?;

        return if exists {
            Err(ApiError::conflict(
                "This card changed since it was opened. Reload it before saving again.",
            ))
        } else {
            Err(ApiError::not_found())
        };
    }

    ensure_references_exist(&mut transaction, world_id, &input.properties).await?;

    sqlx::query("DELETE FROM card_properties WHERE world_id = $1 AND document_id = $2")
        .bind(world_id)
        .bind(document_id)
        .execute(&mut *transaction)
        .await?;
    sqlx::query("DELETE FROM card_blocks WHERE world_id = $1 AND document_id = $2")
        .bind(world_id)
        .bind(document_id)
        .execute(&mut *transaction)
        .await?;

    insert_properties(&mut transaction, world_id, document_id, &input.properties).await?;
    insert_blocks(&mut transaction, world_id, document_id, &input.blocks).await?;
    sqlx::query("UPDATE worlds SET updated_at = NOW() WHERE id = $1")
        .bind(world_id)
        .execute(&mut *transaction)
        .await?;

    transaction.commit().await?;
    get_document(pool, account_id, slug, document_id, None).await
}

fn card_properties_from_input(properties: &[CardPropertyInput]) -> Vec<CardProperty> {
    properties
        .iter()
        .map(|property| match property {
            CardPropertyInput::Text { id, label, value } => CardProperty::Text {
                id: id.clone(),
                label: label.clone(),
                value: value.clone(),
            },
            CardPropertyInput::Reference {
                id,
                label,
                document_id,
            } => CardProperty::Reference {
                id: id.clone(),
                label: label.clone(),
                document_id: *document_id,
            },
        })
        .collect()
}

fn card_blocks_from_input(blocks: &[CardBlockInput]) -> Vec<CardBlock> {
    blocks
        .iter()
        .map(|block| CardBlock {
            id: block.id.clone(),
            block_type: "text".to_owned(),
            text: block.text.clone(),
        })
        .collect()
}

fn set_or_inherit<T: Serialize>(
    patch: &mut serde_json::Map<String, serde_json::Value>,
    key: &str,
    value: &T,
    inherited: &T,
) -> Result<(), ApiError> {
    let value = serde_json::to_value(value).map_err(|_| ApiError::internal())?;
    let inherited = serde_json::to_value(inherited).map_err(|_| ApiError::internal())?;
    if value == inherited {
        patch.remove(key);
    } else {
        patch.insert(key.to_owned(), value);
    }
    Ok(())
}

async fn update_card_in_era(
    pool: &PgPool,
    account_id: Uuid,
    slug: &str,
    document_id: Uuid,
    era_id: Uuid,
    input: CardUpdateInput,
) -> Result<CardDocument, ApiError> {
    let world_id = require_world(pool, account_id, slug, true).await?;
    let mut transaction = pool.begin().await?;

    let parent_id = sqlx::query_scalar::<_, Option<Uuid>>(
        "SELECT parent_era_id FROM eras
         WHERE world_id = $1 AND id = $2
         FOR UPDATE",
    )
    .bind(world_id)
    .bind(era_id)
    .fetch_optional(&mut *transaction)
    .await?
    .ok_or_else(ApiError::not_found)?;

    let document_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS (
            SELECT 1 FROM documents
            WHERE world_id = $1 AND id = $2 AND archived_at IS NULL
         )",
    )
    .bind(world_id)
    .bind(document_id)
    .fetch_one(&mut *transaction)
    .await?;
    if !document_exists {
        return Err(ApiError::not_found());
    }

    sqlx::query(
        "SELECT id FROM documents
         WHERE world_id = $1 AND id = $2
         FOR SHARE",
    )
    .bind(world_id)
    .bind(document_id)
    .fetch_optional(&mut *transaction)
    .await?
    .ok_or_else(ApiError::not_found)?;

    let ancestors = sqlx::query_scalar::<_, Uuid>(
        "WITH RECURSIVE era_path(id, parent_era_id) AS (
            SELECT id, parent_era_id FROM eras
            WHERE world_id = $1 AND id = $2
            UNION ALL
            SELECT parent.id, parent.parent_era_id
            FROM eras parent
            INNER JOIN era_path child ON parent.id = child.parent_era_id
            WHERE parent.world_id = $1
         )
         SELECT id FROM era_path WHERE id <> $2 ORDER BY id",
    )
    .bind(world_id)
    .bind(era_id)
    .fetch_all(&mut *transaction)
    .await?;

    for ancestor_id in ancestors {
        sqlx::query("SELECT id FROM eras WHERE world_id = $1 AND id = $2 FOR SHARE")
            .bind(world_id)
            .bind(ancestor_id)
            .fetch_optional(&mut *transaction)
            .await?;
    }

    let current = load_documents_in_era(pool, world_id, era_id)
        .await?
        .into_iter()
        .find(|document| document.id == document_id)
        .ok_or_else(ApiError::not_found)?;
    if current.version != input.expected_version {
        return Err(ApiError::conflict(
            "This card changed in the selected era. Reload it before saving again.",
        ));
    }

    let inherited = if let Some(parent_id) = parent_id {
        load_documents_in_era(pool, world_id, parent_id)
            .await?
            .into_iter()
            .find(|document| document.id == document_id)
            .ok_or_else(ApiError::not_found)?
    } else {
        load_documents(pool, world_id)
            .await?
            .into_iter()
            .find(|document| document.id == document_id)
            .ok_or_else(ApiError::not_found)?
    };

    let aliases = input
        .aliases
        .iter()
        .map(|value| value.trim().to_owned())
        .collect::<Vec<_>>();
    ensure_references_exist(&mut transaction, world_id, &input.properties).await?;

    let properties = card_properties_from_input(&input.properties);
    let blocks = card_blocks_from_input(&input.blocks);

    let existing_patch = sqlx::query_as::<_, (serde_json::Value, i64)>(
        "SELECT patch, version FROM document_era_overrides
         WHERE world_id = $1 AND era_id = $2 AND document_id = $3
         FOR UPDATE",
    )
    .bind(world_id)
    .bind(era_id)
    .bind(document_id)
    .fetch_optional(&mut *transaction)
    .await?;
    let mut patch = existing_patch
        .as_ref()
        .and_then(|(value, _)| value.as_object().cloned())
        .unwrap_or_default();
    let next_override_version = existing_patch
        .as_ref()
        .map(|(_, version)| *version)
        .unwrap_or(0)
        .checked_add(1)
        .ok_or_else(ApiError::internal)?;

    set_or_inherit(&mut patch, "name", &input.name.trim(), &inherited.name)?;
    set_or_inherit(&mut patch, "aliases", &aliases, &inherited.aliases)?;
    set_or_inherit(&mut patch, "properties", &properties, &inherited.properties)?;
    set_or_inherit(&mut patch, "blocks", &blocks, &inherited.blocks)?;

    sqlx::query(
        "INSERT INTO document_era_overrides
         (world_id, era_id, document_id, patch, version, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (world_id, era_id, document_id)
         DO UPDATE SET patch = EXCLUDED.patch,
                       version = EXCLUDED.version,
                       updated_by = EXCLUDED.updated_by,
                       updated_at = NOW()",
    )
    .bind(world_id)
    .bind(era_id)
    .bind(document_id)
    .bind(serde_json::Value::Object(patch))
    .bind(next_override_version)
    .bind(account_id)
    .execute(&mut *transaction)
    .await?;

    sqlx::query("UPDATE worlds SET updated_at = NOW() WHERE id = $1")
        .bind(world_id)
        .execute(&mut *transaction)
        .await?;

    transaction.commit().await?;
    get_document(pool, account_id, slug, document_id, Some(era_id)).await
}

pub async fn list_sessions(
    pool: &PgPool,
    account_id: Uuid,
    current_token_hash: &[u8],
) -> Result<Vec<crate::models::SessionSummary>, ApiError> {
    let rows = sqlx::query_as::<_, (Uuid, DateTime<Utc>, DateTime<Utc>, Vec<u8>, Option<String>)>(
        "SELECT id, created_at, expires_at, token_hash, user_agent
         FROM sessions
         WHERE account_id = $1 AND expires_at > NOW()
         ORDER BY created_at DESC, id DESC",
    )
    .bind(account_id)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| crate::models::SessionSummary {
            id: row.0,
            created_at: row.1,
            expires_at: row.2,
            device_label: device_label(row.4.as_deref()),
            current: row.3.as_slice() == current_token_hash,
        })
        .collect())
}

pub async fn revoke_session(
    pool: &PgPool,
    account_id: Uuid,
    session_id: Uuid,
    current_token_hash: &[u8],
) -> Result<(), ApiError> {
    let result = sqlx::query(
        "DELETE FROM sessions
         WHERE id = $1 AND account_id = $2 AND token_hash <> $3",
    )
    .bind(session_id)
    .bind(account_id)
    .bind(current_token_hash.to_vec())
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::not_found());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slug_part_is_stable_and_safe_for_routes() {
        assert_eq!(
            slug_part("The Shattered Meridian"),
            "the-shattered-meridian"
        );
        assert_eq!(slug_part("  !!!  "), "world");
        assert_eq!(slug_part("North Quay 2"), "north-quay-2");
    }

    #[test]
    fn property_keys_are_constrained() {
        assert!(validate_key("founded_in"));
        assert!(validate_key("year-1"));
        assert!(!validate_key("Display Name"));
        assert!(!validate_key(""));
        assert!(!validate_key("UPPER"));
    }

    #[test]
    fn duplicate_aliases_are_rejected_case_insensitively() {
        let aliases = vec!["The Court".to_owned(), "the court".to_owned()];
        assert!(validate_aliases(&aliases).is_err());
    }

    #[test]
    fn session_device_labels_use_browser_and_platform_without_storing_raw_ip() {
        assert_eq!(
            device_label(Some(
                "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0"
            )),
            "Chrome on Windows"
        );
        assert_eq!(
            device_label(Some(
                "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Version/17 Safari/605.1"
            )),
            "Safari on iPad"
        );
        assert_eq!(device_label(None), "Unknown browser");
    }

    #[test]
    fn document_content_limits_are_checked_before_database_writes() {
        let long_name = "x".repeat(121);
        assert!(validate_card_content(&long_name, &[], &[], &[]).is_err());

        let duplicate = vec![
            CardPropertyInput::Text {
                id: "age".into(),
                label: "Age".into(),
                value: "24".into(),
            },
            CardPropertyInput::Text {
                id: "age".into(),
                label: "Age".into(),
                value: "25".into(),
            },
        ];
        assert!(validate_card_content("Ari", &[], &duplicate, &[]).is_err());
    }
}
